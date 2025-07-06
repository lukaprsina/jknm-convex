import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "~/components/ui/accordion"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { YearSelectorHorizontal } from "~/components/ui/year-selector-horizontal"
import { YearDropdown } from "~/components/ui/year-dropdown"
import { AuthorSelect } from "~/components/ui/author-select"
import { useIsMobile } from "~/hooks/use-mobile"

// Mock authors data - replace with actual data from your backend
const authors = [
    { value: "john-doe", label: "John Doe" },
    { value: "jane-smith", label: "Jane Smith" },
    { value: "bob-johnson", label: "Bob Johnson" },
    { value: "alice-brown", label: "Alice Brown" },
    { value: "mike-wilson", label: "Mike Wilson" },
]

export function AccordionDemo() {
    const home_route = getRouteApi("/")
    const home_search = home_route.useSearch()
    const navigate = useNavigate({ from: home_route.id })
    const isMobile = useIsMobile()
    const [isOpen, setIsOpen] = useState(false) // "accordion-open"

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
                <AccordionContent className="grid grid-rows-2 gap-6 text-balance">
                    {/* First row - Year selector */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium pr-2">Leto</Label>
                        {isMobile ? (
                            <YearDropdown
                                selectedYear={home_search.year ?? undefined}
                                onYearChange={async (year) => await navigate({ from: home_route.id, search: (prev) => ({ ...prev, year }) })}
                            />
                        ) : (
                            <YearSelectorHorizontal
                                selectedYear={home_search.year ?? undefined}
                                onYearChange={async (year) => await navigate({ from: home_route.id, search: (prev) => ({ ...prev, year }) })}
                                className="w-full h-11"
                            />
                        )}
                    </div>

                    {/* Second row - Search and Author dropdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Search field */}
                        <div className="space-y-2">
                            <Label htmlFor="search" className="text-sm font-medium">
                                Iskanje
                            </Label>
                            <Input
                                className="w-1/2"
                                type="text"
                                placeholder="Poišči članke..."
                                value={home_search.search ?? ""}
                                onChange={async (event) => await navigate({ from: home_route.id, search: (prev) => ({ ...prev, search: event.target.value }) })}
                            />
                        </div>

                        {/* Author dropdown */}
                        <AuthorSelect
                            authors={authors}
                            selectedAuthor={home_search.authors?.at(0)}
                            onAuthorChange={async (author) => await navigate({ from: home_route.id, search: (prev) => ({ ...prev, authors: [author] }) })}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}