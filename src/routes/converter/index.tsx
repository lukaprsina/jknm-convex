import fs from "node:fs/promises";
import { useConvexMutation } from "@convex-dev/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { TElement } from "platejs";
import {
	Plate,
	type PlateEditor,
	useEditorMounted,
	useEditorRef,
	usePlateEditor,
} from "platejs/react";
import { createContext, use, useCallback, useEffect, useState } from "react";
import rfdc_factory from "rfdc";
import { EditorKit } from "~/components/editor-kit";
import { Editor, EditorContainer } from "~/components/plate-ui/editor";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import {
	type DatabaseSnapshot,
	exportDatabase,
	getAllLegacyArticles,
	getArticleMapping,
	getMediaEntry,
	importDatabase,
	initDatabase,
	loadLegacyArticles,
	type NewArticleCacheEntry,
	normalizeLegacyMediaKey,
	type ProblemEntry,
	putArticleMapping,
	putMediaEntry,
	recordProblem,
	wipeAllStores,
} from "~/lib/converter-db";
import type { Article } from "./-types";

const rfdc = rfdc_factory();

const CONTENT_FILE = "src/content/articles.json";
// const OLD_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/jknm-b2/jknm-novice";
// const NEW_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/converted-media";

export const Route = createFileRoute("/converter/")({
	component: RouteComponent,
});

const get_articles = createServerFn().handler(async () => {
	const file = await fs.readFile(CONTENT_FILE, "utf-8");
	const articles = JSON.parse(file) as Article[];
	return articles;
});

interface ConverterState {
	articles: Article[];
	currentIndex: number;
	articleMapping: NewArticleCacheEntry | null;
	problems: ProblemEntry[];
	isLoading: boolean;
	error: string | null;
	dbInitialized: boolean;
	convertedContent?: TElement[]; // PlateJS Value
	// valueString?: string; // For debugging
}

interface ConverterActions {
	setIndex: (index: number) => void;
	loadArticles: () => Promise<void>;
	reloadArticles: () => Promise<void>;
	acceptArticle: () => Promise<void>;
	wipeAll: () => Promise<void>;
	exportCaches: () => Promise<void>;
	importCaches: (file: File) => Promise<void>;
	setConvertedContent: (content: TElement[]) => void;
	// setValueString: (value: string) => void;
}

const EditorContext = createContext<
	| {
			state: ConverterState;
			actions: ConverterActions;
	  }
	| undefined
>(undefined);

function ArticlePlateEditor() {
	const editor = usePlateEditor({
		plugins: EditorKit,
	});
	const context = use(EditorContext);

	return (
		<>
			<Plate editor={editor}>
				<ConfiguredPlateEditor />
			</Plate>
			{/* <div className="flex w-full justify-center">
				<pre className="prose max-w-screen-md overflow-x-auto whitespace-pre-wrap break-words bg-gray-100 p-4">
					{context?.state.valueString}
				</pre>
			</div> */}
		</>
	);
}

function ConfiguredPlateEditor() {
	const editor = useEditorRef();
	const editor_context = use(EditorContext);
	const mounted = useEditorMounted();
	const [valueString, setValueString] = useState("");

	// Store the current converted content in context for Accept functionality
	/* useEffect(() => {
		if (editor_context && valueString) {
			// Parse the value string and store it
			try {
				const value = JSON.parse(valueString) as TElement[];
				editor_context.actions.setConvertedContent(value);
			} catch (error) {
				console.error("Failed to parse converted content:", error);
			}
		}
	}, [valueString, editor_context]); */

	useEffect(() => {
		if (!editor_context || !mounted) return;
		const article =
			editor_context.state.articles[editor_context.state.currentIndex];
		if (!article) return;

		console.log("Loading article", article.id, article.title);

		editor.tf.reset();

		// Load value asynchronously
		const loadValue = async () => {
			try {
				const value = await get_value_from_article(article, editor);
				editor.tf.setValue(value);
				const str = JSON.stringify(value, null, 2);
				setValueString(str);
			} catch (error) {
				console.error("Failed to convert article:", error);
				const errorValue = [
					{
						type: "p",
						children: [{ text: `Error converting article: ${error}` }],
					},
				];
				editor.tf.setValue(errorValue);
				setValueString(JSON.stringify(errorValue, null, 2));
			}
		};

		void loadValue();
	}, [editor_context, editor, mounted, setValueString]);

	return (
		<EditorContainer>
			<Editor spellCheck={false} variant="article" />
		</EditorContainer>
	);
}

