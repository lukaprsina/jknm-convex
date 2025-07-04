import { Plate, usePlateEditor } from "platejs/react";
import { EditorKit } from "~/components/editor-kit";
import { MarkdownPlugin } from "@platejs/markdown";
import { Editor, EditorContainer } from "~/components/ui/editor";

export function PlateEditorFromMarkdown({ markdown }: { markdown: string }) {
    const editor = usePlateEditor({
        plugins: EditorKit,
        value: (editor) => editor
            .getApi(MarkdownPlugin)
            .markdown.deserialize(markdown),
    });

    return (
        <Plate editor={editor}>
            <EditorContainer>
                <Editor variant="demo" spellCheck={false} />
            </EditorContainer>
        </Plate>
    );
}