import {
    BetterAuth,
    convexAdapter,
    type AuthFunctions,
} from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components, internal } from "./_generated/api";
import { query, type GenericCtx } from "./_generated/server";
import type { Id, DataModel } from "./_generated/dataModel";
import { reactStartCookies } from "better-auth/react-start";

// Typesafe way to pass Convex functions defined in this file
const authFunctions: AuthFunctions = internal.auth;

// Initialize the component
export const betterAuthComponent = new BetterAuth(
    components.betterAuth,
    {
        authFunctions,
    }
);

export const createAuth = (ctx: GenericCtx) =>
    // Configure your Better Auth instance here
    betterAuth({
        // All auth requests will be proxied through your TanStack Start server
        baseURL: "http://localhost:3000",
        database: convexAdapter(ctx, betterAuthComponent),

        /* // Simple non-verified email/password to get started
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
        }, */
        session: {
            expiresIn: 60 * 60 * 24 * 365, // 1 year
            updateAge: 60 * 60 * 24 * 30,  // refresh every 30 days
            disableSessionRefresh: false,  // allow auto-refresh
            freshAge: 0,                   // disable freshness check
            cookieCache: {
                enabled: true,
                maxAge: 60 * 60 * 24 * 30    // cache for 30 days
            }
        },
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            }
        },
        plugins: [
            // The Convex plugin is required
            convex(),
        ],
    });

// These are required named exports
export const {
    createUser,
    updateUser,
    deleteUser,
    createSession,
} =
    betterAuthComponent.createAuthFunctions<DataModel>({
        // Must create a user and return the user id
        onCreateUser: async (ctx, user) => {
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