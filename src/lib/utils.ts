import { reactStartHelpers } from "@convex-dev/better-auth/react-start";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createAuth } from "~/lib/auth";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const { fetchSession, reactStartHandler, getCookieName } =
	reactStartHelpers(createAuth, {
		convexSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL,
	});
