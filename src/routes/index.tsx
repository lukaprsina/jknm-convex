import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	getRouteApi,
	stripSearchParams,
} from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { EmptyObject } from "better-auth/react";
import { api } from "convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { z } from "zod";
import { Footer2 } from "~/components/layout/footer2";
import { Navbar1 } from "~/components/layout/navbar1";
import { Button } from "~/components/ui/button";

import { FilterAccordion } from "~/routes/-filter-accordion";

const DEFAULT_NUM_ITEMS = 10;

export const DEFAULT_SEARCH_VALUES = {
	avtorji: [],
	leto: null,
	iskanje: "",
};

// properties must be in slovenian because they appear in the URL
const article_search_validator = z.object({
	avtorji: fallback(z.array(z.string()), DEFAULT_SEARCH_VALUES.avtorji).default(
		DEFAULT_SEARCH_VALUES.avtorji,
	),
	leto: fallback(z.number().nullable(), DEFAULT_SEARCH_VALUES.leto).default(
		DEFAULT_SEARCH_VALUES.leto,
	),
	iskanje: fallback(z.string(), DEFAULT_SEARCH_VALUES.iskanje).default(
		DEFAULT_SEARCH_VALUES.iskanje,
	),
});

export const Route = createFileRoute("/")({
	component: Home,
	loader: async ({ context }) => {
		const [search_results, authors] = await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.articles.search_articles_unified, {
					search_term: "",
					author_ids: [],
					year: undefined,
					paginationOpts: { cursor: null, numItems: DEFAULT_NUM_ITEMS },
				}),
			),
			context.queryClient.ensureQueryData(convexQuery(api.authors.get_all, {})),
		]);

		return {
			search_results,
			authors,
		};
	},
	validateSearch: zodValidator(article_search_validator),
	search: { middlewares: [stripSearchParams(DEFAULT_SEARCH_VALUES)] },
});

const home_route = getRouteApi("/");

function Home() {
	const home_search = home_route.useSearch();

	const search_api = usePaginatedQuery(
		api.articles.search_articles_unified,
		{
			search_term: home_search.iskanje,
			author_ids: home_search.avtorji,
			year: home_search.leto ?? undefined,
		},
		{ initialNumItems: DEFAULT_NUM_ITEMS },
	);

	const { mutate } = useMutation<typeof api.articles.create_draft._returnType, EmptyObject | undefined, EmptyObject | undefined>({
		mutationFn: useConvexMutation(api.articles.create_draft),
		onSuccess: (new_draft) => {
			/* if (typeof new_draft === "string") {

			} else {
				new_draft
			} */
			console.log("New draft created:", new_draft);
		}
	});

	// Sentinel for infinite loading
	const { isIntersecting, ref } = useIntersectionObserver({ threshold: 0.5 });

	// Only load more if the sentinel is visible and we can load more
	useEffect(() => {
		if (isIntersecting && search_api.status === "CanLoadMore") {
			search_api.loadMore(5);
		}
	}, [isIntersecting, search_api.status, search_api.loadMore]);

	return (
		<>
			<Navbar1 />
			<div className="w-full p-4">
				<FilterAccordion />
				<Button
					onClick={() => {
						mutate({});
					}}
				>Create draft article</Button>
			</div>
			<main className="w-full flex-grow">

				{search_api.results?.map(({ _id, title }) => (
					<div key={_id}>{title}</div>
				))}
				{/* Sentinel for infinite scroll */}
				{search_api.status === "CanLoadMore" && (
					<div
						ref={ref}
						style={{
							height: 32,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<span>Loading more...</span>
					</div>
				)}
			</main>
			<Footer2 />
		</>
	);
}
