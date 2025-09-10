import fs from "node:fs/promises";
import path from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { TElement } from "platejs";
import {
	Plate,
	type PlateEditor,
	useEditorMounted,
	useEditorRef,
	usePlateEditor,
} from "platejs/react";
import { createContext, use, useEffect, useState } from "react";
import rfdc_factory from "rfdc";
import { EditorKit } from "~/components/editor-kit";
import { Editor, EditorContainer } from "~/components/plate-ui/editor";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Article } from "./-types";

const rfdc = rfdc_factory();

const CONTENT_FILE = "src/content/articles.json";
const OLD_MEDIA_DIRECTORY = "C:/Users/luka/Desktop/jknm-b2/jknm-novice";

export const Route = createFileRoute("/converter/")({
	component: RouteComponent,
});

const get_articles = createServerFn().handler(async () => {
	const file = await fs.readFile(CONTENT_FILE, "utf-8");
	const articles = JSON.parse(file) as Article[];
	return articles;
});

const EditorContext = createContext<
	{ index: number; articles: Article[] } | undefined
>(undefined);

function ArticlePlateEditor() {
	const editor = usePlateEditor({
		plugins: EditorKit,
	});
	const [valueString, setValueString] = useState("");

	return (
		<>
			<Plate editor={editor}>
				<ConfiguredPlateEditor setValueString={setValueString} />
			</Plate>
			<div className="flex w-full justify-center">
				<pre className="prose max-w-screen-md overflow-x-auto whitespace-pre-wrap break-words bg-gray-100 p-4">
					{valueString}
				</pre>
			</div>
		</>
	);
}

function ConfiguredPlateEditor({
	setValueString,
}: {
	setValueString: (value: string) => void;
}) {
	const editor = useEditorRef();
	const editor_context = use(EditorContext);
	const mounted = useEditorMounted();

	useEffect(() => {
		if (!editor_context || !mounted) return;
		const article = editor_context.articles[editor_context.index];
		if (!article) return;
		console.log("Loading article", article.id, article.title);

		editor.tf.reset();

		const value = get_value_from_article(article, editor);

		editor.tf.setValue(value);
		const str = JSON.stringify(value, null, 2);
		setValueString(str);
	}, [editor_context, editor, mounted, setValueString]);

	return (
		<EditorContainer>
			<Editor spellCheck={false} variant="article" />
		</EditorContainer>
	);
}

function get_value_from_article(article: Article, editor: PlateEditor) {
	const value: TElement[] = [];

	for (const block of article.content.blocks) {
		if (block.type === "paragraph") {
			if (!block.data.text) throw new Error("Paragraph block missing text");
			// console.log("Inserting paragraph", block.data.text);

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
			copy_img(img_url);
			const img_html = `<img src="${img_url}" />`;
			const html = editor.api.html.deserialize({ element: img_html });
			if (html.length !== 1)
				throw new Error("Figure deserialized to multiple nodes");
			const first_html = rfdc(html[0]);
			const caption = block.data.caption;
			if (caption) {
				const caption_html = editor.api.html.deserialize({ element: caption });
				if (caption_html.length !== 1)
					throw new Error("Caption deserialized to multiple nodes");
				Object.assign(first_html, { caption: caption_html });
			}

			value.push(first_html as TElement);
		}
	}
	return value;
}

function copy_img(img_url: string) {
	let url: URL;
	try {
		url = new URL(img_url);
	} catch {
		console.warn("Invalid URL, skipping copy:", img_url);
		return;
	}

	const source = path.join(OLD_MEDIA_DIRECTORY, url.pathname);
	// TODO
}

function RouteComponent() {
	const [index, setIndex] = useState(0);
	const [indexInput, setIndexInput] = useState("");
	const [articles, setArticles] = useState<Article[]>([]);

	useEffect(() => {
		setIndexInput(String(index));
	}, [index]);

	return (
		<EditorContext value={{ index, articles }}>
			<div>
				<Button
					onClick={async () => {
						const articles = await get_articles();
						console.log("Loaded articles", articles.length);
						setArticles(articles);
						// analyze_articles(articles);
					}}
				>
					Load articles
				</Button>
				<Button
					onClick={async () => {
						setIndex((i) => i - 1);
					}}
				>
					Previous
				</Button>
				<Button
					onClick={async () => {
						setIndex((i) => i + 1);
					}}
				>
					Next
				</Button>
				<div className="p-2">
					Article Index: {index}
					<Input
						type="number"
						value={indexInput}
						onChange={(e) => setIndexInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								setIndex(Number(indexInput));
							}
						}}
						// min={0}
						// max={articles.length - 1}
					/>
				</div>
				<ArticlePlateEditor />
			</div>
		</EditorContext>
	);
}
