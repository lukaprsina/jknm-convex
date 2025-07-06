import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import React from "react";
import { Footer2 } from "~/components/layout/footer2";
import { Navbar1 } from "~/components/layout/navbar1";
import { usePaginatedQuery } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useIntersectionObserver } from "usehooks-ts";
import { AccordionDemo } from "~/routes/-filter-accordion";
import { z } from "zod";

const DEFAULT_NUM_ITEMS = 10;

const default_values = {
	authors: null,
	year: null,
	search: null,
};

const article_search_validator = z.object({
	authors: fallback(
		z.array(z.string()).nullable(),
		default_values.authors,
	).default(default_values.authors),
	year: fallback(z.number().nullable(), default_values.year).default(
		default_values.year,
	),
	search: fallback(z.string().nullable(), default_values.search).default(
		default_values.search,
	),
});

export const Route = createFileRoute("/")({
	component: Home,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			convexQuery(api.articles.get_paginated_published, {
				paginationOpts: { cursor: null, numItems: DEFAULT_NUM_ITEMS },
			}),
		);
	},
	validateSearch: zodValidator(article_search_validator),
	search: { middlewares: [stripSearchParams(default_values)] },
});

function Home() {
	const { results, status, loadMore } = usePaginatedQuery(
		api.articles.get_paginated_published,
		{},
		{ initialNumItems: DEFAULT_NUM_ITEMS },
	);

	// Sentinel for infinite loading
	const { isIntersecting, ref } = useIntersectionObserver({ threshold: 0.5 });

	// Only load more if the sentinel is visible and we can load more
	React.useEffect(() => {
		if (isIntersecting && status === "CanLoadMore") {
			loadMore(5);
		}
	}, [isIntersecting, status, loadMore]);

	return (
		<>
			<Navbar1 />
			<div className="w-full p-4">
				<AccordionDemo />
			</div>
			<main className="w-full flex-grow">
				{results?.map(({ _id, title }) => (
					<div key={_id}>{title}</div>
				))}
				{/* Sentinel for infinite scroll */}
				{status === "CanLoadMore" && (
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
