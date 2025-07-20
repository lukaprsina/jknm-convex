import { type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import type { author_validator } from "./schema";

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

export const sync_google_authors = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new Error("User must be authenticated to sync authors.");
		}

		ctx.scheduler.runAfter(0, internal.authors_google.get_users);
	},
});

type PatchExistingAuthor = Infer<typeof author_validator> & {
	_id: Id<"authors">;
};

export const diff_google_authors = internalMutation({
	args: {
		authors: v.array(
			v.object({
				name: v.string(),
				email: v.string(),
				google_id: v.string(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.query("authors").collect();

		const existingMap = new Map(existing.map((a) => [a.google_id, a]));

		const to_create: Infer<typeof author_validator>[] = [];
		const to_update: PatchExistingAuthor[] = [];

		for (const author of args.authors) {
			const existingAuthor = existingMap.get(author.google_id);

			if (existingAuthor) {
				if (
					existingAuthor.email === author.email &&
					existingAuthor.name === author.name
				) {
					continue;
				}

				to_update.push({
					...existingAuthor,
					name: author.name,
					email: author.email,
				});
			} else {
				to_create.push({
					name: author.name,
					email: author.email,
					google_id: author.google_id,
					author_type: "member",
					user_id: undefined, // newly created authors won't have a user_id yet
				});
			}
		}

		await Promise.all(
			to_create.map((author) => ctx.db.insert("authors", author)),
		);

		await Promise.all(
			to_update.map((author) =>
				ctx.db.patch(author._id, {
					name: author.name,
					email: author.email,
				}),
			),
		);

		console.log(
			`Synced ${to_create.length} new authors and updated ${to_update.length} existing authors.`,
		);
	},
});
