import type { PaginationResult } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Value } from "platejs";
import slugify from "slugify";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { article_validator } from "./schema";

/**
 * Helper function to load authors for an article in the correct order
 */
async function load_authors_for_article(
	ctx: QueryCtx,
	articleId: Id<"articles">,
) {
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
	args: { slug: article_validator.fields.slug },
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();

		const article_unfiltered = ctx.db
			.query("articles")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.order("desc");

		const article = user_id
			? await article_unfiltered.first()
			: await article_unfiltered
					.filter((q) => q.eq(q.field("status"), "published"))
					.first();

		if (!article) {
			console.warn(`Article with slug "${args.slug}" not found.`, { args });
			return null;
		}

		const authors = await load_authors_for_article(ctx, article._id);

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

export const get_all_of_status = query({
	args: {
		status: article_validator.fields.status,
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		const current_user = await ctx.runQuery(api.auth.getCurrentUser);

		console.log(
			`Fetching articles with status "${args.status}" for user ${user_id}.`,
			current_user,
		);

		if (!user_id) {
			throw new Error(
				`User must be authenticated to get articles of status ${args.status}.`,
			);
		}

		const drafts = await ctx.db
			.query("articles")
			.withIndex("by_status_and_updated_at", (q) => q.eq("status", args.status))
			.order("desc")
			.collect();

		// Load authors for each draft article
		const drafts_with_authors = await Promise.all(
			drafts.map(async (draft) => {
				const authors = await load_authors_for_article(ctx, draft._id);
				return {
					...draft,
					authors,
				};
			}),
		);

		return drafts_with_authors;
	},
});

function slugify_title(title: string, id: Id<"articles">): string {
	const new_title = `${title ?? "Neimenovana novica"}-${id}`;

	return slugify(new_title, {
		lower: true,
		strict: true,
		replacement: "-",
		remove: /[*+~.();'"!:@]/g,
	});
}

export const create_draft = mutation({
	args: {},
	handler: async (ctx) => {
		const user_id = await ctx.auth.getUserIdentity();

		if (!user_id) {
			throw new Error("User must be authenticated to create a draft article.");
		}

		const title = "Neimenovana novica"; // Default title

		const new_draft_id = await ctx.db.insert("articles", {
			status: "draft",
			title,
			slug: "ERROR",
			content_json: JSON.stringify([
				{
					type: "h1",
					children: [{ text: title }],
				},
			]),
			view_count: 0,
			updated_at: Date.now(),
			created_at: Date.now(),
		});

		const slug = new_draft_id;

		await ctx.db.patch(new_draft_id, {
			slug,
		});

		return slug;
	},
});

export const update_draft = mutation({
	args: {
		id: v.id("articles"),
		content_json: v.string(),
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error("User must be authenticated to update a draft article.");
		}

		const article = await ctx.db.get(args.id);

		if (!article || article.status !== "draft") {
			throw new Error("Article not found or is not a draft.");
		}

		let title = "Neimenovana novica"; // Default title
		let content_json: Value | undefined;
		try {
			content_json = JSON.parse(args.content_json);
		} catch (error) {
			throw new Error(`Failed to parse content JSON: ${error}`);
		}

		if (Array.isArray(content_json) && content_json.length > 0) {
			const firstNode = content_json[0];
			if (firstNode.type === "h1" && firstNode.children.length > 0) {
				const descendant = firstNode.children[0];
				title = descendant.text as string;
			} else {
				throw new Error("First node is not an H1 with text children.");
			}
		} else {
			throw new Error("Content JSON is not a valid array or is empty.");
		}

		// Update the article with the new values
		ctx.db.patch(article._id, {
			title: title,
			content_json: args.content_json ?? article.content_json,
			updated_at: Date.now(),
		});
	},
});

export const publish_draft = mutation({
	args: {
		id: v.id("articles"),
		content_json: v.string(),
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error("User must be authenticated to update a draft article.");
		}

		const article = await ctx.db.get(args.id);

		if (!article || article.status !== "draft") {
			throw new Error("Article not found or is not a draft.");
		}

		let title = "Neimenovana novica"; // Default title
		let slug = slugify_title(title, article._id);
		let content_json: Value | undefined;

		try {
			content_json = JSON.parse(args.content_json);
		} catch (error) {
			throw new Error(`Failed to parse content JSON: ${error}`);
		}

		if (Array.isArray(content_json) && content_json.length > 0) {
			const firstNode = content_json[0];
			if (firstNode.type === "h1" && firstNode.children.length > 0) {
				const descendant = firstNode.children[0];
				title = descendant.text as string;
				slug = slugify_title(title, article._id);
			} else {
				throw new Error("First node is not an H1 with text children.");
			}
		} else {
			throw new Error("Content JSON is not a valid array or is empty.");
		}

		// Update the article with the new values
		ctx.db.patch(article._id, {
			title: title,
			slug: slug,
			content_json: args.content_json,
			status: "published",
			published_at: Date.now(),
			published_year: new Date().getFullYear(),
			updated_at: Date.now(),
		});
	},
});
