import type { PaginationResult } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Value } from "platejs";
import slugify from "slugify";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import {
	article_status_validator,
	article_validator,
	thumbnail_validator,
} from "./schema";

/**
 * Helper function to load authors for an article in the correct order
 */
async function load_metadata_for_article(
	ctx: QueryCtx,
	article: Doc<"articles">,
) {
	const author_links = await ctx.db
		.query("articles_to_authors")
		.withIndex("by_article_and_order", (q) => q.eq("article_id", article._id))
		.collect();

	const authors = await Promise.all(
		author_links.map(async (link) => {
			const author = await ctx.db.get(link.author_id);
			return author ? { ...author, order: link.order } : null;
		}),
	);

	const thumbnail_full = article.thumbnail?.image_id
		? await ctx.db.get(article.thumbnail.image_id)
		: null;

	return {
		authors: authors
			.filter((author): author is NonNullable<typeof author> => author !== null)
			.sort((a, b) => a.order - b.order),
		thumbnail_full,
	};
}

/**
 * Helper function to load authors for multiple articles and apply author filtering
 */
async function load_metadata_and_filter<T extends Doc<"articles">>(
	ctx: QueryCtx,
	articles: T[],
	authorFilter: string[],
) {
	const articlesWithMetadata = await Promise.all(
		articles.map(async (article) => {
			const metadata = await load_metadata_for_article(ctx, article);
			return {
				...article,
				...metadata,
			};
		}),
	);

	// Filter by authors if specified
	const hasAuthorFilter = authorFilter.length > 0;
	return hasAuthorFilter
		? articlesWithMetadata.filter((article) =>
				article.authors.some((author: { _id: string }) =>
					authorFilter.includes(author._id),
				),
			)
		: articlesWithMetadata;
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
					// .filter((q) => q.eq(q.field("status"), "published")) // TODO
					.first();

		if (!article) {
			console.warn(`Article with slug "${args.slug}" not found.`, { args });
			return null;
		}

		const metadata = await load_metadata_for_article(ctx, article);

		return {
			...article,
			...metadata,
		};
	},
});

export const get_by_legacy_id = query({
	args: { legacy_id: v.number() },
	handler: async (ctx, args) => {
		const article = await ctx.db
			.query("articles")
			.withIndex("by_legacy_id", (q) => q.eq("legacy_id", args.legacy_id))
			.first();
		return article;
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
		const has_search_term = args.search_term.trim().length > 0;

		// Declare result with union type
		let result: PaginationResult<Doc<"articles">>;

		if (has_search_term) {
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
			const articles_query = ctx.db.query("articles");

			const indexed_query = args.year
				? articles_query.withIndex("by_status_and_published_year", (q) =>
						q.eq("status", "published").eq("published_year", args.year),
					)
				: articles_query.withIndex("by_status_and_published_at", (q) =>
						q.eq("status", "published"),
					);

			result = await indexed_query.order("desc").paginate(args.paginationOpts);
		}

		// Load authors for all articles and apply author filtering
		const filtered_articles = await load_metadata_and_filter(
			ctx,
			result.page,
			args.author_ids,
		);

		return {
			...result,
			page: filtered_articles,
		};
	},
});

export const get_latest_of_status = query({
	args: {
		status: article_validator.fields.status,
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();

		if (!user_id) {
			throw new Error(
				`User must be authenticated to get articles of status ${args.status}.`,
			);
		}

		const articles_with_metadata = await get_articles_with_status_and_limit(
			ctx,
			args,
		);

		return articles_with_metadata;
	},
});

export type ArticlesByStatus = Record<
	typeof article_status_validator.type,
	Doc<"articles">[]
>;

export const get_latest_of_every_status = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const articles_with_status = await Promise.all(
			article_status_validator.members.map((status) =>
				get_articles_with_status_and_limit(ctx, {
					status: status.value,
					limit: args.limit,
				}),
			),
		);

		const all_articles = articles_with_status.reduce<ArticlesByStatus>(
			(acc, articles, idx) => {
				const status = article_status_validator.members[idx].value;
				acc[status] = articles;
				return acc;
			},
			{} as ArticlesByStatus,
		);

		return all_articles;
	},
});

