// convex/deleteEverything.ts
import { internal } from "./_generated/api";
import type { TableNames } from "./_generated/dataModel";
import { internalMutation, mutation } from "./_generated/server";

// generic batched deletion helper
function makeBatchDeleter(
	table: TableNames,
	field: keyof typeof internal.delete_everything,
) {
	return internalMutation(
		async (
			ctx,
			{ cursor, numItems }: { cursor: string | null; numItems: number },
		) => {
			const { page, isDone, continueCursor } = await ctx.db
				.query(table)
				.paginate({ cursor, numItems });

			for (const doc of page) {
				await ctx.db.delete(doc._id);
			}

			if (!isDone) {
				await ctx.scheduler.runAfter(0, internal.delete_everything[field], {
					cursor: continueCursor,
					numItems,
				});
			}
		},
	);
}

// one batch deleter per table
export const deleteArticlesBatch = makeBatchDeleter(
	"articles",
	"deleteArticlesBatch",
);
export const deleteArticlesToAuthorsBatch = makeBatchDeleter(
	"articles_to_authors",
	"deleteArticlesToAuthorsBatch",
);
export const deleteMediaBatch = makeBatchDeleter("media", "deleteMediaBatch");
export const deleteMediaToArticlesBatch = makeBatchDeleter(
	"media_to_articles",
	"deleteMediaToArticlesBatch",
);

// orchestration: user calls this
export const delete_everything = mutation({
	handler: async (ctx) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id)
			throw new Error("User must be authenticated to delete everything");

		const batchSize = 300;

		await ctx.scheduler.runAfter(
			0,
			internal.delete_everything.deleteArticlesBatch,
			{
				cursor: null,
				numItems: batchSize,
			},
		);
		await ctx.scheduler.runAfter(
			0,
			internal.delete_everything.deleteArticlesToAuthorsBatch,
			{
				cursor: null,
				numItems: batchSize,
			},
		);
		await ctx.scheduler.runAfter(
			0,
			internal.delete_everything.deleteMediaBatch,
			{
				cursor: null,
				numItems: batchSize,
			},
		);
		await ctx.scheduler.runAfter(
			0,
			internal.delete_everything.deleteMediaToArticlesBatch,
			{
				cursor: null,
				numItems: batchSize,
			},
		);

		// also kick the bucket clear
		await ctx.scheduler.runAfter(0, internal.media_sharp.empty_bucket);

		console.log("delete_everything triggered", { user_id });
	},
});
