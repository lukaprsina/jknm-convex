import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { DefaultCatchBoundary } from "./components/default-catch-boundary";
import { NotFound } from "./components/not-found";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
	const CONVEX_URL = import.meta.env.VITE_CONVEX_URL!;
	if (!CONVEX_URL) {
		throw new Error("missing VITE_CONVEX_URL envar");
	}

	const convex = new ConvexReactClient(CONVEX_URL, {
		unsavedChangesWarning: false,
	});

	// don't pass CONVEX_URL, use convex.client directly
	// otherwise it creates a new ConvexQueryClient instance
	const convexQueryClient = new ConvexQueryClient(convex);

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
				refetchOnWindowFocus: false,
				staleTime: 1000 * 60 * 2, // 2 minutes
			},
		},
	});

	convexQueryClient.connect(queryClient);

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			defaultErrorComponent: DefaultCatchBoundary,
			defaultNotFoundComponent: NotFound,
			context: { queryClient, convexClient: convex, convexQueryClient },
			// react-query will handle data fetching & caching
			// https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#passing-all-loader-events-to-an-external-cache
			defaultPreloadStaleTime: 0,
			defaultStructuralSharing: true,
			scrollRestoration: true,
			Wrap: ({ children }) => (
				<ConvexProvider client={convexQueryClient.convexClient}>
					{children}
				</ConvexProvider>
			),
		}),
		queryClient,
	);

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
}
