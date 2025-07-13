import { Link } from "@tanstack/react-router";
import type { Doc } from "convex/_generated/dataModel";
import { EditIcon, TrashIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function DraftCard({ draft }: { draft: Doc<"articles"> }) {
	return (
		<div className="relative mb-4 w-full">
			{/* Main Link for the entire card */}
			<Link
				from="/admin/osnutki"
				to="/admin/osnutki/$draft_id"
				params={{ draft_id: draft.slug }}
			>
				<Card className="w-full p-4">
					<CardHeader className="mb-2 flex w-full items-start">
						<CardTitle className="font-bold text-lg">
							{draft.title || "Neimenovana novica"}
						</CardTitle>
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
			{/* Buttons positioned absolutely */}
			<div className="absolute top-4 right-4 ml-auto flex gap-2">
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
		</div>
	);
}
