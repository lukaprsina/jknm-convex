import type { PaginationResult } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getAll, getManyFrom } from "convex-helpers/server/relationships";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";

/**
 * Get an article by its slug
 */
export const get_by_slug = query({
	args: { slug: v.string(), user_id: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const article_unfiltered = ctx.db
			.query("articles")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.order("desc")

		const article = args.user_id ? await article_unfiltered.first() : await article_unfiltered
			.filter((q) => q.eq("status", "published"))
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

export const get_all_drafts = query({
	args: {},
	handler: async (ctx) => {
		const drafts = await ctx.db
			.query("articles")
			.withIndex("by_status_and_updated_at", (q) => q.eq("status", "draft"))
			.order("desc")
			.collect();

		// Load authors for each draft article
		const draftsWithAuthors = await Promise.all(
			drafts.map(async (draft) => {
				const authors = await load_authors_for_article(ctx, draft._id);
				return {
					...draft,
					authors,
				};
			})
		);

		return draftsWithAuthors;
	},
});

export const get_draft_by_slug = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const drafts = await ctx.db
			.query("articles")
			.withIndex("by_status_and_updated_at", (q) => q.eq("status", "draft"))
			.order("desc")
			.collect();

		const draft = await ctx.db
			.query("articles")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			// .filter((q) => q.eq("status", "draft"))
			.first();

		// console.log("Drafts found:", drafts.map((d) => d.slug));
		// console.log("Draft found:", "Draft by slug:", draft?.slug);

		if (!draft) {
			throw new Error(`Draft with slug "${args.slug}" not found.`);
		}

		// Load authors for the draft article
		const authors = await load_authors_for_article(ctx, draft._id);

		return {
			...draft,
			authors,
		};
	},
});



export const create_draft = mutation({
	args: {},
	handler: async (ctx) => {
		const user_id = await ctx.auth.getUserIdentity();

		if (!user_id) {
			throw new Error("User must be authenticated to create a draft article.");
		}

		const new_draft_id = await ctx.db.insert("articles", {
			status: "draft",
			title: "Neimenovana novica",
			slug: "",
			content_markdown: "# Neimenovana novica",
			view_count: 0,
			updated_at: Date.now(),
			created_at: Date.now()
		});

		const slug = `neimenovana-novica-${new_draft_id}`

		await ctx.db.patch(new_draft_id, {
			slug,
		});

		return slug;
	},
});

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