import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import type { Article } from "~/lib/converter/types";
import type {
	MediaCacheEntry,
	NewArticleCacheEntry,
	ProblemEntry,
} from "~/lib/converter-db";

/**
 * Get the converter directory path
 */
function get_converter_dir(): string {
	return path.join(process.cwd(), "converter");
}

/**
 * Ensure converter directory exists
 */
async function ensure_converter_dir(): Promise<string> {
	const dir = get_converter_dir();
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
	}
	return dir;
}

/**
 * Server function to export all caches to individual JSON files
 */
export const export_caches_server = createServerFn()
	.validator(
		(data: {
			legacy_articles: Article[];
			article_mappings: NewArticleCacheEntry[];
			media_entries: MediaCacheEntry[];
			problems: ProblemEntry[];
		}) => data,
	)
	.handler(async ({ data }) => {
		try {
			const converter_dir = await ensure_converter_dir();

			// Export legacy articles
			const legacy_path = path.join(converter_dir, "legacy_articles.json");
			await fs.writeFile(
				legacy_path,
				JSON.stringify(data.legacy_articles, null, 2),
				"utf-8",
			);

			// Export article mappings
			const mappings_path = path.join(converter_dir, "new_articles_cache.json");
			await fs.writeFile(
				mappings_path,
				JSON.stringify(data.article_mappings, null, 2),
				"utf-8",
			);

			// Export media cache
			const media_path = path.join(converter_dir, "media_cache.json");
			await fs.writeFile(
				media_path,
				JSON.stringify(data.media_entries, null, 2),
				"utf-8",
			);

			// Export problems
			const problems_path = path.join(converter_dir, "problems.json");
			await fs.writeFile(
				problems_path,
				JSON.stringify(data.problems, null, 2),
				"utf-8",
			);

			return {
				success: true,
				message: `Exported 4 cache files to ${converter_dir}`,
				files: [
					"legacy_articles.json",
					"new_articles_cache.json",
					"media_cache.json",
					"problems.json",
				],
			};
		} catch (error) {
			console.error("Export caches error:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

/**
 * Server function to import all caches from individual JSON files
 */
export const import_caches_server = createServerFn()
	.validator(() => ({}))
	.handler(async () => {
		try {
			const converter_dir = get_converter_dir();

			// Check if converter directory exists
			try {
				await fs.access(converter_dir);
			} catch {
				throw new Error(`Converter directory does not exist: ${converter_dir}`);
			}

			// Import legacy articles
			const legacy_path = path.join(converter_dir, "legacy_articles.json");
			let legacy_articles: Article[] = [];
			try {
				const legacy_content = await fs.readFile(legacy_path, "utf-8");
				legacy_articles = JSON.parse(legacy_content) as Article[];
			} catch (error) {
				console.warn("Failed to import legacy_articles.json:", error);
			}

			// Import article mappings
			const mappings_path = path.join(converter_dir, "new_articles_cache.json");
			let article_mappings: NewArticleCacheEntry[] = [];
			try {
				const mappings_content = await fs.readFile(mappings_path, "utf-8");
				article_mappings = JSON.parse(
					mappings_content,
				) as NewArticleCacheEntry[];
			} catch (error) {
				console.warn("Failed to import new_articles_cache.json:", error);
			}

			// Import media cache
			const media_path = path.join(converter_dir, "media_cache.json");
			let media_entries: MediaCacheEntry[] = [];
			try {
				const media_content = await fs.readFile(media_path, "utf-8");
				media_entries = JSON.parse(media_content) as MediaCacheEntry[];
			} catch (error) {
				console.warn("Failed to import media_cache.json:", error);
			}

			// Import problems
			const problems_path = path.join(converter_dir, "problems.json");
			let problems: ProblemEntry[] = [];
			try {
				const problems_content = await fs.readFile(problems_path, "utf-8");
				problems = JSON.parse(problems_content) as ProblemEntry[];
			} catch (error) {
				console.warn("Failed to import problems.json:", error);
			}

			return {
				success: true,
				message: `Imported caches from ${converter_dir}`,
				data: {
					legacy_articles,
					article_mappings,
					media_entries,
					problems,
				},
			};
		} catch (error) {
			console.error("Import caches error:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

/**
 * Server function to check if cache files exist
 */
export const check_cache_files_server = createServerFn().handler(async () => {
	try {
		const converter_dir = get_converter_dir();

		const cache_files = [
			"legacy_articles.json",
			"new_articles_cache.json",
			"media_cache.json",
			"problems.json",
		];

		const results: Record<string, boolean> = {};

		for (const file of cache_files) {
			const file_path = path.join(converter_dir, file);
			try {
				await fs.access(file_path);
				results[file] = true;
			} catch {
				results[file] = false;
			}
		}

		return {
			success: true,
			files_exist: results,
		};
	} catch (error) {
		console.error("Check cache files error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});
