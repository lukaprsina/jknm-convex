import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all authors
 */
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("authors").collect();
    },
});

/**
 * Get an author by ID
 */
export const getById = query({
    args: { id: v.id("authors") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * Get an author by Google ID
 */
export const getByGoogleId = query({
    args: { google_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("authors")
            .withIndex("by_google_id", (q) => q.eq("google_id", args.google_id))
            .unique();
    },
});

/**
 * Get an author by email
 */
export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("authors")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

/**
 * Create a new author
 */
export const create = mutation({
    args: {
        author_type: v.union(v.literal("member"), v.literal("guest")),
        name: v.string(),
        google_id: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("authors", args);
    },
});

/**
 * Update an author
 */
export const update = mutation({
    args: {
        id: v.id("authors"),
        author_type: v.optional(v.union(v.literal("member"), v.literal("guest"))),
        name: v.optional(v.string()),
        google_id: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const author = await ctx.db.get(id);

        if (!author) {
            throw new Error("Author not found");
        }

        await ctx.db.patch(id, updates);
        return null;
    },
});

/**
 * Delete an author
 */
export const remove = mutation({
    args: { id: v.id("authors") },
    handler: async (ctx, args) => {
        const author = await ctx.db.get(args.id);

        if (!author) {
            throw new Error("Author not found");
        }

        // Check if author has any associated articles
        const articlesToAuthors = await ctx.db
            .query("articles_to_authors")
            .withIndex("by_author", (q) => q.eq("author_id", args.id))
            .collect();

        if (articlesToAuthors.length > 0) {
            throw new Error("Cannot delete author with associated articles");
        }

        await ctx.db.delete(args.id);
        return null;
    },
});
