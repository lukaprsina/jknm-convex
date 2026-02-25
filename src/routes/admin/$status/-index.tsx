import { article_status_validator } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router";
import type { EmptyObject } from "better-auth/react";
import { api } from "convex/_generated/api";
import type { Infer } from "convex/values";
import { status_meta } from "~/components/status-meta";
import { Button } from "~/components/ui/button";
import { ArticleCard } from "./-article-card";

export const Route = createFileRoute("/admin/$status/")({
	component: RouteComponent,
	loader: async ({ context, params }) => {
		console.log("Loading articles of status", params.status);
		const is_status_valid = article_status_validator.members.some(
			(member) => member.value === params.status,
		);

		if (!is_status_valid) throw notFound();

		const status = params.status as Infer<typeof article_status_validator>;

		const articles = await context.queryClient.ensureQueryData(
			convexQuery(api.articles.get_latest_of_status, { status }),
		);

		return {
			articles,
			status,
		};
	},
});

const status_route = getRouteApi("/admin/$status/");

function RouteComponent() {
	const { articles, status } = status_route.useLoaderData();

	const meta = status_meta.get(status);
	if (!meta) throw new Error("Status meta not found");

	return (
		<div>
			<div className="prose">
				<h2>{meta.label}</h2>
			</div>
			<div>
				{articles.map((article) => (
					<ArticleCard key={article._id} article={article} />
				))}
			</div>
		</div>
	);
}
