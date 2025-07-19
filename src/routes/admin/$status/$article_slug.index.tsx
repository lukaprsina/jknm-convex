import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { ArticlePlateStatic } from "~/components/article-plate-static";

export const Route = createFileRoute("/admin/$status/$article_slug/")({
	component: RouteComponent,
	loader: async ({ context, params }) => {
		const article = await context.queryClient.ensureQueryData(
			convexQuery(api.articles.get_by_slug, {
				slug: params.article_slug,
			}),
		);

		return { article };
	},
});

const article_slug_route_api = getRouteApi("/admin/$status/$article_slug/");

function RouteComponent() {
	const { article_slug } = article_slug_route_api.useParams();

	const { data: article } = useSuspenseQuery(
		convexQuery(api.articles.get_by_slug, { slug: article_slug }),
	);

	if (!article) throw notFound();

	return (
		<ArticlePlateStatic value={article.content_json} article_id={article._id} />
	);
}
