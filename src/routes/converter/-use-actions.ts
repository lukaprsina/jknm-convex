import fs from "node:fs/promises";
import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Id } from "convex/_generated/dataModel";
import type { TElement } from "platejs";
import { useCallback } from "react";
import {
	type DatabaseSnapshot,
	export_database,
	get_all_legacy_articles,
	get_article_mapping,
	import_database,
	load_legacy_articles,
	put_article_mapping,
	wipe_all_stores,
} from "~/lib/converter-db";
import type { ConverterState } from ".";
import type { Article } from "./-types";

const CONTENT_FILE = "src/content/articles.json";

const get_articles = createServerFn().handler(async () => {
	const file = await fs.readFile(CONTENT_FILE, "utf-8");
	const articles = JSON.parse(file) as Article[];
	return articles;
});

export function useActions(
	state: ConverterState,
	setState: React.Dispatch<React.SetStateAction<ConverterState>>,
) {
	const create_draft_mutation = useConvexMutation(api.articles.create_draft);
	const publish_draft_mutation = useConvexMutation(api.articles.publish_draft);
	const delete_everything_mutation = useConvexMutation(
		api.articles.delete_everything,
	);

	const actions = {
		set_index: useCallback(
			(index: number) => {
				const clamped_index = Math.max(
					0,
					Math.min(index, state.articles.length - 1),
				);
				setState((prev) => ({ ...prev, currentIndex: clamped_index }));
			},
			[state.articles.length, setState],
		),

		load_articles: useCallback(async () => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			try {
				const articles = await get_articles();
				await load_legacy_articles(articles);
				setState((prev) => ({ ...prev, articles, isLoading: false }));
				console.log("Loaded articles into IndexedDB:", articles.length);
			} catch (error) {
				console.error("Failed to load articles:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to load articles: ${error}`,
					isLoading: false,
				}));
			}
		}, [setState]),

		reload_articles: useCallback(async () => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			try {
				const articles = await get_articles();
				await load_legacy_articles(articles); // This will clear and reload
				setState((prev) => ({
					...prev,
					articles,
					currentIndex: 0,
					isLoading: false,
				}));
				console.log("Reloaded articles from disk:", articles.length);
			} catch (error) {
				console.error("Failed to reload articles:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to reload articles: ${error}`,
					isLoading: false,
				}));
			}
		}, [setState]),

		accept_article: useCallback(async () => {
			if (state.articles.length === 0) return;

			const article = state.articles[state.current_index];
			if (!article) return;

			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				let article_id: string;

				// Check if draft already exists
				if (state.article_mapping?.article_id) {
					article_id = state.article_mapping.article_id;
				} else {
					// Create new draft
					const draft_slug = await create_draft_mutation({});
					article_id = draft_slug; // The mutation returns the slug which is the ID

					// Store mapping
					await put_article_mapping(article.id, article_id, "draft");
				}

				// Use the converted content from editor or fallback to basic content
				let content_json: string;
				if (state.converted_content) {
					content_json = JSON.stringify(state.converted_content);
				} else {
					// Fallback to basic content
					content_json = JSON.stringify([
						{
							type: "h1",
							children: [{ text: article.title }],
						},
						{
							type: "p",
							children: [
								{
									text: "Converted from legacy article (no content loaded)...",
								},
							],
						},
					]);
				}

				// Publish the draft
				await publish_draft_mutation({
					article_id: article_id as Id<"articles">,
					content_json: content_json,
					thumbnail: {
						image_id: "" as Id<"media">,
						x: 0,
						y: 0,
						width: 100,
						height: 100,
					}, // TODO: Handle thumbnail properly
					author_ids: [], // TODO: Map legacy authors
					published_at: new Date(article.created_at).getTime(),
				});

				// Update mapping to published
				await put_article_mapping(
					article.id,
					article_id,
					"published",
					new Date(article.created_at).getTime(),
				);

				// Refresh mapping
				const mapping = await get_article_mapping(article.id);
				setState((prev) => ({
					...prev,
					article_mapping: mapping,
					isLoading: false,
				}));

				console.log("Successfully published article:", article.title);
			} catch (error) {
				console.error("Failed to accept article:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to accept article: ${error}`,
					isLoading: false,
				}));
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

			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				// Clear Convex database
				await delete_everything_mutation({});

				// Clear IndexedDB
				await wipe_all_stores();

				// Reset state
				setState((prev) => ({
					...prev,
					articles: [],
					currentIndex: 0,
					article_mapping: null,
					problems: [],
					isLoading: false,
				}));

				console.log("Successfully wiped all data");
			} catch (error) {
				console.error("Failed to wipe data:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to wipe data: ${error}`,
					isLoading: false,
				}));
			}
		}, [delete_everything_mutation, setState]),

		export_caches: useCallback(async () => {
			try {
				const snapshot = await export_database();
				const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
					type: "application/json",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `converter-cache-${new Date().toISOString().split("T")[0]}.json`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				console.log("Cache exported successfully");
			} catch (error) {
				console.error("Failed to export cache:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to export cache: ${error}`,
				}));
			}
		}, [setState]),

		import_caches: useCallback(
			async (file: File) => {
				setState((prev) => ({ ...prev, isLoading: true, error: null }));

				try {
					const text = await file.text();
					const snapshot = JSON.parse(text) as DatabaseSnapshot;
					await import_database(snapshot);

					// Reload articles from imported data
					const articles = await get_all_legacy_articles();
					setState((prev) => ({
						...prev,
						articles,
						currentIndex: 0,
						isLoading: false,
					}));

					console.log(
						"Cache imported successfully, loaded",
						articles.length,
						"articles",
					);
				} catch (error) {
					console.error("Failed to import cache:", error);
					setState((prev) => ({
						...prev,
						error: `Failed to import cache: ${error}`,
						isLoading: false,
					}));
				}
			},
			[setState],
		),

		set_converted_content: useCallback(
			(content: TElement[]) => {
				setState((prev) => ({ ...prev, converted_content: content }));
			},
			[setState],
		),
	};

	return actions;
}
