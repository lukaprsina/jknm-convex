import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { article, create_draft_article_schema } from "./schema";
import { getManyVia } from "convex-helpers/server/relationships"

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

        return article;
    },
});

/**
 * Get published articles with pagination
 */
export const get_paginated_published = query({
    args: {
        pagination_opts: paginationOptsValidator,
        year: v.optional(v.number()), // Optional year filter
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("articles")
            .withIndex("by_published_at")
            .filter(q => q.eq("status", "published"))
            .order("desc")
            .paginate(args.pagination_opts);
    },
});

/**
 * Search articles by content
 */
export const search = query({
    args: {
        search_term: v.string(),
        pagination_opts: paginationOptsValidator,
        year: v.optional(v.number()), // Optional year filter
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("articles")
            .withSearchIndex("search_content", (q) =>
                q.search("content_markdown", args.search_term).eq("status", "published")
            )
            .paginate(args.pagination_opts);
    },
});