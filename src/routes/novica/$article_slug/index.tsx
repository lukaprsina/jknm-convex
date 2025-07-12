import { convexQuery } from "@convex-dev/react-query";
import { MarkdownPlugin } from "@platejs/markdown";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { createSlateEditor, PlateStatic } from "platejs";
import type { PlateEditor } from "platejs/react";
import { BaseEditorKit } from "~/components/editor-base-kit";

export const Route = createFileRoute("/novica/$article_slug/")({
	component: RouteComponent,
	loader: async ({ context, params }) => {
		const { article_slug } = params;
		if (!article_slug) {
			throw new Error("Article slug is required");
		}

		const article = await context.queryClient.ensureQueryData(
			convexQuery(api.articles.get_by_slug, {
				slug: article_slug,
				user_id: context.userId,
			}),
		);

		return { article };
	},
});

const article_slug_route_api = getRouteApi("/novica/$article_slug/");

function RouteComponent() {
	const { article_slug } = article_slug_route_api.useParams();
	const { userId } = article_slug_route_api.useRouteContext();

	const { data: article } = useSuspenseQuery(
		convexQuery(api.articles.get_by_slug, {
			slug: article_slug,
			user_id: userId,
		}),
	);

	if (!article?.content_markdown) {
		return null;
	}

	const editor = createSlateEditor({
		plugins: BaseEditorKit,
		// nodeId: false, // Disable NodeIdPlugin to prevent hydration mismatches
		value: (editor: PlateEditor) => {
			return editor
				.getApi(MarkdownPlugin)
				.markdown.deserialize(article.content_markdown ?? "# No article");
		},
	});

	return <PlateStatic editor={editor} />;
}
