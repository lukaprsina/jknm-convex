import { createAuth } from "./auth";

// Export a static instance for Better Auth schema generation
// biome-ignore lint: no any
export const auth = createAuth({} as any);
