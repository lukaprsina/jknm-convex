import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get all authors for the filter dropdown
 */
export const get_all = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("authors"),
            name: v.string(),
            author_type: v.union(v.literal("member"), v.literal("guest")),
        }),
    ),
    handler: async (ctx) => {
        const authors = await ctx.db
            .query("authors")
            .withIndex("by_name")
            .collect();

        return authors.map((author) => ({
            _id: author._id,
            name: author.name,
            author_type: author.author_type,
        }));
    },
});

/**
 * Get author by ID
 */
export const get_by_id = query({
    args: { id: v.id("authors") },
    returns: v.union(
        v.object({
            _id: v.id("authors"),
            _creationTime: v.number(),
            author_type: v.union(v.literal("member"), v.literal("guest")),
            name: v.string(),
            google_id: v.optional(v.string()),
            email: v.optional(v.string()),
            image: v.optional(v.string()),
        }),
        v.null(),
    ),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
