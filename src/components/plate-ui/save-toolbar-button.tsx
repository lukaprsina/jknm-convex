import { CloudUploadIcon, SaveIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import { ToolbarButton } from "../ui/toolbar";

export function SaveToolbarButton(
	props: React.ComponentProps<typeof ToolbarButton>,
) {
	const editor = useEditorRef();

	return (
		<ToolbarButton
			{...props}
			onClick={() => {
				console.log("Saving", editor.children);
			}}
			onMouseDown={(e) => e.preventDefault()}
			tooltip="Save"
		>
			<SaveIcon />
		</ToolbarButton>
	);
}

export function PublishToolbarButton(
	props: React.ComponentProps<typeof ToolbarButton>,
) {
	const editor = useEditorRef();

	return (
		<ToolbarButton
			{...props}
			onClick={() => {
				console.log("Publishing", editor.children);
			}}
			onMouseDown={(e) => e.preventDefault()}
			tooltip="Publish"
		>
			<CloudUploadIcon />
		</ToolbarButton>
	);
}
