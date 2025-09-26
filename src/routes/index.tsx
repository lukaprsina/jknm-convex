import { convexQuery } from "@convex-dev/react-query";
import {
	createFileRoute,
	getRouteApi,
	Link,
	stripSearchParams,
} from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { array, nullable, number, object, optional, string } from "valibot";
import { ButtonGroup } from "~/components/button-group";
import { Footer } from "~/components/layout/footer2";
import { SiteNavbar } from "~/components/layout/site-navbar";
import { Button } from "~/components/ui/button";
import { FilterAccordion } from "./-filter-accordion";

const DEFAULT_NUM_ITEMS = 10;

export const DEFAULT_SEARCH_VALUES = {
	avtorji: [],
	leto: null,
	iskanje: "",
};

// properties must be in slovenian because they appear in the URL
export const article_search_validator = object({
	avtorji: optional(array(string()), DEFAULT_SEARCH_VALUES.avtorji),
	leto: optional(nullable(number()), DEFAULT_SEARCH_VALUES.leto),
	iskanje: optional(string(), DEFAULT_SEARCH_VALUES.iskanje),
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
	validateSearch: article_search_validator,
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

	/* const delete_everything = useMutation({
		mutationFn: useConvexMutation(api.delete_everything.delete_everything),
	});

	const sync_google_authors = useMutation({
		mutationFn: useConvexMutation(api.authors.sync_google_authors),
	}); */

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
			<SiteNavbar />
			{/* <header className="flex w-full flex-col items-center">
				<div className="py-8">
					<img src="/logo.svg" alt="Logo" className="h-24" />
				</div>

				<Navbar />
			</header> */}
			{/* <Header /> */}
			<main className="w-full flex-grow">
				<div className="container mx-auto px-4">
					<FilterAccordion />
					<div className="flex w-full justify-center">
						<ButtonGroup orientation="vertical">
							<Button asChild variant="outline">
								<Link to="/prijava">Prijava</Link>
							</Button>
							<Button asChild variant="outline">
								<Link to="/admin/$status" params={{ status: "draft" }}>
									Admin osnutki
								</Link>
							</Button>
							{/* <Button
								onClick={async () => {
									const result = await auth_client.deleteUser();
									console.log("Delete user result:", result);
								}}
								variant="outline"
							>
								Odstrani uporabnika
							</Button>
							<Button
								onClick={async (event) => {
									if (!event.ctrlKey && !event.shiftKey) return;

									const conformation = confirm(
										"Are you sure you want to delete every article and media?",
									);

									if (!conformation) return;

									delete_everything.mutate({});
								}}
								variant="outline"
							>
								Zbriši vse
							</Button>
							<Button
								onClick={async () => {
									sync_google_authors.mutate({});
								}}
							>
								Sinhroniziraj Google avtorje
							</Button> */}
						</ButtonGroup>
					</div>
					{/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{search_api.results?.map((article) => (
							<ArticleCard key={article._id} article={article} />
						))}
					</div>
					{search_api.status === "Exhausted" &&
						search_api.results.length === 0 && (
							<div className="text-center text-gray-500">
								<p>Ni najdenih novic.</p>
							</div>
						)}
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
							<span>Nalagam...</span>
						</div>
					)} */}
				</div>
				{/* {Array.from({ length: 50 }).map((_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: lol
					<p key={index}>
						Lorem ipsum, dolor sit amet consectetur adipisicing elit. In,
						facilis numquam. Blanditiis asperiores quidem iusto explicabo
						pariatur incidunt cupiditate provident ducimus nostrum. Eius
						corporis magnam placeat suscipit, sapiente fugit. Ipsum?
					</p>
				))} */}
			</main>
			<Footer />
		</>
	);
}
