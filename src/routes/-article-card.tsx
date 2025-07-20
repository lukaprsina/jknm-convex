import type { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { TrashIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Prettify } from "~/types/utils";

type ElementType<T> = T extends (infer U)[] ? U : never;
type Articles = typeof api.articles.search_articles_unified._returnType.page;
type Article = Prettify<ElementType<Articles>>;

export function ArticleCard({ article }: { article: Article }) {
	const thumbnail = article.thumbnail_full?.original;
	if (!thumbnail) {
		return <p>Missing thumbnail</p>; // Handle missing thumbnail gracefully
	}

	return (
		<div className="relative mb-4 w-full">
			<Link
				from="/"
				to="/novica/$article_slug"
				params={{ article_slug: article.slug }}
			>
				<Card className="w-full p-4">
					<img
						src={thumbnail.url} // TODO
						loading="lazy"
						width={thumbnail.width}
						height={thumbnail.height}
						className="rounded-lg"
						style={{
							backgroundImage: article.thumbnail_full?.blur_placeholder
								? `url(${article.thumbnail_full.blur_placeholder})`
								: undefined,
							backgroundSize: "cover",
							backgroundRepeat: "no-repeat",
							backgroundPosition: "center",
						}}
					/>
					<CardHeader className="mb-2 flex w-full items-start">
						<CardTitle className="font-bold text-lg">
							{article.title || "Neimenovana novica"}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-gray-700">
						{new Date(article.updated_at).toLocaleDateString("sl-SI", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</CardContent>
				</Card>
			</Link>
			{/* Buttons positioned absolutely */}
			<div className="absolute top-4 right-4 ml-auto flex gap-2">
				{/* <Button variant="outline" asChild>
					<Link
						to="/admin/osnutki/$article_id/uredi"
						params={{ article_id: article.slug }}
					>
						<EditIcon />
					</Link>
				</Button> */}
				<Button variant="destructive">
					<TrashIcon />
				</Button>
			</div>
		</div>
	);
}
