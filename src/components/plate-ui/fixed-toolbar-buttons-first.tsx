"use client";

import {
	BoldIcon,
	Code2Icon,
	HighlighterIcon,
	ItalicIcon,
	StrikethroughIcon,
	UnderlineIcon,
} from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { ToolbarGroup } from "../ui/toolbar";
import { CommentToolbarButton } from "./comment-toolbar-button";
import { EmojiToolbarButton } from "./emoji-toolbar-button";
import { ExportToolbarButton } from "./export-toolbar-button";
import { RedoToolbarButton, UndoToolbarButton } from "./history-toolbar-button";
import { ImportToolbarButton } from "./import-toolbar-button";
import {
	IndentToolbarButton,
	OutdentToolbarButton,
} from "./indent-toolbar-button";
import { InsertToolbarButton } from "./insert-toolbar-button";
import { LinkToolbarButton } from "./link-toolbar-button";
import {
	BulletedListToolbarButton,
	NumberedListToolbarButton,
} from "./list-toolbar-button";
import { MarkToolbarButton } from "./mark-toolbar-button";
import { MediaToolbarButton } from "./media-toolbar-button";
import { ModeToolbarButton } from "./mode-toolbar-button";
import { MoreToolbarButton } from "./more-toolbar-button";
import { PublishToolbarButton, SaveToolbarButton } from "./save-toolbar-button";
import { TableToolbarButton } from "./table-toolbar-button";
import { TurnIntoToolbarButton } from "./turn-into-toolbar-button";

export function FixedToolbarButtonsFirst() {
	const readOnly = useEditorReadOnly();

	return (
		<div className="flex w-full">
			{!readOnly && (
				<>
					<ToolbarGroup>
						<SaveToolbarButton />
						<PublishToolbarButton />
					</ToolbarGroup>
					<ToolbarGroup>
						<UndoToolbarButton />
						<RedoToolbarButton />
					</ToolbarGroup>

					<ToolbarGroup>
						<InsertToolbarButton />
						<TurnIntoToolbarButton />
					</ToolbarGroup>

					<ToolbarGroup>
						<MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
							<BoldIcon />
						</MarkToolbarButton>

						<MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
							<ItalicIcon />
						</MarkToolbarButton>

						<MarkToolbarButton
							nodeType={KEYS.underline}
							tooltip="Underline (⌘+U)"
						>
							<UnderlineIcon />
						</MarkToolbarButton>

						<MarkToolbarButton
							nodeType={KEYS.strikethrough}
							tooltip="Strikethrough (⌘+⇧+M)"
						>
							<StrikethroughIcon />
						</MarkToolbarButton>

						<MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
							<Code2Icon />
						</MarkToolbarButton>
					</ToolbarGroup>

					<ToolbarGroup>
						<NumberedListToolbarButton />
						<BulletedListToolbarButton />
					</ToolbarGroup>

					<ToolbarGroup>
						<LinkToolbarButton />
						<TableToolbarButton />
						<EmojiToolbarButton />
					</ToolbarGroup>

					<ToolbarGroup>
						<MediaToolbarButton nodeType={KEYS.img} />
						<MediaToolbarButton nodeType={KEYS.video} />
						<MediaToolbarButton nodeType={KEYS.audio} />
						<MediaToolbarButton nodeType={KEYS.file} />
					</ToolbarGroup>

					<ToolbarGroup>
						<OutdentToolbarButton />
						<IndentToolbarButton />
					</ToolbarGroup>

					<ToolbarGroup>
						<ExportToolbarButton />
						<ImportToolbarButton />
					</ToolbarGroup>

					<ToolbarGroup>
						<MoreToolbarButton />
					</ToolbarGroup>
				</>
			)}

			<div className="grow" />

			<ToolbarGroup>
				<MarkToolbarButton nodeType={KEYS.highlight} tooltip="Highlight">
					<HighlighterIcon />
				</MarkToolbarButton>
				<CommentToolbarButton />
			</ToolbarGroup>

			<ToolbarGroup>
				<ModeToolbarButton />
			</ToolbarGroup>
		</div>
	);
}
