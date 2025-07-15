import type { GenericCtx } from "@convex/_generated/server";
import { betterAuthComponent } from "@convex/auth";
import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";

export const createAuth = (ctx: GenericCtx) =>
	betterAuth({
		baseURL: process.env.SITE_URL,
		database: convexAdapter(ctx, betterAuthComponent),
		account: {
			accountLinking: {
				enabled: true,
			},
		},
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID as string,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			},
		},
		user: {
			deleteUser: {
				enabled: true,
			},
		},
		plugins: [convex()],
	});
