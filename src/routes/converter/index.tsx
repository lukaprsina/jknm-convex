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
	get_article_mapping,
	init_database,
	type NewArticleCacheEntry,
	type ProblemEntry,
	put_article_mapping,
} from "~/lib/converter-db";
import { convert_article } from "./-convert-article";
import type { Article } from "./-types";
import { useActions } from "./-use-actions";

export const OLD_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/jknm-b2/jknm-novice";
export const NEW_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/converted-media";

export const Route = createFileRoute("/converter/")({
	component: RouteComponent,
});

export interface ConverterState {
	articles: Article[];
	current_index: number;
	article_mapping: NewArticleCacheEntry | null;
	problems: ProblemEntry[];
	is_loading: boolean;
	error: string | null;
	db_initialized: boolean;
	converted_content?: TElement[]; // PlateJS Value
	// value_string?: string; // For debugging
}

interface ConverterActions {
	set_index: (index: number) => void;
	load_articles: () => Promise<void>;
	reload_articles: () => Promise<void>;
	accept_article: () => Promise<void>;
	wipe_all: () => Promise<void>;
	export_caches: () => Promise<void>;
	import_caches: (file: File) => Promise<void>;
	set_converted_content: (content: TElement[]) => void;
	// set_value_string: (value: string) => void;
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
					{context?.state.value_string}
				</pre>
			</div> */}
		</>
	);
}

function ConfiguredPlateEditor() {
	const editor = useEditorRef();
	const editor_context = use(EditorContext);
	const mounted = useEditorMounted();
	// const [value_string, set_value_string] = useState("");

	// Store the current converted content in context for Accept functionality
	/* useEffect(() => {
		if (editor_context && value_string) {
			// Parse the value string and store it
			try {
				const value = JSON.parse(value_string) as TElement[];
				editor_context.actions.set_converted_content(value);
			} catch (error) {
				console.error("Failed to parse converted content:", error);
			}
		}
	}, [value_string, editor_context]); */

	useEffect(() => {
		if (!editor_context || !mounted) return;
		const article =
			editor_context.state.articles[editor_context.state.current_index];
		if (!article) return;

		console.log("Loading article", article.id, article.title);

		editor.tf.reset();

		// Load value asynchronously
		const load_value = async () => {
			try {
				const id = article?.old_id;
				if (typeof id !== "number")
					throw new Error("Article old_id is not a number");
				const value = await convert_article(article, editor, id.toString());
				editor.tf.setValue(value);
				/* const str = JSON.stringify(value, null, 2);
				set_value_string(str); */
			} catch (error) {
				console.error("Failed to convert article:", error);
				const error_value = [
					{
						type: "p",
						children: [{ text: `Error converting article: ${error}` }],
					},
				];
				editor.tf.setValue(error_value);
				// set_value_string(JSON.stringify(error_value, null, 2));
			}
		};

		void load_value();
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
		current_index: 0,
		article_mapping: null,
		problems: [],
		is_loading: false,
		error: null,
		db_initialized: false,
	});

	const [index_input, set_index_input] = useState("0");

	// Initialize IndexedDB on component mount
	useEffect(() => {
		const init_db = async () => {
			try {
				await init_database();
				setState((prev) => ({ ...prev, db_initialized: true }));
			} catch (error) {
				console.error("Failed to initialize database:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to initialize database: ${error}`,
				}));
			}
		};

		void init_db();
	}, []);

	// Update index input when current_index changes
	useEffect(() => {
		set_index_input(String(state.current_index));
	}, [state.current_index]);

	// Load article mapping and ensure draft exists when index changes
	useEffect(() => {
		const load_mapping_and_ensure_draft = async () => {
			if (!state.db_initialized || state.articles.length === 0) return;

			const article = state.articles[state.current_index];
			if (!article) return;

			try {
				let mapping = await get_article_mapping(article.id);

				// If no mapping exists, create a draft
				if (!mapping) {
					console.log("Creating draft for article:", article.title);
					const { id, slug } = await create_draft_mutation({});
					await put_article_mapping(article.id, id, "draft");
					mapping = {
						article_id: id,
						status: "draft" as const,
						legacy_id: article.id,
					};
				}

				setState((prev) => ({ ...prev, article_mapping: mapping }));
			} catch (error) {
				console.error("Failed to load/create article mapping:", error);
				setState((prev) => ({
					...prev,
					error: `Failed to setup article: ${error}`,
				}));
			}
		};

		void load_mapping_and_ensure_draft();
	}, [
		state.current_index,
		state.articles,
		state.db_initialized,
		create_draft_mutation,
	]);

	// Action handlers
	const actions = useActions(state, setState);

	const context = { state, actions };

	if (!state.db_initialized) {
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
							<span>Current Index: {state.current_index}</span>
							{state.article_mapping && (
								<span
									className={`rounded px-2 py-1 text-sm ${
										state.article_mapping.status === "published"
											? "bg-green-100 text-green-800"
											: "bg-yellow-100 text-yellow-800"
									}`}
								>
									{state.article_mapping.status}
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
						onClick={actions.load_articles}
						disabled={state.is_loading}
						variant="default"
					>
						{state.articles.length > 0 ? "Reload" : "Load"} Articles
					</Button>
					<Button
						onClick={actions.reload_articles}
						disabled={state.is_loading || state.articles.length === 0}
						variant="outline"
					>
						Reload From Disk
					</Button>
					<Button
						onClick={() => actions.set_index(state.current_index - 1)}
						disabled={state.current_index <= 0 || state.articles.length === 0}
						variant="outline"
					>
						Previous
					</Button>
					<Button
						onClick={() => actions.set_index(state.current_index + 1)}
						disabled={
							state.current_index >= state.articles.length - 1 ||
							state.articles.length === 0
						}
						variant="outline"
					>
						Next
					</Button>
					<Button
						onClick={actions.accept_article}
						disabled={
							state.is_loading ||
							state.articles.length === 0 ||
							state.article_mapping?.status === "published"
						}
						variant="default"
						className="bg-green-600 hover:bg-green-700"
					>
						Accept Article
					</Button>
					<Separator orientation="vertical" className="h-8" />
					<Button
						onClick={actions.wipe_all}
						disabled={state.is_loading}
						variant="destructive"
					>
						Wipe All
					</Button>
					<Button
						onClick={actions.export_caches}
						disabled={state.is_loading}
						variant="outline"
					>
						Export Caches
					</Button>
					<Button
						onClick={() => document.getElementById("import-file")?.click()}
						disabled={state.is_loading}
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
								actions.import_caches(file);
							}
						}}
					/>
				</div>

				{/* Navigation */}
				<div className="flex items-center gap-2">
					<span>Article Index:</span>
					<Input
						type="number"
						value={index_input}
						onChange={(e) => set_index_input(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								actions.set_index(Number(index_input));
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
