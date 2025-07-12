import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { ArticlePlateEditor } from "~/components/article-plate-editor";

export const Route = createFileRoute("/admin/osnutki/$draft_id/")({
	component: RouteComponent,
});

const draft_id_route_api = getRouteApi("/admin/osnutki/$draft_id/uredi/");

function RouteComponent() {
	const { draft_id } = draft_id_route_api.useParams();

	const { data: article } = useSuspenseQuery(
		convexQuery(api.articles.get_draft_by_slug, { slug: draft_id }),
	)

	return (
		<ArticlePlateEditor value={article.content_json} article_id={article._id} />
	)
}
