import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import type { Value } from "platejs";
import {
	Plate,
	useEditorMounted,
	useEditorRef,
	usePlateEditor,
} from "platejs/react";
import { useEffect } from "react";
import { EditorKit } from "~/components/editor-kit";
import { Editor, EditorContainer } from "~/components/plate-ui/editor";
import { SavePlugin } from "./plugins/save";

function initial_value(string_value: string): Value {
	const value = JSON.parse(string_value) as Value;
	const first_node = value.at(0);

	if (!first_node || first_node.type !== "h1") {
		return [
			{
				type: "h1",
				children: [{ text: "Neimenovana novica" }],
			},
			...value,
		];
	}

	return value;
}

export function ArticlePlateEditor({
	value,
	article_id,
}: {
	value: string;
	article_id: Id<"articles">;
}) {
	const editor = usePlateEditor({
		plugins: EditorKit,
		value: () => initial_value(value),
	});

	return (
		<Plate editor={editor}>
			<ConfiguredPlateEditor article_id={article_id} />
		</Plate>
	);
}

function ConfiguredPlateEditor({ article_id }: { article_id: Id<"articles"> }) {
	const editor = useEditorRef();
	const is_mounted = useEditorMounted();

	const update_draft = useMutation({
		mutationFn: useConvexMutation(api.articles.update_draft),
	});

	useEffect(() => {
		if (!is_mounted) return;

		editor.setOption(SavePlugin, "article_id", article_id);
		editor.setOption(SavePlugin, "update_draft", update_draft.mutate);
	}, [is_mounted, editor, update_draft.mutate, article_id]);

	return (
		<EditorContainer>
			<Editor spellCheck={false} variant="article" />
		</EditorContainer>
	);
}
