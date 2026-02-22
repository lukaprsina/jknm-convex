import { BaseBasicBlocksKit } from "./plugins/basic-blocks-base-kit";
import { BaseBasicMarksKit } from "./plugins/basic-marks-base-kit";
import { BaseLinkKit } from "./plugins/link-base-kit";
import { BaseListKit } from "./plugins/list-base-kit";
import { MarkdownKit } from "./plugins/markdown-kit";
import { BaseMathKit } from "./plugins/math-base-kit";
import { BaseMediaKit } from "./plugins/media-base-kit";
import { BaseTableKit } from "./plugins/table-base-kit";
import { BaseToggleKit } from "./plugins/toggle-base-kit";

export const BaseEditorKit = [
	...BaseBasicBlocksKit,
	// ...BaseCodeBlockKit,
	...BaseTableKit,
	...BaseToggleKit,
	// ...BaseTocKit,
	...BaseMediaKit,
	// ...BaseCalloutKit,
	// ...BaseColumnKit,
	...BaseMathKit,
	// ...BaseDateKit,
	...BaseLinkKit,
	// ...BaseMentionKit,
	...BaseBasicMarksKit,
	// ...BaseFontKit,
	...BaseListKit,
	// ...BaseAlignKit,
	// ...BaseLineHeightKit,
	// ...BaseCommentKit,
	// ...BaseSuggestionKit,
	...MarkdownKit,
	// ...TocSidebarKit,
];
