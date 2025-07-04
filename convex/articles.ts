import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { article, create_draft_article_schema } from "./schema";
import { getAll, getManyFrom, getManyVia } from "convex-helpers/server/relationships"

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
            "article_id"
        );

        // Get all authors in parallel using getAll helper
        const authorIds = authorLinks.map(link => link.author_id);
        const authorsData = await getAll(ctx.db, authorIds);

        // Combine author data with order information
        const authors = authorLinks
            .map(link => {
                const authorData = authorsData.find(author => author?._id === link.author_id);
                return authorData ? { ...authorData, order: link.order } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a!.order - b!.order);

        return {
            ...article,
            authors
        };
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
        let query = ctx.db.query("articles");
        let new_query;

        if (args.year) {
            // Use the compound index for efficient year + status filtering
            new_query = query.withIndex("by_status_and_published_year", (q) =>
                q.eq("status", "published").eq("published_year", args.year)
            );
        } else {
            // Use status + published_at index for general published articles
            new_query = query.withIndex("by_status_and_published_at", (q) =>
                q.eq("status", "published")
            );
        }

        const result = await new_query.order("desc").paginate(args.pagination_opts);

        // Load authors for each article
        const articlesWithAuthors = await Promise.all(
            result.page.map(async (article) => {
                const authorLinks = await ctx.db
                    .query("articles_to_authors")
                    .withIndex("by_article_and_order", (q) => q.eq("article_id", article._id))
                    .collect();

                const authors = await Promise.all(
                    authorLinks.map(async (link) => {
                        const author = await ctx.db.get(link.author_id);
                        return author ? { ...author, order: link.order } : null;
                    })
                );

                return {
                    ...article,
                    authors: authors.filter(Boolean).sort((a, b) => a!.order - b!.order)
                };
            })
        );

        return {
            ...result,
            page: articlesWithAuthors
        };
    },
});

/**
 * Search articles by content
 */
export const search_published = query({
    args: {
        search_term: v.string(),
        pagination_opts: paginationOptsValidator,
        year: v.optional(v.number()), // Optional year filter
    },
    handler: async (ctx, args) => {
        let searchQuery = ctx.db.query("articles").withSearchIndex("search_content_by_year", (q) => {
            let search = q.search("content_markdown", args.search_term).eq("status", "published");
            if (args.year) {
                search = search.eq("published_year", args.year);
            }
            return search;
        });

        const result = await searchQuery.paginate(args.pagination_opts);

        // Load authors for each article
        const articlesWithAuthors = await Promise.all(
            result.page.map(async (article) => {
                const authorLinks = await ctx.db
                    .query("articles_to_authors")
                    .withIndex("by_article_and_order", (q) => q.eq("article_id", article._id))
                    .collect();

                const authors = await Promise.all(
                    authorLinks.map(async (link) => {
                        const author = await ctx.db.get(link.author_id);
                        return author ? { ...author, order: link.order } : null;
                    })
                );

                return {
                    ...article,
                    authors: authors.filter(Boolean).sort((a, b) => a!.order - b!.order)
                };
            })
        );

        return {
            ...result,
            page: articlesWithAuthors
        };
    },
});