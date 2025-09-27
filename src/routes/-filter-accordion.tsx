import { getRouteApi, useNavigate } from "@tanstack/react-router";
import equal from "fast-deep-equal";
import { useEffect, useId, useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { SelectWithClear } from "~/components/select-w-clear";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { AuthorSelect } from "~/components/ui/author-select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { YearSelectorHorizontal } from "~/components/ui/year-selector-horizontal";
import { DEFAULT_SEARCH_VALUES } from ".";

const home_route = getRouteApi("/");

export function FilterAccordion() {
	const home_search = home_route.useSearch();
	const { authors } = home_route.useLoaderData();
	const search_id = useId();

	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(
		!equal(home_search, DEFAULT_SEARCH_VALUES),
	);

	const [searchValue, setSearchValue] = useState(home_search.iskanje ?? "");

	const [debouncedSearch] = useDebounceValue(searchValue, 300, {
		leading: false,
		trailing: true,
		maxWait: 1000,
	});

	const years = useMemo(() => {
		const currentYear = new Date().getFullYear();
		const startYear = 2008;
		return Array.from(
			{ length: currentYear - startYear + 1 },
			(_, i) => currentYear - i, // Reverse order to show newest first
		);
	}, []);

	useEffect(() => {
		const callback = async () => {
			await navigate({
				from: home_route.id,
				to: home_route.id,
				search: (prev) => ({ ...prev, iskanje: debouncedSearch || undefined }),
				replace: true,
			});
		};

		void callback();
	}, [debouncedSearch, navigate]);

	return (
		<Accordion
			type="multiple"
			className="w-full"
			value={isOpen ? ["item-1"] : []}
			onValueChange={(item) => setIsOpen(item.at(0) === "item-1")}
		>
			<AccordionItem value="item-1">
				<div className="flex w-full justify-end">
					<AccordionTrigger className="grow-0">Filtriraj</AccordionTrigger>
				</div>
				<AccordionContent
					className="flex flex-col gap-6 text-balance px-2 pt-0 pb-4"
					parentClassName="overflow-visible"
				>
					{/* First row - Year selector */}
					<div className="hidden space-y-2 xl:block">
						<Label className="pr-2 font-medium text-sm">Leto</Label>
						<YearSelectorHorizontal
							selectedYear={home_search.leto ?? undefined}
							onYearChange={async (year) =>
								await navigate({
									from: home_route.id,
									search: (prev) => ({ ...prev, leto: year }),
								})
							}
							className="h-11 w-full"
						/>
					</div>

					{/* Second row - Search and Author dropdown */}
					<div className="flex flex-col gap-4 md:flex-row">
						{/* Author dropdown */}
						<div className="w-auto space-y-2">
							<Label className="font-medium text-sm">Avtorji</Label>
							<AuthorSelect
								authors={authors}
								selectedAuthors={home_search.avtorji}
								onAuthorsChange={async (authors: string[]) =>
									await navigate({
										from: home_route.id,
										search: (prev) => ({ ...prev, avtorji: authors }),
									})
								}
							/>
						</div>

						{/* Search field */}
						<div className="w-auto space-y-2">
							<Label htmlFor={search_id} className="font-medium text-sm">
								Iskanje
							</Label>
							<Input
								id={search_id}
								type="text"
								placeholder="Filtriraj članke..."
								value={searchValue}
								onChange={(event) => {
									setSearchValue(event.target.value);
								}}
								// className="min-w-[200px]"
							/>
						</div>

						{/* flex flex-col */}
						<div className="w-auto space-y-2">
							<SelectWithClear
								className="min-w-[150px]"
								value={String(home_search.leto ?? "")}
								setValue={async (v) =>
									await navigate({
										from: home_route.id,
										search: (prev) => ({
											...prev,
											leto: v ? Number(v) : undefined,
										}),
									})
								}
								items={years.map((year) => ({
									id: String(year),
									label: String(year),
								}))}
								placeholder="Izberi leto..."
								label="Leto"
							/>
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
