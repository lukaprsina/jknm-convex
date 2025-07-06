import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, getRouteApi, stripSearchParams } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { api } from "convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { z } from "zod";
import { Footer2 } from "~/components/layout/footer2";
import { Navbar1 } from "~/components/layout/navbar1";
import { FilterAccordion } from "~/routes/-filter-accordion";

const DEFAULT_NUM_ITEMS = 10;

export const DEFAULT_SEARCH_VALUES = {
	authors: [],
	year: null,
	search: "",
};

const article_search_validator = z.object({
	authors: fallback(z.array(z.string()), DEFAULT_SEARCH_VALUES.authors).default(
		DEFAULT_SEARCH_VALUES.authors,
	),
	year: fallback(z.number().nullable(), DEFAULT_SEARCH_VALUES.year).default(
		DEFAULT_SEARCH_VALUES.year,
	),
	search: fallback(z.string(), DEFAULT_SEARCH_VALUES.search).default(
		DEFAULT_SEARCH_VALUES.search,
	),
});

export const Route = createFileRoute("/")({
	component: Home,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			convexQuery(api.articles.search_articles_unified, {
				search_term: "",
				author_ids: [],
				year: undefined,
				paginationOpts: { cursor: null, numItems: DEFAULT_NUM_ITEMS },
			}),
		);
	},
	validateSearch: zodValidator(article_search_validator),
	search: { middlewares: [stripSearchParams(DEFAULT_SEARCH_VALUES)] },
});

const home_route = getRouteApi("/");

function Home() {
	const home_search = home_route.useSearch();

	// Get all authors for the filter
	const authors = useQuery(api.authors.get_all);

	// Convert author names to IDs for the unified search
	const authorIds = authors?.filter((author: any) =>
		home_search.authors.includes(author.name)
	).map((author: any) => author._id) ?? [];

	const search_api = usePaginatedQuery(
		api.articles.search_articles_unified,
		{
			search_term: home_search.search ?? "",
			author_ids: authorIds,
			year: home_search.year ?? undefined,
		},
		{ initialNumItems: DEFAULT_NUM_ITEMS },
	);

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
				<FilterAccordion authors={authors} />
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
