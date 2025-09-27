"use node";

import { v } from "convex/values";
import { createSlateEditor } from "platejs";
import { BaseBasicBlocksKit } from "../src/components/plugins/basic-blocks-base-kit";
import { BaseBasicMarksKit } from "../src/components/plugins/basic-marks-base-kit";
import { BaseLinkKit } from "../src/components/plugins/link-base-kit";
import { BaseListKit } from "../src/components/plugins/list-base-kit";
import { MarkdownKit } from "../src/components/plugins/markdown-kit";
import { BaseMediaKit } from "../src/components/plugins/media-base-kit";
import { BaseTableKit } from "../src/components/plugins/table-base-kit";
import { BaseToggleKit } from "../src/components/plugins/toggle-base-kit";
// import { BaseEditorKit } from "~/components/editor-base-kit";
import { internalAction } from "./_generated/server";

export const BaseEditorKit = [
	...BaseBasicBlocksKit,
	...BaseTableKit,
	...BaseToggleKit,
	...BaseMediaKit,
	// ...BaseMathKit,
	...BaseLinkKit,
	...BaseBasicMarksKit,
	...BaseListKit,
	...MarkdownKit,
];

export const analyze_article = internalAction({
	args: { article_id: v.id("articles"), article_content: v.string() },
	handler: async (ctx, args) => {
		console.log("analyze_article", { article_id: args.article_id });

		const editor = createSlateEditor({
			plugins: BaseEditorKit,
			value: undefined,
		});

		console.log("update_article createSlateEditor", {
			article_id: args.article_id,
			children: editor.children,
		});
	},
});
