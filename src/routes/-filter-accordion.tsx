import { getRouteApi, useNavigate } from "@tanstack/react-router";
import equal from "fast-deep-equal";
import { useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "~/components/ui/accordion";
import { AuthorSelect } from "~/components/ui/author-select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { YearDropdown } from "~/components/ui/year-dropdown";
import { YearSelectorHorizontal } from "~/components/ui/year-selector-horizontal";
import { useIsMobile } from "~/hooks/use-mobile";
import { DEFAULT_SEARCH_VALUES } from ".";

// Mock authors data - replace with actual data from your backend
const mock_authors = [
    { value: "john-doe", label: "John Doe" },
    { value: "jane-smith", label: "Jane Smith" },
    { value: "bob-johnson", label: "Bob Johnson" },
    { value: "alice-brown", label: "Alice Brown" },
    { value: "mike-wilson", label: "Mike Wilson" },
];

const home_route = getRouteApi("/");

export function FilterAccordion() {
    const home_search = home_route.useSearch();
    const { authors } = home_route.useLoaderData()

    const navigate = useNavigate({ from: home_route.id });
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(
        !equal(home_search, DEFAULT_SEARCH_VALUES),
    );

    return (
        <Accordion
            type="multiple"
            className="w-full"
            value={isOpen ? ["item-1"] : []}
            onValueChange={(item) => setIsOpen(item.at(0) === "item-1")}
        >
            <AccordionItem value="item-1">
                <div className="flex justify-end w-full">
                    <AccordionTrigger className="grow-0">Filtriraj</AccordionTrigger>
                </div>
                <AccordionContent className="grid grid-rows-2 gap-6 text-balance px-2">
                    {/* First row - Year selector */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium pr-2">Leto</Label>
                        {isMobile ? (
                            <YearDropdown
                                selectedYear={home_search.leto ?? undefined}
                                onYearChange={async (year) =>
                                    await navigate({
                                        from: home_route.id,
                                        search: (prev) => ({ ...prev, leto: year }),
                                    })
                                }
                            />
                        ) : (
                            <YearSelectorHorizontal
                                selectedYear={home_search.leto ?? undefined}
                                onYearChange={async (year) =>
                                    await navigate({
                                        from: home_route.id,
                                        search: (prev) => ({ ...prev, leto: year }),
                                    })
                                }
                                className="w-full h-11"
                            />
                        )}
                    </div>

                    {/* Second row - Search and Author dropdown */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Author dropdown */}
                        <div className="space-y-2 w-auto">
                            <Label htmlFor="author-select" className="text-sm font-medium">
                                Avtor
                            </Label>
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
                        <div className="space-y-2 w-auto">
                            <Label htmlFor="search" className="text-sm font-medium">
                                Iskanje
                            </Label>
                            <Input
                                id="search"
                                type="text"
                                placeholder="Poišči članke..."
                                value={home_search.iskanje ?? ""}
                                onChange={async (event) =>
                                    await navigate({
                                        from: home_route.id,
                                        search: (prev) => ({ ...prev, iskanje: event.target.value }),
                                    })
                                }
                                className="w-auto min-w-[200px]"
                            />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