async function get_articles_with_status_and_limit(
	ctx: QueryCtx,
	args: {
		limit?: number | undefined;
		status: typeof article_status_validator.type;
	},
) {
	const article_query = ctx.db
		.query("articles")
		.withIndex("by_status_and_updated_at", (q) => q.eq("status", args.status))
		.order("desc");

	const articles = args.limit
		? await article_query.take(args.limit)
		: await article_query.collect();

	// Load authors for each draft article
	const articles_with_metadata = await Promise.all(
		articles.map(async (draft) => {
			const metadata = await load_metadata_for_article(ctx, draft);
			return {
				...draft,
				...metadata,
			};
		}),
	);

	return articles_with_metadata;
}

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
		const user = await ctx.auth.getUserIdentity();

		if (!user) {
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
			created_by: user.subject as Id<"users">,
		});

		const slug = new_draft_id.toString();

		await ctx.db.patch(new_draft_id, {
			slug,
		});

		return { slug, id: new_draft_id };
	},
});

async function update_article(
	ctx: MutationCtx,
	article_id: Id<"articles">,
	content_json: string,
	additional_fields: Partial<Doc<"articles">> = {},
	author_ids: string[] | undefined = undefined,
) {
	let title = "Neimenovana novica"; // Default title
	let parsed_content: Value;

	try {
		parsed_content = JSON.parse(content_json) as Value;
	} catch (error) {
		throw new Error(`Failed to parse content JSON: ${error}`);
	}

	if (Array.isArray(parsed_content) && parsed_content.length > 0) {
		const firstNode = parsed_content[0];
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
	await ctx.db.patch(article_id, {
		title,
		content_json,
		updated_at: Date.now(),
		...additional_fields,
	});

	// If author_ids supplied, replace existing article->author links
	if (Array.isArray(author_ids)) {
		// Delete previous authors for this article
		const previous_authors = await ctx.db
			.query("articles_to_authors")
			.withIndex("by_article_and_order", (q) => q.eq("article_id", article_id))
			.collect();

		for (const author_link of previous_authors) {
			await ctx.db.delete(author_link._id);
		}

		// Insert new authors into the join table
		for (let i = 0; i < author_ids.length; i++) {
			const author_id = author_ids[i];

			await ctx.db.insert("articles_to_authors", {
				article_id,
				author_id: author_id as Id<"authors">,
				order: i,
			});
		}
	}

	return { title, parsed_content };
}

export const update_draft = mutation({
	args: {
		id: v.id("articles"),
		content_json: v.string(),
		thumbnail: v.optional(thumbnail_validator),
		author_ids: v.array(v.string()),
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

		// Use the helper function to update the article
		await update_article(
			ctx,
			args.id,
			args.content_json,
			{ thumbnail: args.thumbnail },
			args.author_ids,
		);
	},
});

export const publish_draft = mutation({
	args: {
		article_id: v.id("articles"),
		thumbnail: v.optional(thumbnail_validator),
		author_ids: v.array(v.string()),
		published_at: v.optional(v.number()),
		content_json: v.string(),
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error("User must be authenticated to update a draft article.");
		}

		const article = await ctx.db.get(args.article_id);

		if (!article || article.status !== "draft") {
			throw new Error("Article not found or is not a draft.");
		}

		const published_at = args.published_at ?? Date.now();

		// Use the helper function to parse content, extract title and update authors/thumbnail
		const { title } = await update_article(
			ctx,
			args.article_id,
			args.content_json,
			{
				thumbnail: args.thumbnail,
				status: "published",
				published_at,
				published_year: new Date(published_at).getFullYear(),
				slug: "ERROR", //slugify_title("", args.article_id), // Will be updated below with actual title
			},
			args.author_ids,
		);

		// Update slug with the actual title
		const slug = slugify_title(title, args.article_id);
		await ctx.db.patch(args.article_id, { slug });

		return ctx.db.get(args.article_id);
	},
});

