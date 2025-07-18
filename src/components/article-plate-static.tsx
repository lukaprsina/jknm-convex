import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { convexQuery, useConvexQuery } from "@convex-dev/react-query";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createSlateEditor, PlateStatic, type Value } from "platejs";
import { createContext } from "react";
import { BaseEditorKit } from "./editor-base-kit";

export const MediaContext = createContext<{
	media_map: Map<string, Doc<"media">>;
}>({ media_map: new Map() });

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
		article_with_media.media.map((m) => [m.storage_path, m]),
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
