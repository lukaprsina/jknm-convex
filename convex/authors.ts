import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get all authors for the filter dropdown
 */
export const get_all = query({
    args: {},
    handler: async (ctx) => {
        const authors = await ctx.db
            .query("authors")
            .withIndex("by_name")
            .collect();

        const result = authors.map((author) => ({
            _id: author._id,
            name: author.name,
            author_type: author.author_type,
        }));

        // result.

        return result;
    },
});

/**
 * Get author by ID
 */
export const get_by_id = query({
    args: { id: v.id("authors") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
