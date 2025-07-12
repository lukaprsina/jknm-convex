import { getRouteApi, Link } from "@tanstack/react-router";
import type { Doc } from "convex/_generated/dataModel";
import { EditIcon, TrashIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const _draft_route = getRouteApi("/admin/osnutki/");

/* export function DraftCard({ draft }: { draft: Doc<"articles"> }) {
	const navigate = draft_route.useNavigate();

	return (
		<Link
			from="/admin/osnutki"
			to="/admin/osnutki/$draft_id"
			params={{ draft_id: draft.slug }}
		>
			<Card className="mb-4 w-full p-4">
				<CardHeader className="mb-2 flex w-full items-start">
					<CardTitle className="font-bold text-lg">
						{draft.title || "Neimenovana novica"}
					</CardTitle>
					<div className="ml-auto flex gap-2">
						<Button
							variant="outline"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();

								navigate({
									from: "/admin/osnutki",
									to: "/admin/osnutki/$draft_id/uredi",
									params: { draft_id: draft.slug },
								});
							}}
						>
							<EditIcon />
						</Button>
						<Button variant="destructive">
							<TrashIcon />
						</Button>
					</div>
				</CardHeader>
				<CardContent className="text-gray-700">
					{new Date(draft.updated_at).toLocaleDateString("sl-SI", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</CardContent>
			</Card>
		</Link>
	);
} */

export function DraftCard({ draft }: { draft: Doc<"articles"> }) {
	return (
		// Make the Card a positioning context for the stretched link
		<Card className="relative mb-4 w-full p-4">
			{/* Use a stretched link for the main navigation. It covers the whole card. */}
			<Link
				from={"/admin/osnutki"}
				to="/admin/osnutki/$draft_id"
				params={{ draft_id: draft.slug }}
				className="absolute inset-0 z-0" // Stretches the link
				aria-label={`View ${draft.title || "unnamed article"}`} // Good for accessibility
			/>
			{/* All content below must have a higher z-index to be interactive */}
			<div className="relative z-10">
				<CardHeader className="mb-2 flex w-full items-start">
					<CardTitle className="font-bold text-lg">
						{draft.title || "Neimenovana novica"}
					</CardTitle>
					<div className="ml-auto flex gap-2">
						{/* This Link is now a sibling, not a child, of the main link */}
						<Button variant="outline" asChild>
							<Link
								to="/admin/osnutki/$draft_id/uredi"
								params={{ draft_id: draft.slug }}
							>
								<EditIcon />
							</Link>
						</Button>
						<Button variant="destructive">
							<TrashIcon />
						</Button>
					</div>
				</CardHeader>
				<CardContent className="text-gray-700">
					{new Date(draft.updated_at).toLocaleDateString("sl-SI", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</CardContent>
			</div>
		</Card>
	);
}
