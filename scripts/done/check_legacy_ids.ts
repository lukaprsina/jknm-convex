import { api } from "@convex/_generated/api";
import { ConvexQueryClient } from "@convex-dev/react-query";

const convexQueryClient = new ConvexQueryClient(
	import.meta.env.VITE_CONVEX_URL,
);
const convex = convexQueryClient.convexClient;

// No duplicate legacy_id values found. Checked 661 legacy IDs.
async function main() {
	const articles = await convex.query(api.articles.get_all, {});

	type ArticleLite = { _id: string; legacy_id?: number; slug?: string };

	const seen = new Set<number>();
	const duplicates: Array<{
		legacy_id: number;
		article_id: string;
		slug?: string;
	}> = [];

	for (const a of articles) {
		const article = a as ArticleLite;
		const legacy_id = article.legacy_id;
		if (typeof legacy_id === "number") {
			if (seen.has(legacy_id)) {
				duplicates.push({
					legacy_id,
					article_id: article._id,
					slug: article.slug,
				});
			} else {
				seen.add(legacy_id);
			}
		}
	}

	if (duplicates.length === 0) {
		console.log(
			`No duplicate legacy_id values found. Checked ${seen.size} legacy IDs.`,
		);
	} else {
		console.log(`Found ${duplicates.length} duplicate legacy_id entries:`);
		for (const d of duplicates) {
			console.log(
				` - legacy_id=${d.legacy_id} article_id=${d.article_id} slug=${d.slug}`,
			);
		}
	}
}

main().catch((err) => {
	console.error("Error while checking legacy ids:", err);
	process.exitCode = 1;
});
