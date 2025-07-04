import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get authors for an article
 */
export const getAuthorsForArticle = query({
    args: { article_id: v.id("articles") },
    handler: async (ctx, args) => {
        const articlesToAuthors = await ctx.db
            .query("articles_to_authors")
            .withIndex("by_article", (q) => q.eq("article_id", args.article_id))
            .collect();

        const authorsWithOrder = [];
        for (const relation of articlesToAuthors) {
            const author = await ctx.db.get(relation.author_id);
            if (author) {
                authorsWithOrder.push({
                    ...author,
                    order: relation.order,
                });
            }
        }

        // Sort by order
        return authorsWithOrder.sort((a, b) => a.order - b.order);
    },
});

/**
 * Get articles for an author
 */
export const getArticlesForAuthor = query({
    args: { author_id: v.id("authors") },
    handler: async (ctx, args) => {
        const articlesToAuthors = await ctx.db
            .query("articles_to_authors")
            .withIndex("by_author", (q) => q.eq("author_id", args.author_id))
            .collect();

        const articles = [];
        for (const relation of articlesToAuthors) {
            const article = await ctx.db.get(relation.article_id);
            if (article) {
                articles.push(article);
            }
        }

        return articles;
    },
});

/**
 * Add an author to an article
 */
export const addAuthorToArticle = mutation({
    args: {
        article_id: v.id("articles"),
        author_id: v.id("authors"),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Check if the article exists
        const article = await ctx.db.get(args.article_id);
        if (!article) {
            throw new Error("Article not found");
        }

        // Check if the author exists
        const author = await ctx.db.get(args.author_id);
        if (!author) {
            throw new Error("Author not found");
        }

        // Check if the relationship already exists
        const existing = await ctx.db
            .query("articles_to_authors")
            .withIndex("by_article_and_author", (q) =>
                q.eq("article_id", args.article_id).eq("author_id", args.author_id)
            )
            .unique();

        if (existing) {
            throw new Error("Author is already associated with this article");
        }

        // If no order specified, use the next available order
        let order = args.order ?? 0;
        if (!args.order) {
            const existingRelations = await ctx.db
                .query("articles_to_authors")
                .withIndex("by_article", (q) => q.eq("article_id", args.article_id))
                .collect();

            order = existingRelations.length > 0
                ? Math.max(...existingRelations.map(r => r.order)) + 1
                : 0;
        }

        return await ctx.db.insert("articles_to_authors", {
            article_id: args.article_id,
            author_id: args.author_id,
            order,
        });
    },
});

/**
 * Remove an author from an article
 */
export const removeAuthorFromArticle = mutation({
    args: {
        article_id: v.id("articles"),
        author_id: v.id("authors"),
    },
    handler: async (ctx, args) => {
        const relation = await ctx.db
            .query("articles_to_authors")
            .withIndex("by_article_and_author", (q) =>
                q.eq("article_id", args.article_id).eq("author_id", args.author_id)
            )
            .unique();

        if (!relation) {
            throw new Error("Author is not associated with this article");
        }

        await ctx.db.delete(relation._id);
        return null;
    },
});

/**
 * Update author order for an article
 */
export const updateAuthorOrder = mutation({
    args: {
        article_id: v.id("articles"),
        author_id: v.id("authors"),
        order: v.number(),
    },
    handler: async (ctx, args) => {
        const relation = await ctx.db
            .query("articles_to_authors")
            .withIndex("by_article_and_author", (q) =>
                q.eq("article_id", args.article_id).eq("author_id", args.author_id)
            )
            .unique();

        if (!relation) {
            throw new Error("Author is not associated with this article");
        }

        await ctx.db.patch(relation._id, { order: args.order });
        return null;
    },
});