async function get_value_from_article(
	article: Article,
	editor: PlateEditor,
): Promise<TElement[]> {
	const value: TElement[] = [];
	let mediaOrder = 0;

	for (const block of article.content.blocks) {
		if (block.type === "paragraph") {
			if (!block.data.text) throw new Error("Paragraph block missing text");

			const html = editor.api.html.deserialize({ element: block.data.text });
			const node: TElement = {
				type: "p",
				children: html,
			};

			value.push(node);
		} else if (block.type === "header") {
			if (!block.data.text) throw new Error("Header block missing text");
			const html = editor.api.html.deserialize({ element: block.data.text });
			const level = Number(block.data.level);
			if (level < 1 || level > 6)
				throw new Error("Header block with invalid level");
			const node: TElement = {
				type: `h${level}`,
				children: html,
			};
			value.push(node);
		} else if (block.type === "list") {
			if (block.data.style !== "unordered")
				throw new Error("Only unordered lists are supported");
			if (!block.data.items) throw new Error("List block missing items");
			const html_list = `<ul role="list" style="list-style-type:disc">${block.data.items.map((item) => `<li role="listitem" aria-level="1">${item}</li>`).join("")}</ul>`;
			const html = editor.api.html.deserialize({ element: html_list });
			for (const h of html) {
				h.listStyleType = "disc";
			}

			const node: TElement = {
				type: "ul",
				children: html,
			};

			value.push(node);
		} else if (block.type === "embed") {
			if (!block.data.source) throw new Error("Embed block missing source");
			if (block.data.service !== "youtube")
				throw new Error("Only youtube embeds are supported");
			const iframe_html = `<iframe src="${block.data.source}" frameborder="0" allowfullscreen style="width:100%;min-height:300px"></iframe>`;
			const html = editor.api.html.deserialize({ element: iframe_html });
			if (html.length !== 1)
				throw new Error("Embed deserialized to multiple nodes");

			value.push(html[0] as TElement);
		} else if (block.type === "image") {
			const img_url = block.data.file?.url;
			if (!img_url) throw new Error("Image block missing file url");

			try {
				// Stage the media and get the final URL
				const finalUrl = await stageMedia(img_url, article.id, mediaOrder++);

				const img_html = `<img src="${finalUrl}" />`;
				const html = editor.api.html.deserialize({ element: img_html });
				if (html.length !== 1)
					throw new Error("Figure deserialized to multiple nodes");
				const first_html = rfdc(html[0]);
				const caption = block.data.caption;
				if (caption) {
					const caption_html = editor.api.html.deserialize({
						element: caption,
					});
					if (caption_html.length !== 1)
						throw new Error("Caption deserialized to multiple nodes");
					Object.assign(first_html, { caption: caption_html });
				}

				value.push(first_html as TElement);
			} catch (error) {
				console.error("Failed to stage media:", img_url, error);
				await recordProblem(
					article.id,
					"missing_media",
					`Failed to stage media: ${img_url} - ${error}`,
					img_url,
				);
				// Add placeholder for missing media
				const placeholder_html = `<p>[Missing image: ${img_url}]</p>`;
				const html = editor.api.html.deserialize({ element: placeholder_html });
				value.push(html[0] as TElement);
			}
		}
	}

	return value;
}

