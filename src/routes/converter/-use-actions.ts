import fs from "node:fs/promises";
import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Id } from "convex/_generated/dataModel";
import type { TElement } from "platejs";
import { useCallback } from "react";
import {
	type DatabaseSnapshot,
	exportDatabase,
	getAllLegacyArticles,
	getArticleMapping,
	importDatabase,
	loadLegacyArticles,
	putArticleMapping,
	wipeAllStores,
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
	const publishDraftMutation = useConvexMutation(api.articles.publish_draft);
	const deleteEverythingMutation = useConvexMutation(
		api.articles.delete_everything,
	);

	const actions = {
		setIndex: useCallback(
			(index: number) => {
				const clampedIndex = Math.max(
					0,
					Math.min(index, state.articles.length - 1),
				);
				setState((prev) => ({ ...prev, currentIndex: clampedIndex }));
			},
			[state.articles.length, setState],
		),

		loadArticles: useCallback(async () => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			try {
				const articles = await get_articles();
				await loadLegacyArticles(articles);
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

		reloadArticles: useCallback(async () => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			try {
				const articles = await get_articles();
				await loadLegacyArticles(articles); // This will clear and reload
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

		acceptArticle: useCallback(async () => {
			if (state.articles.length === 0) return;

			const article = state.articles[state.currentIndex];
			if (!article) return;

			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				let articleId: string;

				// Check if draft already exists
				if (state.articleMapping?.article_id) {
					articleId = state.articleMapping.article_id;
				} else {
					// Create new draft
					const draftSlug = await create_draft_mutation({});
					articleId = draftSlug; // The mutation returns the slug which is the ID

					// Store mapping
					await putArticleMapping(article.id, articleId, "draft");
				}

				// Use the converted content from editor or fallback to basic content
				let contentJson: string;
				if (state.convertedContent) {
					contentJson = JSON.stringify(state.convertedContent);
				} else {
					// Fallback to basic content
					contentJson = JSON.stringify([
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
				await publishDraftMutation({
					article_id: articleId as Id<"articles">,
					content_json: contentJson,
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
				await putArticleMapping(
					article.id,
					articleId,
					"published",
					new Date(article.created_at).getTime(),
				);

				// Refresh mapping
				const mapping = await getArticleMapping(article.id);
				setState((prev) => ({
					...prev,
					articleMapping: mapping,
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
			state.currentIndex,
			state.articles,
			state.articleMapping,
			state.convertedContent,
			create_draft_mutation,
			publishDraftMutation,
			setState,
		]),

		wipeAll: useCallback(async () => {
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
				await deleteEverythingMutation({});

				// Clear IndexedDB
				await wipeAllStores();

				// Reset state
				setState((prev) => ({
					...prev,
					articles: [],
					currentIndex: 0,
					articleMapping: null,
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
		}, [deleteEverythingMutation, setState]),

		exportCaches: useCallback(async () => {
			try {
				const snapshot = await exportDatabase();
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

		importCaches: useCallback(
			async (file: File) => {
				setState((prev) => ({ ...prev, isLoading: true, error: null }));

				try {
					const text = await file.text();
					const snapshot = JSON.parse(text) as DatabaseSnapshot;
					await importDatabase(snapshot);

					// Reload articles from imported data
					const articles = await getAllLegacyArticles();
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

		setConvertedContent: useCallback(
			(content: TElement[]) => {
				setState((prev) => ({ ...prev, convertedContent: content }));
			},
			[setState],
		),
	};

	return actions;
}
