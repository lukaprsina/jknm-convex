import fs from "node:fs/promises";
import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Id } from "convex/_generated/dataModel";
import type { TElement } from "platejs";
import { useCallback } from "react";
import type {
	MediaCacheEntry,
	NewArticleCacheEntry,
	ProblemEntry,
} from "~/lib/converter/converter-db";
import {
	get_all_article_mappings,
	get_all_legacy_articles,
	get_all_media_entries,
	get_all_problems,
	get_article_mapping,
	load_legacy_articles,
	put_article_mapping,
	put_media_entry,
	record_problem,
	wipe_all_stores,
} from "~/lib/converter/converter-db";
import type { ConverterState } from "../../routes/converter";
import type { Article } from "./types";

const CONTENT_FILE = "src/content/articles.json";

const get_articles = createServerFn().handler(async () => {
	const file = await fs.readFile(CONTENT_FILE, "utf-8");
	const articles = JSON.parse(file) as Article[];
	return articles;
});

function deep_clone<T>(value: T): T {
	if (typeof globalThis.structuredClone === "function") {
		return globalThis.structuredClone(value) as T;
	}
	return JSON.parse(JSON.stringify(value)) as T;
}

export function useActions(
	state: ConverterState,
	setState: React.Dispatch<React.SetStateAction<ConverterState>>,
) {
	const create_draft_mutation = useConvexMutation(api.articles.create_draft);
	const publish_draft_mutation = useConvexMutation(api.articles.publish_draft);
	const delete_everything_mutation = useConvexMutation(
		api.delete_everything.delete_everything,
	);

	const actions = {
		set_index: useCallback(
			(index: number) => {
				const clamped_index = Math.max(
					0,
					Math.min(index, state.articles.length - 1),
				);
				setState(
					(prev) =>
						({
							...prev,
							current_index: clamped_index,
						}) satisfies ConverterState,
				);
			},
			[state.articles.length, setState],
		),

		load_articles: useCallback(async () => {
			setState(
				(prev) =>
					({ ...prev, is_loading: true, error: null }) satisfies ConverterState,
			);
			try {
				const articles = await get_articles();
				await load_legacy_articles(articles);
				setState(
					(prev) =>
						({ ...prev, articles, is_loading: false }) satisfies ConverterState,
				);
				console.log("Loaded articles into IndexedDB:", articles.length);
			} catch (error) {
				console.error("Failed to load articles:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to load articles: ${error}`,
							is_loading: false,
						}) satisfies ConverterState,
				);
			}
		}, [setState]),

		reload_articles: useCallback(async () => {
			setState(
				(prev) =>
					({ ...prev, is_loading: true, error: null }) satisfies ConverterState,
			);

			try {
				const articles = await get_articles();
				await load_legacy_articles(articles); // This will clear and reload
				setState(
					(prev) =>
						({
							...prev,
							articles,
							current_index: 0,
							is_loading: false,
						}) satisfies ConverterState,
				);
				console.log("Reloaded articles from disk:", articles.length);
			} catch (error) {
				console.error("Failed to reload articles:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to reload articles: ${error}`,
							is_loading: false,
						}) satisfies ConverterState,
				);
			}
		}, [setState]),

		accept_article: useCallback(async () => {
			if (state.articles.length === 0) return;

			const article = state.articles[state.current_index];
			if (!article) return;

			setState(
				(prev) =>
					({ ...prev, is_loading: true, error: null }) satisfies ConverterState,
			);

			try {
				let article_id: string;

				// Check if draft already exists
				if (state.article_mapping?.article_id) {
					article_id = state.article_mapping.article_id;
				} else {
					// Create new draft
					const { id } = await create_draft_mutation({});
					article_id = id;

					// Store mapping
					await put_article_mapping(article.old_id, id, "draft");
				}

				// Use the converted content from editor or fallback to basic content
				if (!state.converted_content) {
					throw new Error("No converted content available");
				}

				const content_for_publish = deep_clone(state.converted_content);
				const content_json = JSON.stringify(content_for_publish);
				const date = new Date(article.created_at).getTime();

				// Publish the draft
				await publish_draft_mutation({
					article_id: article_id as Id<"articles">,
					content_json: content_json,
					thumbnail: undefined, // TODO: Handle thumbnail properly
					author_ids: [], // TODO: Map legacy authors
					published_at: date,
				});

				// Update mapping to published
				await put_article_mapping(
					article.old_id,
					article_id,
					"published",
					date,
				);

				// Refresh mapping
				const mapping = await get_article_mapping(article.old_id);
				setState(
					(prev) =>
						({
							...prev,
							article_mapping: mapping,
							is_loading: false,
						}) satisfies ConverterState,
				);

				// console.log("Successfully published article:", article.title);
			} catch (error) {
				console.error("Failed to accept article:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to accept article: ${error}`,
							is_loading: false,
						}) satisfies ConverterState,
				);
			}
		}, [
			state.current_index,
			state.articles,
			state.article_mapping,
			state.converted_content,
			create_draft_mutation,
			publish_draft_mutation,
			setState,
		]),

		wipe_all: useCallback(async () => {
			if (
				!confirm(
					"Are you sure you want to wipe all data? This cannot be undone.",
				)
			) {
				return;
			}

			setState(
				(prev) =>
					({ ...prev, is_loading: true, error: null }) satisfies ConverterState,
			);

			try {
				// Clear Convex database
				await delete_everything_mutation({});

				// Clear IndexedDB
				await wipe_all_stores();

				// Reset state
				setState(
					(prev) =>
						({
							...prev,
							articles: [],
							current_index: 0,
							article_mapping: null,
							problems: [],
							is_loading: false,
						}) satisfies ConverterState,
				);

				console.log("Successfully wiped all data");
			} catch (error) {
				console.error("Failed to wipe data:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to wipe data: ${error}`,
							is_loading: false,
						}) satisfies ConverterState,
				);
			}
		}, [delete_everything_mutation, setState]),

		export_caches: useCallback(async () => {
			setState(
				(prev) =>
					({ ...prev, is_loading: true, error: null }) satisfies ConverterState,
			);

			try {
				// Gather all data from IndexedDB
				const [legacy_articles, article_mappings, media_entries, problems] =
					await Promise.all([
						get_all_legacy_articles(),
						get_all_article_mappings(),
						get_all_media_entries(),
						get_all_problems(),
					]);

				// Send data to API endpoint
				const response = await fetch("/api/converter", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						legacy_articles,
						article_mappings,
						media_entries,
						problems,
					}),
				});

				const result = (await response.json()) as {
					success: boolean;
					message?: string;
					error?: string;
				};

				if (!response.ok || !result.success) {
					throw new Error(result.error || "Export failed");
				}

				console.log("Cache exported successfully:", result.message);
				setState(
					(prev) =>
						({
							...prev,
							is_loading: false,
						}) satisfies ConverterState,
				);
			} catch (error) {
				console.error("Failed to export cache:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to export cache: ${error}`,
							is_loading: false,
						}) satisfies ConverterState,
				);
			}
		}, [setState]),

		import_caches: useCallback(async () => {
			setState(
				(prev) =>
					({
						...prev,
						is_loading: true,
						error: null,
					}) satisfies ConverterState,
			);

			try {
				// Fetch data from API endpoint
				const response = await fetch("/api/converter", {
					method: "GET",
				});

				const result = (await response.json()) as {
					success: boolean;
					message?: string;
					error?: string;
					data?: {
						legacy_articles: Article[];
						article_mappings: NewArticleCacheEntry[];
						media_entries: MediaCacheEntry[];
						problems: ProblemEntry[];
					};
				};

				if (!response.ok || !result.success) {
					throw new Error(result.error || "Import failed");
				}

				// Write imported data to IndexedDB
				const { data } = result;
				if (data) {
					// Load legacy articles
					await load_legacy_articles(data.legacy_articles);

					// Load article mappings
					for (const mapping of data.article_mappings) {
						await put_article_mapping(
							mapping.legacy_id,
							mapping.article_id,
							mapping.status,
							mapping.published_at,
						);
					}

					// Load media entries
					for (const entry of data.media_entries) {
						await put_media_entry(entry);
					}

					// Load problems
					for (const problem of data.problems) {
						await record_problem(
							problem.legacy_id,
							problem.kind,
							problem.detail,
							problem.media_key,
						);
					}
				}

				// Update state with imported articles
				setState(
					(prev) =>
						({
							...prev,
							articles: data?.legacy_articles || [],
							current_index: 0,
							is_loading: false,
						}) satisfies ConverterState,
				);

				console.log("Cache imported successfully:", result.message);
			} catch (error) {
				console.error("Failed to import cache:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to import cache: ${error}`,
							is_loading: false,
						}) satisfies ConverterState,
				);
			}
		}, [setState]),

		set_converted_content: useCallback(
			(content: TElement[]) => {
				const cloned = deep_clone(content);
				setState(
					(prev) =>
						({ ...prev, converted_content: cloned }) satisfies ConverterState,
				);
			},
			[setState],
		),

		// Auto-accept functionality
		start_auto_accept: useCallback(() => {
			setState(
				(prev) =>
					({
						...prev,
						is_auto_accepting: true,
						auto_accept_progress: {
							total: prev.articles.length,
							processed: 0,
							successes: 0,
							errors: 0,
						},
						auto_accept_errors: [],
						error: null,
					}) satisfies ConverterState,
			);
		}, [setState]),

		stop_auto_accept: useCallback(() => {
			setState(
				(prev) =>
					({
						...prev,
						is_auto_accepting: false,
					}) satisfies ConverterState,
			);
		}, [setState]),

		reset_auto_accept: useCallback(() => {
			setState(
				(prev) =>
					({
						...prev,
						is_auto_accepting: false,
						auto_accept_progress: {
							total: 0,
							processed: 0,
							successes: 0,
							errors: 0,
						},
						auto_accept_errors: [],
					}) satisfies ConverterState,
			);
		}, [setState]),
	};

	return actions;
}
