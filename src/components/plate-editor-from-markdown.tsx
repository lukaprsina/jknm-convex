import { MarkdownPlugin } from "@platejs/markdown";
import { Plate, usePlateEditor } from "platejs/react";
import { EditorKit } from "~/components/editor-kit";
import { Editor, EditorContainer } from "~/components/plate-ui/editor";

export function PlateEditorFromMarkdown({ markdown }: { markdown: string }) {
	const editor = usePlateEditor({
		plugins: EditorKit,
		value: (editor) =>
			editor.getApi(MarkdownPlugin).markdown.deserialize(markdown),
	});

	return (
		<Plate editor={editor}>
			<EditorContainer>
				<Editor spellCheck={false} variant="article" />
			</EditorContainer>
		</Plate>
	);
}