async function stageMedia(
	imgUrl: string,
	legacyId: number,
	order: number,
): Promise<string> {
	// Normalize the legacy media key
	let legacyMediaKey: string;
	try {
		const url = new URL(imgUrl);
		legacyMediaKey = normalizeLegacyMediaKey(url.pathname);
	} catch {
		// If it's not a URL, treat it as a path
		legacyMediaKey = normalizeLegacyMediaKey(imgUrl);
	}

	// Check if media is already cached
	const existingMedia = await getMediaEntry(legacyMediaKey);
	if (existingMedia) {
		return `${existingMedia.base_url}/original${extname(existingMedia.filename)}`;
	}

	// TODO: This is where we would:
	// 1. Check if file exists in OLD_MEDIA_DIRECTORY + legacyMediaKey
	// 2. Call the convex stage_legacy_media mutation
	// 3. Copy file to NEW_MEDIA_DIRECTORY/<media_id>/original<ext>
	// 4. Store in media cache
	// 5. Call link_media_to_article mutation

	// For now, return a placeholder URL that follows the final pattern
	const mockMediaId = `media_${legacyId}_${order}`;
	const ext = extname(legacyMediaKey) || ".jpg";
	const finalUrl = `https://gradivo.jknm.site/${mockMediaId}/original${ext}`;

	// Cache this for consistency
	await putMediaEntry({
		legacy_media_key: legacyMediaKey,
		media_id: mockMediaId,
		type: "image",
		filename: basename(legacyMediaKey),
		content_type: "image/jpeg", // TODO: infer from extension
		base_url: `https://gradivo.jknm.site/${mockMediaId}`,
	});

	return finalUrl;
}

// Browser-safe path.extname and path.basename
function extname(filePath: string): string {
	const base = filePath.split(/[\\/]/).pop() || "";
	const idx = base.lastIndexOf(".");
	return idx > 0 ? base.slice(idx) : "";
}

function basename(filePath: string): string {
	return filePath.split(/[\\/]/).pop() || "";
}

