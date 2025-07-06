import type { PaginationResult } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getAll, getManyFrom } from "convex-helpers/server/relationships";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { article } from "./schema";

/**
 * Helper function to load authors for an article in the correct order
 */
async function load_authors_for_article(ctx: QueryCtx, articleId: Id<"articles">) {
	const authorLinks = await ctx.db
		.query("articles_to_authors")
		.withIndex("by_article_and_order", (q) => q.eq("article_id", articleId))
		.collect();

	const authors = await Promise.all(
		authorLinks.map(async (link) => {
			const author = await ctx.db.get(link.author_id);
			return author ? { ...author, order: link.order } : null;
		}),
	);

	return authors
		.filter((author): author is NonNullable<typeof author> => author !== null)
		.sort((a, b) => a.order - b.order);
}

/**
 * Helper function to load authors for multiple articles and apply author filtering
 */
async function load_authors_and_filter<T extends Doc<"articles">>(
	ctx: QueryCtx,
	articles: T[],
	authorFilter: string[],
) {
	const articlesWithAuthors = await Promise.all(
		articles.map(async (article) => {
			const authors = await load_authors_for_article(ctx, article._id);
			return {
				...article,
				authors,
			};
		}),
	);

	// Filter by authors if specified
	const hasAuthorFilter = authorFilter.length > 0;
	return hasAuthorFilter
		? articlesWithAuthors.filter((article) =>
			article.authors.some((author) => authorFilter.includes(author._id)),
		)
		: articlesWithAuthors;
}

/**
 * Get an article by its slug
 */
export const get_by_slug = query({
	args: { slug: v.string(), status: article.fields.status },
	handler: async (ctx, args) => {
		const article = await ctx.db
			.query("articles")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.order("desc")
			.filter((q) => q.eq("status", args.status ?? "published"))
			.first();

		if (!article) {
			return null;
		}

		// Use getManyFrom helper for cleaner code
		const authorLinks = await getManyFrom(
			ctx.db,
			"articles_to_authors",
			"by_article_and_order",
			article._id,
			"article_id",
		);

		// Get all authors in parallel using getAll helper
		const authorIds = authorLinks.map((link) => link.author_id);
		const authorsData = await getAll(ctx.db, authorIds);

		// Combine author data with order information
		const authors = authorLinks
			.map((link) => {
				const authorData = authorsData.find(
					(author) => author?._id === link.author_id,
				);
				return authorData ? { ...authorData, order: link.order } : null;
			})
			.filter((author): author is NonNullable<typeof author> => author !== null)
			.sort((a, b) => a.order - b.order);

		return {
			...article,
			authors,
		};
	},
});

/**
 * Unified search function that handles both regular queries and full-text search
 * with author and year filtering
 */
export const search_articles_unified = query({
	args: {
		search_term: v.string(),
		author_ids: v.array(v.string()),
		year: v.optional(v.number()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const hasSearchTerm = args.search_term.trim().length > 0;

		// Declare result with union type
		let result: PaginationResult<Doc<"articles">>;

		if (hasSearchTerm) {
			// Use full-text search when there's a search term
			const searchQuery = ctx.db
				.query("articles")
				.withSearchIndex("search_content_by_year", (q) => {
					let search = q
						.search("content_markdown", args.search_term)
						.eq("status", "published");
					if (args.year) {
						search = search.eq("published_year", args.year);
					}
					return search;
				});

			result = await searchQuery.paginate(args.paginationOpts);
		} else {
			// Use regular index when no search term
			const articlesQuery = ctx.db.query("articles");

			const indexedQuery = args.year
				? articlesQuery.withIndex("by_status_and_published_year", (q) =>
					q.eq("status", "published").eq("published_year", args.year),
				)
				: articlesQuery.withIndex("by_status_and_published_at", (q) =>
					q.eq("status", "published"),
				);

			result = await indexedQuery.order("desc").paginate(args.paginationOpts);
		}

		// Load authors for all articles and apply author filtering
		const filteredArticles = await load_authors_and_filter(
			ctx,
			result.page,
			args.author_ids,
		);

		return {
			...result,
			page: filteredArticles,
		};
	},
});
