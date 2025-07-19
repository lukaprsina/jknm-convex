import { article_status_validator } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router";
import type { EmptyObject } from "better-auth/react";
import { api } from "convex/_generated/api";
import type { Infer } from "convex/values";
import { Button } from "~/components/ui/button";
import { DraftCard } from "./-article-card";

export const Route = createFileRoute("/admin/$status/")({
	component: RouteComponent,
	loader: async ({ context, params }) => {
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
	const { articles } = status_route.useLoaderData();
	const navigate = status_route.useNavigate();

	const { mutate } = useMutation<
		typeof api.articles.create_draft._returnType,
		void,
		EmptyObject | undefined
	>({
		mutationFn: useConvexMutation(api.articles.create_draft),
		onSuccess: (new_article) => {
			navigate({
				to: "/admin/$status/$article_slug/uredi",
				params: { article_slug: new_article },
			});
		},
	});

	return (
		<div>
			<Button onClick={() => mutate({})}>Create Draft</Button>
			<div>
				{articles.map((draft) => (
					<DraftCard key={draft._id} article={draft} />
				))}
			</div>
		</div>
	);
}
