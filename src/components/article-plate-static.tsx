import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createSlateEditor, PlateStatic, type Value } from "platejs";
import { MediaContext } from "~/lib/media-context";
import { BaseEditorKit } from "./editor-base-kit";

export function ArticlePlateStatic({
	value,
	article_id,
}: {
	value: string;
	article_id: Id<"articles">;
}) {
	const { data: article_with_media } = useSuspenseQuery(
		convexQuery(api.media.get_for_article, {
			article_id,
		}),
	);
	const media_map = new Map(
		article_with_media.media.map((m) => [m.original.url, m]),
	);

	const editor = createSlateEditor({
		plugins: BaseEditorKit,
		value: () => JSON.parse(value) as Value,
	});

	return (
		<MediaContext value={{ media_map }}>
			<PlateStatic editor={editor} />
		</MediaContext>
	);
}
