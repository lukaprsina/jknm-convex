import { useConvexMutation } from "@convex-dev/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import type { TElement } from "platejs";
import {
	Plate,
	useEditorMounted,
	useEditorRef,
	usePlateEditor,
} from "platejs/react";
import { createContext, use, useEffect, useState } from "react";
import { EditorKit } from "~/components/editor-kit";
import { Editor, EditorContainer } from "~/components/plate-ui/editor";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import {
	getArticleMapping,
	initDatabase,
	type NewArticleCacheEntry,
	type ProblemEntry,
	putArticleMapping,
} from "~/lib/converter-db";
import { convert_article } from "./-convert-article";
import type { Article } from "./-types";
import { useActions } from "./-use-actions";

// const OLD_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/jknm-b2/jknm-novice";
// const NEW_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/converted-media";

export const Route = createFileRoute("/converter/")({
	component: RouteComponent,
});

export interface ConverterState {
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
	// const [valueString, setValueString] = useState("");

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
				const value = await convert_article(article, editor);
				editor.tf.setValue(value);
				/* const str = JSON.stringify(value, null, 2);
				setValueString(str); */
			} catch (error) {
				console.error("Failed to convert article:", error);
				const errorValue = [
					{
						type: "p",
						children: [{ text: `Error converting article: ${error}` }],
					},
				];
				editor.tf.setValue(errorValue);
				// setValueString(JSON.stringify(errorValue, null, 2));
			}
		};

		void loadValue();
	}, [editor_context, editor, mounted]);

	return (
		<EditorContainer>
			<Editor spellCheck={false} variant="article" />
		</EditorContainer>
	);
}

function RouteComponent() {
	// Convex mutations
	const create_draft_mutation = useConvexMutation(api.articles.create_draft);

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
					const draftSlug = await create_draft_mutation({});
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
		create_draft_mutation,
	]);

	// Action handlers
	const actions = useActions(state, setState);

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
