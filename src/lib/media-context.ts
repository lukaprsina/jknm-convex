import type { Doc } from "@convex/_generated/dataModel";
import { createContext } from "react";

export const MediaContext = createContext<{
	media_map: Map<string, Doc<"media">>;
}>({ media_map: new Map() });
