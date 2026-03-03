"use client";

import { BaselineIcon, HighlighterIcon, PaintBucketIcon } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorReadOnly } from "platejs/react";
import { ToolbarGroup } from "../ui/toolbar";
import { AlignToolbarButton } from "./align-toolbar-button";
import { CommentToolbarButton } from "./comment-toolbar-button";
import { FontColorToolbarButton } from "./font-color-toolbar-button";
import { FontSizeToolbarButton } from "./font-size-toolbar-button";
import { LineHeightToolbarButton } from "./line-height-toolbar-button";
import { TodoListToolbarButton } from "./list-toolbar-button";
import { MarkToolbarButton } from "./mark-toolbar-button";
import { ModeToolbarButton } from "./mode-toolbar-button";
import { ToggleToolbarButton } from "./toggle-toolbar-button";

export function FixedToolbarButtonSecond() {
	const readOnly = useEditorReadOnly();

	return (
		<div className="flex w-full">
			{!readOnly && (
				<>
					<ToolbarGroup>
						<FontSizeToolbarButton />

						<FontColorToolbarButton nodeType={KEYS.color} tooltip="Text color">
							<BaselineIcon />
						</FontColorToolbarButton>

						<FontColorToolbarButton
							nodeType={KEYS.backgroundColor}
							tooltip="Background color"
						>
							<PaintBucketIcon />
						</FontColorToolbarButton>

						<AlignToolbarButton />
						<TodoListToolbarButton />
						<ToggleToolbarButton />
						<LineHeightToolbarButton />
					</ToolbarGroup>
					<ToolbarGroup>
						<FontSizeToolbarButton />
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
