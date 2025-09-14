import fs from "node:fs/promises";
import { useConvexMutation } from "@convex-dev/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
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
import { convert_article } from "~/lib/converter/convert-article";
import {
	get_article_mapping,
	init_database,
	type NewArticleCacheEntry,
	type ProblemEntry,
	put_article_mapping,
} from "~/lib/converter/converter-db";
import type { Article } from "~/lib/converter/types";
import { useActions } from "~/lib/converter/use-actions";
import { useAutoAccept } from "~/lib/converter/use-auto";

export const OLD_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/original-media";
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
	// Auto-accept functionality
	is_auto_accepting: boolean;
	auto_accept_progress: {
		total: number;
		processed: number;
		successes: number;
		errors: number;
	};
	auto_accept_errors: Array<{
		index: number;
		article_id: number;
		title: string;
		error: string;
	}>;
}

export interface ConverterActions {
	set_index: (index: number) => void;
	load_articles: () => Promise<void>;
	reload_articles: () => Promise<void>;
	accept_article: () => Promise<void>;
	wipe_all: () => Promise<void>;
	export_caches: () => Promise<void>;
	import_caches: () => Promise<void>;
	set_converted_content: (content: TElement[]) => void;
	// Auto-accept functionality
	start_auto_accept: () => void;
	stop_auto_accept: () => void;
	reset_auto_accept: () => void;
}

const EditorContext = createContext<
	| {
			state: ConverterState;
			setState: React.Dispatch<React.SetStateAction<ConverterState>>;
			actions: ConverterActions;
	  }
	| undefined
>(undefined);

function ArticlePlateEditor() {
	const editor = usePlateEditor({
		plugins: EditorKit,
	});

	return (
		<Plate editor={editor}>
			<ConfiguredPlateEditor />
		</Plate>
	);
}

export type LinkMapsType = {
	link_map: Record<string, string>;
	full_urls: Record<string, number[]>;
};

function ConfiguredPlateEditor() {
	const editor = useEditorRef();
	const editor_context = use(EditorContext);
	const mounted = useEditorMounted();
	const [linkMaps, setLinkMaps] = useState<LinkMapsType | undefined>(undefined);
	useAutoAccept({
		state: editor_context?.state,
		setState: editor_context?.setState,
		actions: editor_context?.actions,
	});

	useEffect(() => {
		const fetch_link_maps = async () => {
			const link_maps = await get_link_maps();
			setLinkMaps(link_maps);
		};
		void fetch_link_maps();
	}, []);

	useEffect(() => {
		if (!mounted) return;
		const article =
			editor_context?.state.articles[editor_context?.state.current_index];
		if (!article || !linkMaps) return;

		// Only proceed if we have the article mapping (draft created)
		const mapping = editor_context?.state.article_mapping;
		if (!mapping) return;

		editor.tf.reset();

		// Load value asynchronously
		const load_value = async () => {
			const convex_article_id = mapping.article_id;
			const value = await convert_article(
				article,
				editor,
				convex_article_id,
				linkMaps,
			);
			editor.tf.setValue(value);
			editor_context?.actions.set_converted_content(editor.children);
		};

		void load_value();
	}, [
		editor_context?.state.articles,
		editor_context?.state.current_index,
		editor_context?.state.article_mapping,
		editor,
		mounted,
		editor_context?.actions.set_converted_content,
		linkMaps,
	]);

	return (
		<EditorContainer>
			<Editor spellCheck={false} variant="article" />
		</EditorContainer>
	);
}

const get_link_maps = createServerFn().handler(async () => {
	const link_map_raw = await fs.readFile("converter/link_map.json", "utf-8");
	const full_urls_raw = await fs.readFile("converter/full_urls.json", "utf-8");
	const link_map = JSON.parse(link_map_raw) as Record<string, string>;
	const full_urls = JSON.parse(full_urls_raw) as Record<string, number[]>;
	return { link_map, full_urls } satisfies LinkMapsType;
});

