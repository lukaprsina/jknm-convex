import * as fs from "node:fs";
import * as path from "node:path";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { createServerFn } from "@tanstack/react-start";
import { api } from "convex/_generated/api";
import mime from "mime-types";
import { basename, extname, join } from "~/lib/browser-path";
import {
	get_media_entry,
	type MediaCacheEntry,
	normalize_legacy_media_key,
	put_media_entry,
	record_problem,
} from "~/lib/converter-db";
import { NEW_MEDIA_DIRECTORY, OLD_MEDIA_DIRECTORY } from "./index";

const convexQueryClient = new ConvexQueryClient(
	import.meta.env.VITE_CONVEX_URL,
);
const convex = convexQueryClient.convexClient;

/**
 * Server function to check if a file exists and get its size
 */
const check_file_server = createServerFn({ method: "POST" })
	.validator((data: { file_path: string }) => data)
	.handler(async ({ data }) => {
		try {
			const stats = await fs.promises.stat(data.file_path);
			return {
				success: true,
				exists: true,
				size_bytes: stats.size,
			};
		} catch (error) {
			return {
				success: true,
				exists: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

/**
 * Server function to handle file operations that need Node.js filesystem access
 */
const copy_file_server = createServerFn({ method: "POST" })
	.validator(
		(data: { source_path: string; target_path: string; target_dir: string }) =>
			data,
	)
	.handler(async ({ data }) => {
		try {
			// Ensure target directory exists
			await fs.promises.mkdir(data.target_dir, { recursive: true });

			// Check if source file exists and get its size
			let source_stats: fs.Stats;
			try {
				source_stats = await fs.promises.stat(data.source_path);
			} catch {
				throw new Error(`Source file does not exist: ${data.source_path}`);
			}

			// Check if target already exists to avoid unnecessary copy
			try {
				await fs.promises.access(data.target_path);
				console.log(`File already exists, skipping copy: ${data.target_path}`);
				const target_stats = await fs.promises.stat(data.target_path);
				return {
					success: true,
					message: "File already exists",
					size_bytes: target_stats.size,
				};
			} catch {
				// File doesn't exist, proceed with copy
			}

			// Copy the file
			await fs.promises.copyFile(data.source_path, data.target_path);

			return {
				success: true,
				message: "File copied successfully",
				size_bytes: source_stats.size,
			};
		} catch (error) {
			console.error("File copy error:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

/**
 * Determine media type based on content type
 */
function get_media_type(content_type: string): "image" | "document" {
	return content_type.startsWith("image/") ? "image" : "document";
}

export async function stage_media(
	img_url: string,
	legacy_id: number,
	order: number,
	article_id: string,
): Promise<string> {
	// Normalize the legacy media key
	let legacy_media_key: string;
	try {
		const url = new URL(img_url);
		legacy_media_key = normalize_legacy_media_key(url.pathname);
	} catch {
		// If it's not a URL, treat it as a path
		legacy_media_key = normalize_legacy_media_key(img_url);
		throw new Error(`Invalid URL in stage_media: ${img_url}`);
	}

	// Check if media is already cached
	const existing_media = await get_media_entry(legacy_media_key);
	if (existing_media) {
		return `${existing_media.base_url}/original${extname(existing_media.filename)}`;
	}

	try {
		// 1. Check if source file exists and get its size
		const source_path = join(OLD_MEDIA_DIRECTORY, legacy_media_key);
		const filename = basename(legacy_media_key);
		const content_type = mime.lookup(filename);
		if (!content_type) {
			throw new Error(`Could not determine content type for file: ${filename}`);
		}

		const media_type = get_media_type(content_type);

		const file_check = await check_file_server({
			data: { file_path: source_path },
		});

		if (!file_check.success || !file_check.exists) {
			throw new Error(
				`Source file does not exist: ${source_path} - ${file_check.error || "File not found"}`,
			);
		}

		const size_bytes = file_check.size_bytes;
		if (typeof size_bytes !== "number") {
			throw new Error("Failed to get file size");
		}

		// 2. Call the convex stage_legacy_media mutation
		const media = await convex.mutation(api.media.stage_legacy_media, {
			filename,
			content_type,
			size_bytes,
			legacy_key: legacy_media_key,
		});

		// 3. Copy file to NEW_MEDIA_DIRECTORY/<media_id>/original<ext>
		const ext = extname(filename);
		const target_dir = path.join(NEW_MEDIA_DIRECTORY, media._id);
		const target_path = path.join(target_dir, `original${ext}`);

		const copy_result = await copy_file_server({
			data: { source_path, target_path, target_dir },
		});

		if (!copy_result.success) {
			throw new Error(`Failed to copy file: ${copy_result.error}`);
		}

		// 4. Store in media cache
		const cache_entry: MediaCacheEntry = {
			legacy_media_key,
			media_id: media._id,
			type: media_type,
			filename,
			content_type,
			size_bytes,
			base_url: media.base_url,
		};

		await put_media_entry(cache_entry);

		// 5. Call link_media_to_article mutation if article_id is provided
		await convex.mutation(api.media.link_media_to_article, {
			article_id: article_id as Id<"articles">,
			media_id: media._id,
			order,
		});

		// Return the final URL
		return media.original.url;
	} catch (error) {
		console.error("Failed to stage media:", img_url, error);

		// Record the problem for debugging
		await record_problem(
			legacy_id,
			"missing_media",
			`Failed to stage media: ${img_url} - ${error instanceof Error ? error.message : String(error)}`,
			legacy_media_key,
		);

		// Re-throw the error to be handled by convert_article with proper placeholder
		throw error;
	}
}
