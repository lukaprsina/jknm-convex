import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { ArticlePlateStatic } from "~/components/article-plate-static";

export const Route = createFileRoute("/admin/osnutki/$draft_id/")({
	component: RouteComponent,
});

const draft_id_route_api = getRouteApi("/admin/osnutki/$draft_id/");

function RouteComponent() {
	const { draft_id } = draft_id_route_api.useParams();

	const { data: article } = useSuspenseQuery(
		convexQuery(api.articles.get_draft_by_slug, { slug: draft_id }),
	);

	return (
		<ArticlePlateStatic
			value={article.content_json} /* article_id={article._id} */
		/>
	);
}
