import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import type { EmptyObject } from "better-auth/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { DraftCard } from "./-draft-card";

export const Route = createFileRoute("/admin/osnutki/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		const drafts = await context.queryClient.ensureQueryData(
			convexQuery(api.articles.get_all_drafts, {}),
		);

		return {
			drafts,
		};
	},
});

const draft_route = getRouteApi("/admin/osnutki/");

function RouteComponent() {
	const { drafts } = draft_route.useLoaderData();
	const navigate = draft_route.useNavigate();

	const { mutate } = useMutation<
		typeof api.articles.create_draft._returnType,
		void,
		EmptyObject | undefined
	>({
		mutationFn: useConvexMutation(api.articles.create_draft),
		onSuccess: (new_draft) => {
			navigate({
				to: "/admin/osnutki/$draft_id/uredi",
				params: { draft_id: new_draft },
			});
		},
	});

	return (
		<div>
			<Button onClick={() => mutate({})}>Create Draft</Button>
			<div>
				{drafts.map((draft) => (
					<DraftCard key={draft._id} draft={draft} />
				))}
			</div>
		</div>
	);
}
