/// <reference types="vite/client" />

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
	fetchSession,
	getCookieName,
} from "@convex-dev/better-auth/react-start";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools/production";
import {
	createRootRouteWithContext,
	getRouteApi,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getWebRequest } from "@tanstack/react-start/server";
import type { ConvexReactClient } from "convex/react";
import { Toaster } from "react-hot-toast";
import appCss from "~/app.css?url";
import { DefaultCatchBoundary } from "~/components/default-catch-boundary";
import { NotFound } from "~/components/not-found";
import { auth_client } from "~/lib/auth-client";
import { seo } from "~/utils/seo";
import { createAuth } from "../../convex/auth";

// Server side session request
const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const sessionCookieName = await getCookieName(createAuth);
	const token = getCookie(sessionCookieName);
	const request = getWebRequest();
	const { session } = await fetchSession(createAuth, request);
	return {
		userId: session?.user.id,
		token,
	};
});

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
	convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}>()({
	beforeLoad: async ({ context }) => {
		// all queries, mutations and action made with TanStack Query will be
		// authenticated by an identity token.
		const auth = await fetchAuth();
		const { userId, token } = auth;

		// During SSR only (the only time serverHttpClient exists),
		// set the auth token for Convex to make HTTP queries with.
		if (token) {
			context.convexQueryClient.serverHttpClient?.setAuth(token);
		}

		return { userId, token };
	},

	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			...seo({
				title: "Jamarski klub Novo mesto",
				description:
					"Specialisti za dokumentirano raziskovanje in ohranjanje čistega ter zdravega podzemskega sveta.",
			}),
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.ico" },
		],
	}),
	errorComponent: (props) => {
		return (
			<RootDocument>
				<DefaultCatchBoundary {...props} />
			</RootDocument>
		);
	},
	notFoundComponent: () => <NotFound />,
	component: RootComponent,
});

const root_route = getRouteApi("__root__");

function RootComponent() {
	const context = root_route.useRouteContext();

	return (
		<ConvexBetterAuthProvider
			client={context.convexClient}
			authClient={auth_client}
		>
			<RootDocument>
				<Outlet />
			</RootDocument>
		</ConvexBetterAuthProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="sl">
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="h-screen flex flex-col min-h-0">
					<div className="flex-grow min-h-0 flex flex-col">
						{children}
						<Toaster />
					</div>
				</div>
				<ReactQueryDevtools buttonPosition="bottom-left" />
				<TanStackRouterDevtools position="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}

/* {
		rel: 'apple-touch-icon',
		sizes: '180x180',
		href: '/apple-touch-icon.png',
	  },
	  {
		rel: 'icon',
		type: 'image/png',
		sizes: '32x32',
		href: '/favicon-32x32.png',
	  },
	  {
		rel: 'icon',
		type: 'image/png',
		sizes: '16x16',
		href: '/favicon-16x16.png',
	  },
	  { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' }, */
