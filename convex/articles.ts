import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

/**
 * Get an article by its slug
 */
export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const article = await ctx.db
            .query("articles")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();

        return article;
    },
});

/**
 * Get published articles with pagination
 */
export const getPublished = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("articles")
            .withIndex("by_status_and_published_at", (q) =>
                q.eq("status", "published")
            )
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

/**
 * Search articles by content
 */
export const searchArticles = query({
    args: {
        searchTerm: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("articles")
            .withSearchIndex("search_content", (q) =>
                q.search("content_markdown", args.searchTerm).eq("status", "published")
            )
            .paginate(args.paginationOpts);
    },
});

/**
 * Create a new article
 */
export const create = mutation({
    args: {
        title: v.string(),
        slug: v.string(),
        url: v.string(),
        status: v.union(
            v.literal("draft"),
            v.literal("published"),
            v.literal("archived"),
            v.literal("deleted")
        ),
        content_json: v.optional(v.any()),
        content_html: v.optional(v.string()),
        content_markdown: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        thumbnail_crop: v.optional(
            v.object({
                x: v.number(),
                y: v.number(),
                width: v.number(),
                height: v.number(),
            })
        ),
        meta_description: v.optional(v.string()),
        legacy_id: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        return await ctx.db.insert("articles", {
            ...args,
            view_count: 0,
            created_at: now,
            updated_at: now,
            published_at: args.status === "published" ? now : undefined,
        });
    },
});

/**
 * Update an article
 */
export const update = mutation({
    args: {
        id: v.id("articles"),
        title: v.optional(v.string()),
        slug: v.optional(v.string()),
        url: v.optional(v.string()),
        status: v.optional(
            v.union(
                v.literal("draft"),
                v.literal("published"),
                v.literal("archived"),
                v.literal("deleted")
            )
        ),
        content_json: v.optional(v.any()),
        content_html: v.optional(v.string()),
        content_markdown: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        thumbnail_crop: v.optional(
            v.object({
                x: v.number(),
                y: v.number(),
                width: v.number(),
                height: v.number(),
            })
        ),
        meta_description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const article = await ctx.db.get(id);

        if (!article) {
            throw new Error("Article not found");
        }

        const now = Date.now();
        const updatedData: any = {
            ...updates,
            updated_at: now,
        };

        // Set published_at when status changes to published
        if (updates.status === "published" && article.status !== "published") {
            updatedData.published_at = now;
        }

        // Set archived_at when status changes to archived
        if (updates.status === "archived" && article.status !== "archived") {
            updatedData.archived_at = now;
        }

        // Set deleted_at when status changes to deleted
        if (updates.status === "deleted" && article.status !== "deleted") {
            updatedData.deleted_at = now;
        }

        await ctx.db.patch(id, updatedData);
        return null;
    },
});

/**
 * Increment view count for an article
 */
export const incrementViewCount = mutation({
    args: { id: v.id("articles") },
    handler: async (ctx, args) => {
        const article = await ctx.db.get(args.id);

        if (!article) {
            throw new Error("Article not found");
        }

        await ctx.db.patch(args.id, {
            view_count: article.view_count + 1,
        });

        return null;
    },
});
