import * as fs from "node:fs";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { createServerFn } from "@tanstack/react-start";
import { api } from "convex/_generated/api";
import mime from "mime/lite";
import { basename_b, extname_b, join_b } from "~/lib/browser-path";
import {
	get_media_entry,
	type MediaCacheEntry,
	normalize_legacy_media_key,
	put_media_entry,
	record_problem,
} from "~/lib/converter/converter-db";
import {
	NEW_MEDIA_DIRECTORY,
	OLD_MEDIA_DIRECTORY,
} from "~/routes/converter/index";

const convexQueryClient = new ConvexQueryClient(
	import.meta.env.VITE_CONVEX_URL,
);
const convex = convexQueryClient.convexClient;

/**
 * Server function to check if a file exists and get its size
 */
const check_file_server = createServerFn({ method: "POST" })
	.inputValidator((data: { file_path: string }) => data)
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
	.inputValidator(
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
				console.error(
					`File already exists, skipping copy: ${data.target_path}`,
				);
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
	media_url: string,
	legacy_id: number,
	convex_article_id: string,
): Promise<string> {
	// Normalize the legacy media key
	let legacy_media_key: string;
	try {
		const url = new URL(media_url);
		legacy_media_key = normalize_legacy_media_key(url.pathname);
	} catch {
		throw new Error(`Invalid URL in stage_media: ${media_url}`);
	}

	try {
		const source_path = join_b(OLD_MEDIA_DIRECTORY, legacy_media_key);
		const filename = basename_b(legacy_media_key);
		const original_url = create_media_url(
			legacy_media_key,
			source_path,
			filename,
			convex_article_id,
		);

		return original_url;
	} catch (error) {
		// console.error("Failed to stage media:", media_url, error);

		// Record the problem for debugging
		await record_problem(
			legacy_id,
			"missing_media",
			`Failed to stage media: ${media_url} - ${error instanceof Error ? error.message : String(error)}`,
			legacy_media_key,
		);

		// Re-throw the error to be handled by convert_article with proper placeholder
		throw error;
	}
}

export async function stage_document_media(
	legacy_id: number,
	convex_article_id: string,
	source_path: string,
	filename: string,
): Promise<string> {
	try {
		const original_url = await create_media_url(
			filename,
			source_path,
			filename,
			convex_article_id,
		);

		return original_url;
	} catch (error) {
		console.error("Failed to stage document media:", filename, error);

		// Record the problem for debugging
		await record_problem(
			legacy_id,
			"missing_document",
			`Failed to stage document media: ${filename} - ${error instanceof Error ? error.message : String(error)}`,
			filename,
		);

		// Re-throw the error to be handled by convert_article with proper placeholder
		throw error;
	}
}

async function create_media_url(
	legacy_media_key: string,
	source_path: string,
	filename: string,
	convex_article_id: string,
) {
	// 0: Check if media is already cached
	const existing_media = await get_media_entry(legacy_media_key);
	if (existing_media) {
		// Media already staged, just link it to the article
		await convex.mutation(api.media.link_media_to_article, {
			article_id: convex_article_id as Id<"articles">,
			media_id: existing_media.media_id as Id<"media">,
		});
		return `${existing_media.base_url}/original${extname_b(existing_media.filename)}`;
	}

	// 1. Check if source file exists and get its size
	const content_type = mime.getType(filename);
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
	});

	// 3. Copy file to NEW_MEDIA_DIRECTORY/<media_id><ext>
	const ext = extname_b(filename);
	const target_dir = join_b(NEW_MEDIA_DIRECTORY, media._id);
	const target_path = join_b(target_dir, `original${ext}`);

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
		article_id: convex_article_id as Id<"articles">,
		media_id: media._id,
	});

	// Return the final URL
	return media.original.url;
}
