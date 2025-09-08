import { api } from "@convex/_generated/api";
import { ConvexQueryClient } from "@convex-dev/react-query";
import {
	createServerFileRoute,
	setHeaders,
	setResponseStatus,
} from "@tanstack/react-start/server";

const convexQueryClient = new ConvexQueryClient(
	import.meta.env.VITE_CONVEX_URL,
);
const convex = convexQueryClient.convexClient;

export const ServerRoute = createServerFileRoute("/novica/").methods({
	GET: async ({ request }) => {
		const url = new URL(request.url);
		const id = url.searchParams.get("id");

		if (!id) {
			return new Response("Missing id", { status: 400 });
		}

		const slug = await convex.query(api.articles.get_by_legacy_id, {
			legacy_id: Number(id),
		});

		if (!slug) {
			return new Response("Article not found", { status: 404 });
		}

		setResponseStatus(308);
		setHeaders({
			Location: `/articles/${slug}`,
		});

		return new Response(null);
	},
});
