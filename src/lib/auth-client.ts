import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const auth_client = createAuthClient({
    plugins: [
        convexClient(),
    ],
});