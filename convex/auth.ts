import {
	type AuthFunctions,
	BetterAuth,
	convexAdapter,
	type PublicAuthFunctions,
} from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { api, components, internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { type GenericCtx, query } from "./_generated/server";

// Typesafe way to pass Convex functions defined in this file
const authFunctions: AuthFunctions = internal.auth;
const publicAuthFunctions: PublicAuthFunctions = api.auth;

// Initialize the component
export const betterAuthComponent = new BetterAuth(components.betterAuth, {
	authFunctions,
	publicAuthFunctions,
	verbose: true,
});

export const createAuth = (ctx: GenericCtx) =>
	// Configure your Better Auth instance here
	betterAuth({
		// All auth requests will be proxied through your TanStack Start server
		baseURL: process.env.SITE_URL!, // "http://localhost:3000" or "https://new.jknm.site"
		database: convexAdapter(ctx, betterAuthComponent),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		user: {
			deleteUser: {
				enabled: true,
			},
		},
		account: {
			accountLinking: {
				enabled: true,
			},
		},
		/* session: {
			expiresIn: 60 * 60 * 24 * 365, // 1 year
			updateAge: 60 * 60 * 24 * 30, // refresh every 30 days
			disableSessionRefresh: false, // allow auto-refresh
			freshAge: 0, // disable freshness check
			cookieCache: {
				enabled: true,
				maxAge: 60 * 60 * 24 * 30, // cache for 30 days
			},
		}, */
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID!,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			},
		},
		plugins: [
			// The Convex plugin is required
			convex(),
		],
	});

// TODO: Convex functions should not be imported in the browser. This will throw an error in future versions of `convex`. If this is a false negative, please report it to Convex support.
// These are required named exports
export const { createUser, updateUser, deleteUser, createSession } =
	betterAuthComponent.createAuthFunctions<DataModel>({
		// Must create a user and return the user id
		onCreateUser: async (ctx /* user */) => {
			return ctx.db.insert("users", {});
		},

		// Delete the user when they are deleted from Better Auth
		onDeleteUser: async (ctx, userId) => {
			await ctx.db.delete(userId as Id<"users">);
		},
	});

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		// Get user data from Better Auth - email, name, image, etc.
		const userMetadata = await betterAuthComponent.getAuthUser(ctx);
		if (!userMetadata) {
			return null;
		}
		// Get user data from your application's database
		// (skip this if you have no fields in your users table schema)
		const user = await ctx.db.get(userMetadata.userId as Id<"users">);
		return {
			...user,
			...userMetadata,
		};
	},
});
