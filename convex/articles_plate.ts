"use node";

import { stripMarkdown } from "@platejs/markdown";
import { type Infer, v } from "convex/values";
import { fromMarkdown as markdown_to_mdast } from "mdast-util-from-markdown";
import { createSlateEditor } from "platejs";
import { visit } from "unist-util-visit";
import { BaseBasicBlocksKit } from "../src/components/plugins/basic-blocks-base-kit";
import { BaseBasicMarksKit } from "../src/components/plugins/basic-marks-base-kit";
import { BaseLinkKit } from "../src/components/plugins/link-base-kit";
import { BaseListKit } from "../src/components/plugins/list-base-kit";
import { MarkdownKit } from "../src/components/plugins/markdown-kit";
import { BaseMediaKit } from "../src/components/plugins/media-base-kit";
import { BaseTableKit } from "../src/components/plugins/table-base-kit";
import { BaseToggleKit } from "../src/components/plugins/toggle-base-kit";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { headings_validator } from "./schema";

// import { BaseEditorKit } from "~/components/editor-base-kit";

const EXCERPT_LENGTH = 300;

export const NoMathKit = [
	...BaseBasicBlocksKit,
	...BaseTableKit,
	...BaseToggleKit,
	...BaseMediaKit,
	...BaseLinkKit,
	...BaseBasicMarksKit,
	...BaseListKit,
	...MarkdownKit,
	// ...BaseMathKit,
];

export const analyze_article = internalAction({
	args: {
		article_id: v.id("articles"),
		// title: v.string(),
		article_content: v.string(),
	},
	handler: async (ctx, args) => {
		const content_json = JSON.parse(args.article_content);

		if (Array.isArray(content_json) && content_json.length > 0) {
			const firstNode = content_json[0];
			if (firstNode.type !== "h1" || firstNode.children.length === 0) {
				throw new Error("First node is not an H1 with text children.");
			}
		} else {
			throw new Error("Content JSON is not a valid array or is empty.");
		}

		const editor = createSlateEditor({
			plugins: NoMathKit,
			value: content_json,
		});

		let markdown = editor.api.markdown.serialize();
		const headings: Infer<typeof headings_validator> = [];
		const mdast = markdown_to_mdast(markdown);
		visit(mdast, "heading", (node) => {
			if (node.type === "heading" && node.depth && node.children) {
				const text = node.children
					.map((child) => {
						if (child.type === "text") {
							return child.value;
						}

						return "";
					})
					.join("")
					.trim();

				headings.push({ text, level: node.depth });
			}
		});

		editor.tf.delete({
			at: [0],
		});

		// Re-serialize to markdown after removing the H1
		markdown = editor.api.markdown.serialize();
		const content_text = stripMarkdown(markdown).trim();
		const excerpt = content_text.slice(0, EXCERPT_LENGTH).trim();

		await ctx.runMutation(internal.articles.update_analysis, {
			article_id: args.article_id,
			title: headings.length > 0 ? headings[0].text : "Neimenovana novica",
			content_text,
			excerpt,
			headings,
		});
	},
});
