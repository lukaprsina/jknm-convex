import { getRouteApi, useNavigate } from "@tanstack/react-router"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "~/components/ui/accordion"

export function AccordionDemo() {
    const home_route = getRouteApi("/")
    const home_search = home_route.useSearch()
    const navigate = useNavigate({ from: home_route.id })

    return (
        <Accordion
            type="single"
            collapsible
            className="w-full"
        >
            <AccordionItem value="item-1">
                <AccordionTrigger className="justify-end">Filtriraj</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">

                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}