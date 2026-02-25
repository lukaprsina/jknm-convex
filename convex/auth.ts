import {
	type AuthFunctions,
	createClient,
	type GenericCtx,
} from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import betterAuthSchema from "./betterAuth/schema";

const siteUrl = process.env.SITE_URL!;

const authFunctions: AuthFunctions = internal.auth;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof betterAuthSchema>(
	components.betterAuth,
	{
		authFunctions,
		local: {
			schema: betterAuthSchema,
		},
		verbose: false,
		triggers: {
			user: {
				onCreate: async (ctx, authUser) => {
					await ctx.db.insert("users", {
						email: authUser.email,
						authId: authUser._id,
					});
				},
				onUpdate: async (ctx, newUser, oldUser) => {
					if (oldUser.email === newUser.email) {
						return;
					}
					const appUser = await ctx.db
						.query("users")
						.withIndex("by_authId", (q) => q.eq("authId", newUser._id))
						.unique();
					if (!appUser) return;
					await ctx.db.patch(appUser._id, { email: newUser.email });
				},
				onDelete: async (ctx, authUser) => {
					const appUser = await ctx.db
						.query("users")
						.withIndex("by_authId", (q) => q.eq("authId", authUser._id))
						.unique();
					if (!appUser) return;
					await ctx.db.delete(appUser._id);
				},
			},
		},
	},
);

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const { getAuthUser } = authComponent.clientApi();

export const createAuthOptions = (
	ctx: GenericCtx<DataModel>,
): BetterAuthOptions =>
	({
		baseURL: siteUrl,
		database: authComponent.adapter(ctx),
		// trustedOrigins: [siteUrl],
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID as string,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			},
		},
		account: {
			accountLinking: {
				enabled: true,
			},
		},
		user: {
			deleteUser: {
				enabled: true,
			},
		},
		plugins: [
			convex({
				authConfig,
				jwksRotateOnTokenGenerationError: true,
			}),
		],
	}) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth(createAuthOptions(ctx));
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return authComponent.getAuthUser(ctx);
	},
});
