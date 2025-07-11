import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { reactStartHelpers } from "@convex-dev/better-auth/react-start";
import { createAuthClient } from "better-auth/react";
import { createAuth } from "convex/auth";

export const auth_client = createAuthClient({
	plugins: [convexClient()],
});

// For TanStack you'll also want to export some framework
// helpers here
export const { fetchSession, reactStartHandler, getCookieName } =
	reactStartHelpers(createAuth, {
		convexSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL,
	});
