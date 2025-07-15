import { CloudUploadIcon, SaveIcon, ScrollTextIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import { PublishPlugin, SavePlugin } from "../plugins/save-kit";
import { ToolbarButton } from "../ui/toolbar";

export function SaveToolbarButton(
	props: React.ComponentProps<typeof ToolbarButton>,
) {
	const editor = useEditorRef();
	const save_plugin = editor.getApi(SavePlugin).save;

	return (
		<ToolbarButton
			{...props}
			onClick={() => {
				save_plugin.save();
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
	const publish_plugin = editor.getApi(PublishPlugin).publish;

	return (
		<ToolbarButton
			{...props}
			onClick={() => {
				publish_plugin.publish();
			}}
			onMouseDown={(e) => e.preventDefault()}
			tooltip="Publish"
		>
			<CloudUploadIcon />
		</ToolbarButton>
	);
}

export function LogToolbarButton(
	props: React.ComponentProps<typeof ToolbarButton>,
) {
	const editor = useEditorRef();

	return (
		<ToolbarButton
			{...props}
			onClick={() => {
				console.log("Logging", editor.children);
			}}
			onMouseDown={(e) => e.preventDefault()}
			tooltip="Log"
		>
			<ScrollTextIcon />
		</ToolbarButton>
	);
}
