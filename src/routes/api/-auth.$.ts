import { reactStartHandler } from "@convex-dev/better-auth/react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				return reactStartHandler4(request);
			},
			POST: async ({ request }) => {
				return reactStartHandler4(request);
			},
		},
	},
});

export async function reactStartHandler2(
	request: Request,
	opts?: { convexSiteUrl?: string; verbose?: boolean },
) {
	const requestUrl = new URL(request.url);
	const convexSiteUrl = opts?.convexSiteUrl ?? process.env.VITE_CONVEX_SITE_URL;
	if (!convexSiteUrl) throw new Error("VITE_CONVEX_SITE_URL is not set");
	const nextUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;

	// Build a fresh headers object
	const headers = new Headers(request.headers);
	headers.set("accept-encoding", "application/json");

	// Build init
	const init: RequestInit = {
		method: request.method,
		headers,
		redirect: "manual",
	};

	// If request likely has a body, clone & read it
	if (request.method !== "GET" && request.method !== "HEAD") {
		const buf = await request.clone().arrayBuffer();
		init.body = buf;
	}

	return fetch(nextUrl, init);
}

export async function reactStartHandler3(
	request: Request,
	opts?: { convexSiteUrl?: string; verbose?: boolean },
) {
	const requestUrl = new URL(request.url);
	const convexSiteUrl = opts?.convexSiteUrl ?? process.env.VITE_CONVEX_SITE_URL;
	if (!convexSiteUrl) throw new Error("VITE_CONVEX_SITE_URL is not set");

	const nextUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;

	// clone headers safely
	const headers = new Headers(request.headers);
	headers.set("accept", "application/json"); // accept, not accept-encoding

	const init: RequestInit = {
		method: request.method,
		headers,
		redirect: "manual",
		// optionally forward credentials/signal
		credentials: request.credentials ?? "same-origin",
		// signal: request.signal,
	};

	if (request.method !== "GET" && request.method !== "HEAD") {
		/* // consume body once; callers shouldn’t expect to reuse request after
		init.body = request.body; */
		const buf = await request.clone().arrayBuffer();
		init.body = buf;
	}

	return fetch(nextUrl, init);
}

export async function reactStartHandler4(
	request: Request,
	opts?: { convexSiteUrl?: string; verbose?: boolean },
) {
	const requestUrl = new URL(request.url);
	const convexSiteUrl = opts?.convexSiteUrl ?? process.env.VITE_CONVEX_SITE_URL;
	if (!convexSiteUrl) throw new Error("VITE_CONVEX_SITE_URL is not set");

	const nextUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;

	const headers = new Headers(request.headers);
	headers.set("accept", "application/json");
	// remove content-length to avoid mismatch when we re-size the body
	headers.delete("content-length");

	const init: RequestInit = {
		method: request.method,
		headers,
		redirect: "manual",
		// note: intentionally NOT forwarding request.signal (see explanation)
	};

	if (request.method !== "GET" && request.method !== "HEAD") {
		// buffer the body into memory (safe & avoids duplex/realm issues)
		const buf = await request.arrayBuffer();
		init.body = buf;
	}

	return fetch(nextUrl, init);
}
