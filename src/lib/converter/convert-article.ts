import type { Element as HastElement } from "hast";
import type { TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { record_problem } from "~/lib/converter/converter-db";
import { stage_media } from "./stage-media";
import type { Article } from "./types";

const parser = unified().use(rehypeParse, { fragment: true });

async function check_link(
	node: HastElement,
	article: Article,
	convex_article_id: string,
	absolute_urls: Map<string, string[]>,
	cdn_urls: Map<string, string[]>,
	article_links: Map<string, string[]>,
	relative_links: Map<string, string[]>,
) {
	if (!article || !convex_article_id) throw new Error("Article is undefined");
	if (node.tagName !== "a") return;
	const href = node.properties?.href;

	if (typeof href !== "string") throw new Error("Invalid link");

	try {
		const url = new URL(href);

		// Check if the hostname ends with 'amazonaws.com'
		// https://jknm.s3.eu-central-1.amazonaws.com
		if (url.hostname.endsWith("amazonaws.com")) {
			const prev_cdn = cdn_urls.get(url.href) ?? [];
			cdn_urls.set(url.href, [...prev_cdn, article.old_id.toString()]);
		} else {
			const prev = absolute_urls.get(url.href) ?? [];
			absolute_urls.set(url.href, [...prev, article.old_id.toString()]);
		}
	} catch (_e) {
		if (!href.startsWith("/"))
			throw new Error(`Invalid link: ${href}, doesn't start with /`);

		if (href.startsWith("/novica?id=")) {
			const id = href.substring("/novica?id=".length);
			if (!id) throw new Error("Invalid novica link, missing id");
			const prev = article_links.get(id) ?? [];
			article_links.set(id, [...prev, article.old_id.toString()]);
		} else {
			// Return if href ends with a file extension (e.g., .jpg, .png, .pdf)
			if (/\.[a-zA-Z0-9]+$/.test(href))
				throw new Error(`Unsupported relative link: ${href}`);

			const prev = relative_links.get(href) ?? [];
			relative_links.set(href, [...prev, article.old_id.toString()]);
		}
	}
}

async function deserialize_html(
	html: string,
	editor: PlateEditor,
	article: Article,
	convex_article_id: string,
	absolute_urls: Map<string, string[]>,
	cdn_urls: Map<string, string[]>,
	article_links: Map<string, string[]>,
	relative_links: Map<string, string[]>,
) {
	const tree = parser.parse(html);
	const tasks: Promise<void>[] = [];
	visit(tree, "element", (node) =>
		tasks.push(
			check_link(
				node,
				article,
				convex_article_id,
				absolute_urls,
				cdn_urls,
				article_links,
				relative_links,
			),
		),
	);
	await Promise.all(tasks);
	const descendants = editor.api.html.deserialize({ element: html });
	return descendants;
}

export async function convert_article(
	article: Article,
	editor: PlateEditor,
	convex_article_id: string,
): Promise<TElement[]> {
	const value: TElement[] = [];
	const absolute_urls = new Map<string, string[]>();
	const cdn_urls = new Map<string, string[]>();
	const article_links = new Map<string, string[]>();
	const relative_links = new Map<string, string[]>();

	for (const block of article.content.blocks) {
		if (block.type === "paragraph") {
			if (!block.data.text) throw new Error("Paragraph block missing text");

			const html = await deserialize_html(
				block.data.text,
				editor,
				article,
				convex_article_id,
				absolute_urls,
				cdn_urls,
				article_links,
				relative_links,
			);
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
				const finalUrl = await stage_media(
					img_url,
					article.old_id,
					convex_article_id,
				);

				const img_html = `<img src="${finalUrl}" />`;
				const html = editor.api.html.deserialize({ element: img_html });
				if (html.length !== 1)
					throw new Error("Figure deserialized to multiple nodes");
				const first_html = html[0];
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
				await record_problem(
					article.old_id,
					"missing_media",
					`Failed to stage media: ${img_url} - ${error}`,
					img_url,
				);
				const placeholder_html = `<p>[Missing image: ${img_url}]</p>`;
				const html = editor.api.html.deserialize({
					element: placeholder_html,
				});
				value.push(html[0] as TElement);
			}
		}
	}

	return value;
}
