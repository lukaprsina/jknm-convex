import { Link } from "@tanstack/react-router";
import type { Doc } from "convex/_generated/dataModel";
import { Authenticated } from "convex/react";
import { MagicCard } from "~/components/magic-card";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CardButtons } from "./-card-buttons";

export function ArticleCard({ article }: { article: Doc<"articles"> }) {
	const date = new Date(article.updated_at).toLocaleDateString("sl-SI", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="relative mb-4 w-full">
			<Link
				to="/admin/$status/$article_slug"
				params={{ article_slug: article.slug, status: article.status }}
			>
				<Card className="w-full p-4">
					<CardHeader className="mb-2 flex w-full items-start">
						<CardTitle className="font-bold text-lg">{article.title}</CardTitle>
					</CardHeader>
					<CardContent className="text-gray-700">{date}</CardContent>
				</Card>
			</Link>
			<Authenticated>
				<CardButtons article={article} />
			</Authenticated>
		</div>
	);
}