function RouteComponent() {
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
		is_auto_accepting: false,
		auto_accept_progress: {
			total: 0,
			processed: 0,
			successes: 0,
			errors: 0,
		},
		auto_accept_errors: [],
	});

	const [indexInput, setIndexInput] = useState("0");
	const [legacyIndexInput, setLegacyIndexInput] = useState("0");

	// Initialize IndexedDB on component mount
	useEffect(() => {
		const init_db = async () => {
			try {
				await init_database();
				setState(
					(prev) =>
						({ ...prev, db_initialized: true }) satisfies ConverterState,
				);
			} catch (error) {
				console.error("Failed to initialize database:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to initialize database: ${error}`,
						}) satisfies ConverterState,
				);
			}
		};

		void init_db();
	}, []);

	// Update index input when current_index changes
	useEffect(() => {
		setIndexInput(String(state.current_index));
	}, [state.current_index]);

	// Load article mapping and ensure draft exists when index changes
	useEffect(() => {
		const load_mapping_and_ensure_draft = async () => {
			if (!state.db_initialized || state.articles.length === 0) return;

			const article = state.articles[state.current_index];
			if (!article) return;

			try {
				let mapping = await get_article_mapping(article.old_id);

				// If no mapping exists, create a draft
				if (!mapping) {
					// console.log("Creating draft for article:", article.title);
					const { id } = await create_draft_mutation({});
					await put_article_mapping(article.old_id, id, "draft");
					mapping = {
						article_id: id,
						status: "draft" as const,
						legacy_id: article.old_id,
					};
				}

				setState(
					(prev) =>
						({ ...prev, article_mapping: mapping }) satisfies ConverterState,
				);
			} catch (error) {
				console.error("Failed to load/create article mapping:", error);
				setState(
					(prev) =>
						({
							...prev,
							error: `Failed to setup article: ${error}`,
						}) satisfies ConverterState,
				);
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

	const context = { state, setState, actions };

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
							{state.is_auto_accepting && (
								<span className="rounded bg-blue-100 px-2 py-1 text-blue-800 text-sm">
									Auto-accepting...
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

				{/* Auto-Accept Progress */}
				{(state.is_auto_accepting ||
					state.auto_accept_progress.processed > 0) && (
					<Card>
						<CardHeader>
							<CardTitle>Auto-Accept Progress</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center gap-4">
								<span>
									Progress: {state.auto_accept_progress.processed} /{" "}
									{state.auto_accept_progress.total}
								</span>
								<span className="text-green-600">
									Successes: {state.auto_accept_progress.successes}
								</span>
								<span className="text-red-600">
									Errors: {state.auto_accept_progress.errors}
								</span>
								{state.auto_accept_progress.total > 0 && (
									<span>
										Completion:{" "}
										{Math.round(
											(state.auto_accept_progress.processed /
												state.auto_accept_progress.total) *
												100,
										)}
										%
									</span>
								)}
							</div>
							{/* Progress Bar */}
							{state.auto_accept_progress.total > 0 && (
								<div className="h-2 w-full rounded-full bg-gray-200">
									<div
										className="h-2 rounded-full bg-blue-600 transition-all duration-300"
										style={{
											width: `${
												(state.auto_accept_progress.processed /
													state.auto_accept_progress.total) *
												100
											}%`,
										}}
									/>
								</div>
							)}
							{/* Error List */}
							{state.auto_accept_errors.length > 0 && (
								<div className="space-y-1">
									<h4 className="font-semibold text-red-600">Errors:</h4>
									<div className="max-h-32 space-y-1 overflow-y-auto">
										{state.auto_accept_errors.map((error) => (
											<div
												key={error.index}
												className="rounded border border-red-200 bg-red-50 p-2 text-sm"
											>
												<div className="font-medium">
													Index {error.index}: {error.title} (ID:{" "}
													{error.article_id})
												</div>
												<div className="text-red-700">{error.error}</div>
											</div>
										))}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				)}

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
							state.article_mapping?.status === "published" ||
							state.is_auto_accepting
						}
						variant="default"
						className="bg-green-600 hover:bg-green-700"
					>
						Accept Article
					</Button>
					<Separator orientation="vertical" className="h-8" />
					{/* Auto-Accept Controls */}
					{!state.is_auto_accepting ? (
						<Button
							onClick={actions.start_auto_accept}
							disabled={
								state.is_loading ||
								state.articles.length === 0 ||
								state.current_index >= state.articles.length - 1
							}
							variant="default"
						>
							Start Auto Accept
						</Button>
					) : (
						<Button onClick={actions.stop_auto_accept} variant="outline">
							Stop Auto Accept
						</Button>
					)}
					<Button
						onClick={actions.reset_auto_accept}
						disabled={state.is_auto_accepting}
						variant="outline"
					>
						Reset Progress
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
						onClick={actions.import_caches}
						disabled={state.is_loading}
						variant="outline"
					>
						Import Caches
					</Button>
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
								actions.set_index(Number(indexInput));
							}
						}}
						className="w-20"
						min={0}
						max={state.articles.length - 1}
					/>
					<span>of {state.articles.length - 1}</span>
				</div>

				{/* Legacy index input */}
				<div className="flex items-center gap-2">
					<span>Legacy index:</span>
					<Input
						type="text"
						value={legacyIndexInput}
						onChange={(e) => setLegacyIndexInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								const search = legacyIndexInput.trim();
								if (search === "") return;
								const idx = state.articles.findIndex((a) => {
									const n = Number(search);
									if (!Number.isNaN(n)) {
										if (a.old_id === n) return true;
									}
									return false;
								});
								console.log(
									"Searching for legacy id",
									search,
									"found index",
									idx,
								);
								if (idx >= 0) {
									actions.set_index(idx);
								} else {
									setState((prev) => ({
										...prev,
										error: `Legacy id ${search} not found`,
									}));
								}
							}
						}}
						className="w-32"
					/>
				</div>

				{/* Editor */}
				{state.articles.length > 0 && <ArticlePlateEditor />}
			</div>
		</EditorContext>
	);
}