function RouteComponent() {
	// Convex mutations
	const createDraftMutation = useConvexMutation(api.articles.create_draft);
	const publishDraftMutation = useConvexMutation(api.articles.publish_draft);
	const deleteEverythingMutation = useConvexMutation(
		api.articles.delete_everything,
	);

	// Component state
	const [state, setState] = useState<ConverterState>({
		articles: [],
		currentIndex: 0,
		articleMapping: null,
		problems: [],
		isLoading: false,
		error: null,
		dbInitialized: false,
	});

	const [indexInput, setIndexInput] = useState("0");

	// Initialize IndexedDB on component mount
	useEffect(() => {
		const initDB = async () => {
			try {
				await initDatabase();
				setState((prev) => ({ ...prev, dbInitialized: true }));
			} catch (error) {
				console.error("Failed to initialize database:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to initialize database: ${error}`,
				}));
			}
		};

		void initDB();
	}, []);

	// Update index input when currentIndex changes
	useEffect(() => {
		setIndexInput(String(state.currentIndex));
	}, [state.currentIndex]);

	// Load article mapping and ensure draft exists when index changes
	useEffect(() => {
		const loadMappingAndEnsureDraft = async () => {
			if (!state.dbInitialized || state.articles.length === 0) return;

			const article = state.articles[state.currentIndex];
			if (!article) return;

			try {
				let mapping = await getArticleMapping(article.id);

				// If no mapping exists, create a draft
				if (!mapping) {
					console.log("Creating draft for article:", article.title);
					const draftSlug = await createDraftMutation({});
					await putArticleMapping(article.id, draftSlug, "draft");
					mapping = {
						article_id: draftSlug,
						status: "draft" as const,
						legacy_id: article.id,
					};
				}

				setState((prev) => ({ ...prev, articleMapping: mapping }));
			} catch (error) {
				console.error("Failed to load/create article mapping:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to setup article: ${error}`,
				}));
			}
		};

		void loadMappingAndEnsureDraft();
	}, [
		state.currentIndex,
		state.articles,
		state.dbInitialized,
		createDraftMutation,
	]);

	// Action handlers
	const actions = {
		setIndex: useCallback(
			(index: number) => {
				const clampedIndex = Math.max(
					0,
					Math.min(index, state.articles.length - 1),
				);
				setState((prev) => ({ ...prev, currentIndex: clampedIndex }));
			},
			[state.articles.length],
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
		}, []),

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
		}, []),

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
					const draftSlug = await createDraftMutation({});
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
			createDraftMutation,
			publishDraftMutation,
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
		}, [deleteEverythingMutation]),

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
		}, []),

		importCaches: useCallback(async (file: File) => {
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
		}, []),

		setConvertedContent: useCallback((content: TElement[]) => {
			setState((prev) => ({ ...prev, convertedContent: content }));
		}, []),
	};

	const context = { state, actions };

	if (!state.dbInitialized) {
		return <div className="p-4">Initializing database...</div>;
	}

	return (
		<EditorContext value={context}>
			<div className="space-y-4 p-4">
				{/* Status Display */}
				<Card>
					<CardHeader>
						<CardTitle>Converter Status</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex items-center gap-4">
							<span>Total Articles: {state.articles.length}</span>
							<span>Current Index: {state.currentIndex}</span>
							{state.articleMapping && (
								<span
									className={`rounded px-2 py-1 text-sm ${
										state.articleMapping.status === "published"
											? "bg-green-100 text-green-800"
											: "bg-yellow-100 text-yellow-800"
									}`}
								>
									{state.articleMapping.status}
								</span>
							)}
						</div>
						{state.error && (
							<div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
								{state.error}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Control Buttons */}
				<div className="flex flex-wrap gap-2">
					<Button
						onClick={actions.loadArticles}
						disabled={state.isLoading}
						variant="default"
					>
						{state.articles.length > 0 ? "Reload" : "Load"} Articles
					</Button>
					<Button
						onClick={actions.reloadArticles}
						disabled={state.isLoading || state.articles.length === 0}
						variant="outline"
					>
						Reload From Disk
					</Button>
					<Button
						onClick={() => actions.setIndex(state.currentIndex - 1)}
						disabled={state.currentIndex <= 0 || state.articles.length === 0}
						variant="outline"
					>
						Previous
					</Button>
					<Button
						onClick={() => actions.setIndex(state.currentIndex + 1)}
						disabled={
							state.currentIndex >= state.articles.length - 1 ||
							state.articles.length === 0
						}
						variant="outline"
					>
						Next
					</Button>
					<Button
						onClick={actions.acceptArticle}
						disabled={
							state.isLoading ||
							state.articles.length === 0 ||
							state.articleMapping?.status === "published"
						}
						variant="default"
						className="bg-green-600 hover:bg-green-700"
					>
						Accept Article
					</Button>
					<Separator orientation="vertical" className="h-8" />
					<Button
						onClick={actions.wipeAll}
						disabled={state.isLoading}
						variant="destructive"
					>
						Wipe All
					</Button>
					<Button
						onClick={actions.exportCaches}
						disabled={state.isLoading}
						variant="outline"
					>
						Export Caches
					</Button>
					<Button
						onClick={() => document.getElementById("import-file")?.click()}
						disabled={state.isLoading}
						variant="outline"
					>
						Import Caches
					</Button>
					<input
						id="import-file"
						type="file"
						accept=".json"
						style={{ display: "none" }}
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								actions.importCaches(file);
							}
						}}
					/>
				</div>

				{/* Navigation */}
				<div className="flex items-center gap-2">
					<span>Article Index:</span>
					<Input
						type="number"
						value={indexInput}
						onChange={(e) => setIndexInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								actions.setIndex(Number(indexInput));
							}
						}}
						className="w-20"
						min={0}
						max={state.articles.length - 1}
					/>
					<span>of {state.articles.length - 1}</span>
				</div>

				{/* Editor */}
				{state.articles.length > 0 && <ArticlePlateEditor />}
			</div>
		</EditorContext>
	);
}
