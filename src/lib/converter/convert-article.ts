import type * as hast from "hast";
import { toHtml } from "hast-util-to-html";
import type { TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import type { Node } from "unist";
import { record_problem } from "~/lib/converter/converter-db";
import type { LinkMapsType } from "~/routes/converter";
import { stage_document_media, stage_media } from "./stage-media";
import type { Article } from "./types";

const parser = unified().use(rehypeParse, { fragment: true });

type AsyncVisitor<T extends Node> = (
	node: T,
	index: number | null,
	parent: Node | null,
) => Promise<void> | void;

export async function visitAsync(
	node: Node,
	visitor: AsyncVisitor<Node>,
	index: number | null = null,
	parent: Node | null = null,
): Promise<void> {
	await visitor(node, index, parent);

	if ("children" in node && Array.isArray(node.children)) {
		const children = node.children as Node[];
		for (let i = 0; i < children.length; i++) {
			await visitAsync(children[i], visitor, i, node);
		}
	}
}

function isElement(node: hast.Node): node is hast.Element {
	return node.type === "element";
}

function isAnchor(node: hast.Node): node is hast.Element & { tagName: "a" } {
	return isElement(node) && node.tagName === "a";
}

async function modify_link(
	node: hast.Element & {
		tagName: "a";
	},
	article: Article,
	convex_article_id: string,
	link_maps: LinkMapsType,
) {
	if (!article || !convex_article_id) throw new Error("Article is undefined");

	if (!node.properties) throw new Error("Link missing data");
	if (!("href" in node.properties)) throw new Error("Link missing href");
	const href = node.properties.href;

	if (typeof href !== "string") throw new Error("Invalid link");

	try {
		const _url = new URL(href);
	} catch {
		if (!href.startsWith("/"))
			throw new Error(`Invalid link: ${href}, doesn't start with /`);

		if (href.startsWith("/novica?id=")) {
			const id = href.substring("/novica?id=".length);
			if (!id) throw new Error("Invalid novica link, missing id");
		} else {
			// Return if href ends with a file extension (e.g., .jpg, .png, .pdf)
			if (/\.[a-zA-Z0-9]+$/.test(href))
				throw new Error(`Unsupported relative link: ${href}`);
		}

		return false;
	}
	/*
	TODO:
	Uncaught (in promise) Error: Could not determine content type for file: watch?v=zzqJSxM_Eu8
	*/
	const link_mapped = Object.hasOwn(link_maps.link_map, href)
		? link_maps.link_map[href]
		: undefined;
	const link_full = Object.hasOwn(link_maps.full_urls, href) ? href : undefined;

	if (typeof link_mapped === "undefined" && typeof link_full === "undefined") {
		console.warn("No mapping for link:", href, article.old_id);
		throw new Error(`No mapping for link: ${href}`);
	}

	if (link_full) return false;

	if (!link_mapped) throw new Error(`UNREACHABLE: ${href}`);

	// node.properties.href = `https://www.example.com?link=${encodeURIComponent(link)}`;
	const filename = link_mapped.split("/").slice(-1)[0];
	const original_url = await stage_document_media(
		article.old_id,
		convex_article_id,
		link_mapped,
		filename,
	);

	node.properties.href = original_url;
	return true;
}

async function deserialize_html(
	html: string,
	editor: PlateEditor,
	article: Article,
	convex_article_id: string,
	link_maps: LinkMapsType,
	throw_if_link = true,
) {
	const tree = parser.parse(html);

	await visitAsync(tree, async (node) => {
		if (!isAnchor(node)) return;

		if (throw_if_link)
			throw new Error(`Unexpected link in article content: ${article.old_id}`);

		await modify_link(node, article, convex_article_id, link_maps);
	});

	const new_html = toHtml(tree);
	const serialized = editor.api.html.deserialize({ element: new_html });
	return serialized;
}

export async function convert_article(
	article: Article,
	editor: PlateEditor,
	convex_article_id: string,
	link_maps: LinkMapsType,
): Promise<TElement[]> {
	const value: TElement[] = [];

	for (const block of article.content.blocks) {
		if (block.type === "paragraph") {
			if (!block.data.text) throw new Error("Paragraph block missing text");

			const html = await deserialize_html(
				block.data.text,
				editor,
				article,
				convex_article_id,
				link_maps,
				false,
			);
			const node: TElement = {
				type: "p",
				children: html,
			};

			value.push(node);
		} else if (block.type === "header") {
			if (!block.data.text) throw new Error("Header block missing text");
			const html = await deserialize_html(
				block.data.text,
				editor,
				article,
				convex_article_id,
				link_maps,
			);
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
			const html = await deserialize_html(
				html_list,
				editor,
				article,
				convex_article_id,
				link_maps,
			);
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
			const html = await deserialize_html(
				iframe_html,
				editor,
				article,
				convex_article_id,
				link_maps,
			);
			if (html.length !== 1)
				throw new Error("Embed deserialized to multiple nodes");

			value.push(html[0] as TElement);
		} else if (block.type === "image") {
			const img_url = block.data.file?.url;
			if (!img_url) throw new Error("Image block missing file url");

			// TODO
			const early_return: boolean = 1 + 1 === 3;
			if (early_return) {
				return value;
			}

			try {
				// TODO
				const finalUrl = await stage_media(
					img_url,
					article.old_id,
					convex_article_id,
				);

				const img_html = `<img src="${finalUrl}" />`;
				const html = await deserialize_html(
					img_html,
					editor,
					article,
					convex_article_id,
					link_maps,
				);
				if (html.length !== 1)
					throw new Error("Figure deserialized to multiple nodes");
				const first_html = html[0];
				const caption = block.data.caption;
				if (caption) {
					const caption_html = await deserialize_html(
						caption,
						editor,
						article,
						convex_article_id,
						link_maps,
					);

					if (caption_html.length !== 1)
						throw new Error("Caption deserialized to multiple nodes");
					Object.assign(first_html, { caption: caption_html });
				}

				value.push(first_html as TElement);
			} catch (error) {
				// console.error("Failed to stage media:", img_url, error);
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
