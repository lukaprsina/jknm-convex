import { createSlateEditor, PlateStatic, type Value } from "platejs";
import { BaseEditorKit } from "./editor-base-kit";

export function ArticlePlateStatic({
	value,
	// article_id,
}: {
	value: string;
	// article_id: Id<"articles">;
}) {
	const editor = createSlateEditor({
		plugins: BaseEditorKit,
		value: () => JSON.parse(value) as Value,
	});

	return <PlateStatic editor={editor} />;
}
