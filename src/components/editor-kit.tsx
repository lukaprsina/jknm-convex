"use client";

import { type Value, TrailingBlockPlugin } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

import { AutoformatKit } from "./plugins/autoformat-kit";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { BlockMenuKit } from "./plugins/block-menu-kit";
import { BlockPlaceholderKit } from "./plugins/block-placeholder-kit";
import { CursorOverlayKit } from "./plugins/cursor-overlay-kit";
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
import { SlashKit } from "./plugins/slash-kit";
import { TableKit } from "./plugins/table-kit";
import { TocSidebarKit } from "./plugins/toc-sidebar-kit";
import { ToggleKit } from "./plugins/toggle-kit";

export const EditorKit = [
	...BlockMenuKit,

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
	...CursorOverlayKit,
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
	...TocSidebarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
