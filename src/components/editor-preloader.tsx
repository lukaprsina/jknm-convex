"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { getUser } from "~/lib/auth/functions/getUser";

export function EditorPreloader() {
	const router = useRouter();
	const hasPreloadedRef = useRef(false);

	const { data: user, isLoading } = useQuery({
		queryKey: ["user"],
		queryFn: ({ signal }) => getUser({ signal }),
	});

	useEffect(() => {
		// Only preload if user is logged in, query is not loading, and we haven't preloaded yet
		if (user && !isLoading && !hasPreloadedRef.current) {
			hasPreloadedRef.current = true;

			const editorRoute = router.routesByPath["/editor"];
			Promise.all([
				router.loadRouteChunk(editorRoute),
				router.preloadRoute({ to: "/editor" }),
				import("platejs/react"),
				import("~/components/editor-kit"),
				import("~/components/ui/editor"),
			])
				.then(() => {
					if (import.meta.env.DEV) {
						console.log("Editor preloaded successfully!");
					}
				})
				.catch((error) => {
					if (import.meta.env.DEV) {
						console.error("Failed to preload editor:", error);
					}

					hasPreloadedRef.current = false;
				});
		}
	}, [user, isLoading, router]);

	// This component doesn't render anything
	return null;
}
