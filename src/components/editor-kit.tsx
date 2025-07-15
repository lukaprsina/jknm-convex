"use client";

import { TrailingBlockPlugin, type Value } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

import { AutoformatKit } from "./plugins/autoformat-kit";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { BlockMenuKit } from "./plugins/block-menu-kit";
import { BlockPlaceholderKit } from "./plugins/block-placeholder-kit";
import { DndKit } from "./plugins/dnd-kit";
import { DocxKit } from "./plugins/docx-kit";
import { EmojiKit } from "./plugins/emoji-kit";
import { ExitBreakKit } from "./plugins/exit-break-kit";
import { FixedToolbarKit } from "./plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "./plugins/floating-toolbar-kit";
import { LinkKit } from "./plugins/link-kit";
import { ListKit } from "./plugins/list-kit";
import { MarkdownKit } from "./plugins/markdown-kit";
import { MathKit } from "./plugins/math-kit";
import { MediaKit } from "./plugins/media-kit";
import { SaveKit } from "./plugins/save-kit";
import { SlashKit } from "./plugins/slash-kit";
import { TableKit } from "./plugins/table-kit";
import { TocSidebarKit } from "./plugins/toc-sidebar-kit";
import { ToggleKit } from "./plugins/toggle-kit";

export const EditorKit = [
	...BlockMenuKit, // TODO: beautify this

	// Elements
	...BasicBlocksKit,
	// ...CodeBlockKit,
	...TableKit,
	...ToggleKit,
	// ...TocKit,
	...MediaKit,
	// ...CalloutKit,
	// ...ColumnKit,
	...MathKit,
	// ...DateKit,
	...LinkKit,
	// ...MentionKit,

	// Marks
	...BasicMarksKit,
	// ...FontKit,

	// Block Style
	...ListKit,
	// ...AlignKit,
	// ...LineHeightKit,

	// Collaboration
	// ...DiscussionKit,
	// ...CommentKit,
	// ...SuggestionKit,

	// Editing
	...SlashKit,
	...AutoformatKit,
	// ...CursorOverlayKit, // idk what this is, but it has AI
	...DndKit,
	...EmojiKit,
	...ExitBreakKit,
	TrailingBlockPlugin,

	// Parsers
	...DocxKit,
	...MarkdownKit,

	// UI
	...BlockPlaceholderKit,
	...FixedToolbarKit,
	...FloatingToolbarKit,

	// Mine
	...TocSidebarKit,
	...SaveKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