export const copy_published_into_draft = mutation({
	args: {
		article_id: v.id("articles"),
	},
	handler: async (ctx, args) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new Error(
				"User must be authenticated to copy a published article.",
			);
		}

		const article = await ctx.db.get(args.article_id);
		if (!article || article.status !== "published") {
			throw new Error("Article not found or is not published.");
		}

		// Create a new draft article
		const new_draft_id = await ctx.db.insert("articles", {
			status: "draft",
			title: article.title,
			slug: "ERROR",
			content_json: article.content_json,
			view_count: 0,
			updated_at: Date.now(),
			created_by: user.subject as Id<"users">,
		});

		await ctx.db.patch(new_draft_id, {
			slug: new_draft_id.toString(),
		});

		// Copy authors
		const authors = await ctx.db
			.query("articles_to_authors")
			.withIndex("by_article_and_order", (q) =>
				q.eq("article_id", args.article_id),
			)
			.collect();

		for (const author_link of authors) {
			await ctx.db.insert("articles_to_authors", {
				article_id: new_draft_id,
				author_id: author_link.author_id,
				order: author_link.order,
			});
		}

		// Copy media links
		const media_links = await ctx.db
			.query("media_to_articles")
			.withIndex("by_article_and_order", (q) =>
				q.eq("article_id", args.article_id),
			)
			.collect();

		for (const media_link of media_links) {
			await ctx.db.insert("media_to_articles", {
				article_id: new_draft_id,
				media_id: media_link.media_id,
				order: media_link.order,
			});
		}

		// We don't need to copy actual B2 files

		return new_draft_id;
	},
});

export const delete_article = mutation({
	args: {
		article_id: v.id("articles"),
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error("User must be authenticated to delete an article.");
		}

		const article = await ctx.db.get(args.article_id);
		if (!article) {
			throw new Error("Article not found.");
		}

		// Delete author links
		const author_links = await ctx.db
			.query("articles_to_authors")
			.withIndex("by_article_and_order", (q) =>
				q.eq("article_id", args.article_id),
			)
			.collect();

		for (const link of author_links) {
			await ctx.db.delete(link._id);
		}

		// Delete media links
		const media_links = await ctx.db
			.query("media_to_articles")
			.withIndex("by_article_and_order", (q) =>
				q.eq("article_id", args.article_id),
			)
			.collect();

		for (const link of media_links) {
			await ctx.db.delete(link._id);
		}

		// Delete the article
		await ctx.db.delete(args.article_id);
	},
});

export const delete_everything = mutation({
	handler: async (ctx) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error("User must be authenticated to delete everything.");
		}

		/* if (process.env.NODE_ENV !== "development") {
			console.warn("process.env.NODE_ENV =", process.env.NODE_ENV);
			throw new Error("Deleting everything is only allowed in development.");
		} */

		// Delete all articles
		const articles = await ctx.db.query("articles").collect();
		for (const article of articles) {
			await ctx.db.delete(article._id);
		}

		// Delete all author links
		const articles_to_authors = await ctx.db
			.query("articles_to_authors")
			.collect();
		for (const link of articles_to_authors) {
			await ctx.db.delete(link._id);
		}

		// Delete all media
		const media = await ctx.db.query("media").collect();
		for (const item of media) {
			await ctx.db.delete(item._id);
		}

		// Delete all media links
		const media_to_articles = await ctx.db.query("media_to_articles").collect();
		for (const link of media_to_articles) {
			await ctx.db.delete(link._id);
		}

		await ctx.scheduler.runAfter(0, internal.media_sharp.empty_bucket);

		console.log("All articles, authors, media, and B2 bucket cleared.", {
			user_id,
			article_count: articles.length,
			author_link_count: articles_to_authors.length,
			media_count: media.length,
			media_link_count: media_to_articles.length,
		});
	},
});
