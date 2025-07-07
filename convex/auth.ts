import Google from "@auth/core/providers/google";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const current_user = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);

		if (userId === null) {
			return null;
		}

		return await ctx.db.get(userId);
	},
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [Google],
});
