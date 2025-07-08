"use client";

import { MarkdownPlugin } from "@platejs/markdown";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { ArrowUpToLineIcon } from "lucide-react";
import { getEditorDOMFromHtmlString } from "platejs";
import { useEditorRef } from "platejs/react";
import * as React from "react";
import { useFilePicker } from "use-file-picker";
import type {
	SelectedFiles,
	SelectedFilesOrErrors,
} from "use-file-picker/types";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { ToolbarButton } from "../ui/toolbar";

type ImportType = "html" | "markdown";

export function ImportToolbarButton(props: DropdownMenuProps) {
	const editor = useEditorRef();
	const [open, setOpen] = React.useState(false);

	const getFileNodes = (text: string, type: ImportType) => {
		if (type === "html") {
			const editorNode = getEditorDOMFromHtmlString(text);
			const nodes = editor.api.html.deserialize({
				element: editorNode,
			});

			return nodes;
		}

		if (type === "markdown") {
			return editor.getApi(MarkdownPlugin).markdown.deserialize(text);
		}

		return [];
	};

	const { openFilePicker: openMdFilePicker } = useFilePicker({
		accept: [".md", ".mdx"],
		multiple: false,
		readFilesContent: false,
		onFilesSelected: async (
			data: SelectedFilesOrErrors<undefined, unknown>,
		) => {
			// Check if this is the success case (has plainFiles)
			if (
				"plainFiles" in data &&
				data?.plainFiles &&
				data.plainFiles.length > 0
			) {
				const text = await data.plainFiles[0].text();
				const nodes = getFileNodes(text, "markdown");
				editor.tf.insertNodes(nodes);
			} else if ("errors" in data) {
				// Handle errors if needed
				console.error("File selection errors:", data.errors);
			}
		},
	});

	const { openFilePicker: openHtmlFilePicker } = useFilePicker({
		accept: ["text/html"],
		multiple: false,
		readFilesContent: false,
		onFilesSelected: async (
			data: SelectedFilesOrErrors<undefined, unknown>,
		) => {
			// Check if this is the success case (has plainFiles)
			if (
				"plainFiles" in data &&
				data?.plainFiles &&
				data.plainFiles.length > 0
			) {
				const text = await data.plainFiles[0]?.text();
				if (text) {
					const nodes = getFileNodes(text, "html");
					editor.tf.insertNodes(nodes);
				}
			} else if ("errors" in data) {
				// Handle errors if needed
				console.error("File selection errors:", data.errors);
			}
		},
	});

	return (
		<DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
			<DropdownMenuTrigger asChild>
				<ToolbarButton pressed={open} tooltip="Import" isDropdown>
					<ArrowUpToLineIcon className="size-4" />
				</ToolbarButton>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start">
				<DropdownMenuGroup>
					<DropdownMenuItem
						onSelect={() => {
							openHtmlFilePicker();
						}}
					>
						Import from HTML
					</DropdownMenuItem>

					<DropdownMenuItem
						onSelect={() => {
							openMdFilePicker();
						}}
					>
						Import from Markdown
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
