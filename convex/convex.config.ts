import { defineApp } from "convex/server";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";
const app = defineApp();

app.use(shardedCounter);
app.use(betterAuth);

export default app;
