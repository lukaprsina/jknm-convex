import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
	getAll,
	getManyFrom,
} from "convex-helpers/server/relationships";
import { query } from "./_generated/server";
import { article } from "./schema";

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
 * Get published articles with pagination
 */
export const get_paginated_published = query({
	args: {
		paginationOpts: paginationOptsValidator,
		year: v.optional(v.number()), // Optional year filter
	},
	handler: async (ctx, args) => {
		const articlesQuery = ctx.db.query("articles");

		const indexedQuery = args.year
			? articlesQuery.withIndex("by_status_and_published_year", (q) =>
				q.eq("status", "published").eq("published_year", args.year),
			)
			: articlesQuery.withIndex("by_status_and_published_at", (q) =>
				q.eq("status", "published"),
			);

		const result = await indexedQuery.order("desc").paginate(args.paginationOpts);

		// Load authors for each article
		const articlesWithAuthors = await Promise.all(
			result.page.map(async (article) => {
				const authorLinks = await ctx.db
					.query("articles_to_authors")
					.withIndex("by_article_and_order", (q) =>
						q.eq("article_id", article._id),
					)
					.collect();

				const authors = await Promise.all(
					authorLinks.map(async (link) => {
						const author = await ctx.db.get(link.author_id);
						return author ? { ...author, order: link.order } : null;
					}),
				);

				return {
					...article,
					authors: authors
						.filter((author): author is NonNullable<typeof author> => author !== null)
						.sort((a, b) => a.order - b.order),
				};
			}),
		);

		return {
			...result,
			page: articlesWithAuthors,
		};
	},
});

/**
 * Search articles by content
 */
export const search_published = query({
	args: {
		search_term: v.string(),
		paginationOpts: paginationOptsValidator,
		year: v.optional(v.number()), // Optional year filter
	},
	handler: async (ctx, args) => {
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

		const result = await searchQuery.paginate(args.paginationOpts);

		// Load authors for each article
		const articlesWithAuthors = await Promise.all(
			result.page.map(async (article) => {
				const authorLinks = await ctx.db
					.query("articles_to_authors")
					.withIndex("by_article_and_order", (q) =>
						q.eq("article_id", article._id),
					)
					.collect();

				const authors = await Promise.all(
					authorLinks.map(async (link) => {
						const author = await ctx.db.get(link.author_id);
						return author ? { ...author, order: link.order } : null;
					}),
				);

				return {
					...article,
					authors: authors
						.filter((author): author is NonNullable<typeof author> => author !== null)
						.sort((a, b) => a.order - b.order),
				};
			}),
		);

		return {
			...result,
			page: articlesWithAuthors,
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
		author_ids: v.array(v.id("authors")),
		year: v.optional(v.number()),
		paginationOpts: paginationOptsValidator,
	},
	returns: v.object({
		page: v.array(
			v.object({
				_id: v.id("articles"),
				_creationTime: v.number(),
				title: v.string(),
				slug: v.string(),
				status: article.fields.status,
				content_json: v.optional(v.any()),
				content_markdown: v.optional(v.string()),
				excerpt: v.optional(v.string()),
				view_count: v.number(),
				thumbnail_crop: v.optional(
					v.object({
						x: v.number(),
						y: v.number(),
						width: v.number(),
						height: v.number(),
					}),
				),
				legacy_id: v.optional(v.number()),
				updated_at: v.number(),
				created_at: v.number(),
				deleted_at: v.optional(v.number()),
				published_at: v.optional(v.number()),
				archived_at: v.optional(v.number()),
				published_year: v.optional(v.number()),
				authors: v.array(
					v.object({
						_id: v.id("authors"),
						_creationTime: v.number(),
						author_type: v.union(v.literal("member"), v.literal("guest")),
						name: v.string(),
						google_id: v.optional(v.string()),
						email: v.optional(v.string()),
						image: v.optional(v.string()),
						order: v.number(),
					}),
				),
			}),
		),
		isDone: v.boolean(),
		continueCursor: v.string(),
	}),
	handler: async (ctx, args) => {
		const hasSearchTerm = args.search_term.trim().length > 0;
		const hasAuthorFilter = args.author_ids.length > 0;

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

			const result = await searchQuery.paginate(args.paginationOpts);

			// Load authors for each article and apply author filtering
			const articlesWithAuthors = await Promise.all(
				result.page.map(async (article) => {
					const authorLinks = await ctx.db
						.query("articles_to_authors")
						.withIndex("by_article_and_order", (q) =>
							q.eq("article_id", article._id),
						)
						.collect();

					const authors = await Promise.all(
						authorLinks.map(async (link) => {
							const author = await ctx.db.get(link.author_id);
							return author ? { ...author, order: link.order } : null;
						}),
					);

					const validAuthors = authors
						.filter((author): author is NonNullable<typeof author> => author !== null)
						.sort((a, b) => a.order - b.order);

					return {
						...article,
						authors: validAuthors,
					};
				}),
			);

			// Filter by authors if specified
			const filteredArticles = hasAuthorFilter
				? articlesWithAuthors.filter((article) =>
					article.authors.some((author) =>
						args.author_ids.includes(author._id),
					),
				)
				: articlesWithAuthors;

			return {
				...result,
				page: filteredArticles,
			};
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

			const result = await indexedQuery.order("desc").paginate(args.paginationOpts);

			// Load authors for each article and apply author filtering
			const articlesWithAuthors = await Promise.all(
				result.page.map(async (article) => {
					const authorLinks = await ctx.db
						.query("articles_to_authors")
						.withIndex("by_article_and_order", (q) =>
							q.eq("article_id", article._id),
						)
						.collect();

					const authors = await Promise.all(
						authorLinks.map(async (link) => {
							const author = await ctx.db.get(link.author_id);
							return author ? { ...author, order: link.order } : null;
						}),
					);

					const validAuthors = authors
						.filter((author): author is NonNullable<typeof author> => author !== null)
						.sort((a, b) => a.order - b.order);

					return {
						...article,
						authors: validAuthors,
					};
				}),
			);

			// Filter by authors if specified
			const filteredArticles = hasAuthorFilter
				? articlesWithAuthors.filter((article) =>
					article.authors.some((author) =>
						args.author_ids.includes(author._id),
					),
				)
				: articlesWithAuthors;

			return {
				...result,
				page: filteredArticles,
			};
		}
	},
});
