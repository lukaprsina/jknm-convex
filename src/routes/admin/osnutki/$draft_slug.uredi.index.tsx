import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { ArticlePlateEditor } from "~/components/article-plate-editor";

export const Route = createFileRoute("/admin/osnutki/$draft_slug/uredi/")({
	component: RouteComponent,
});

const draft_slug_route_api = getRouteApi("/admin/osnutki/$draft_slug/uredi/");

function RouteComponent() {
	const { draft_slug } = draft_slug_route_api.useParams();

	const { data: article } = useSuspenseQuery(
		convexQuery(api.articles.get_by_slug, { slug: draft_slug }),
	);

	if (!article) throw notFound();

	return (
		<ArticlePlateEditor value={article.content_json} article_id={article._id} />
	);
}
