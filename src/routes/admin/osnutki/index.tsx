import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { EmptyObject } from "better-auth/react";
import { Button } from "~/components/ui/button";

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
					<Link
						key={draft._id}
						to="/admin/osnutki/$draft_id/uredi"
						params={{ draft_id: draft.slug }}
					>
						{draft.title}
					</Link>
				))}
			</div>
		</div>
	);
}
