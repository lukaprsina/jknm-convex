import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const auth_client = createAuthClient({
	plugins: [convexClient()],
});
