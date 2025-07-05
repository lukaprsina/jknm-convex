import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "~/components/ui/accordion"

export function AccordionDemo() {
    return (
        <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue="item-1"
        >
            <AccordionItem value="item-1">
                <AccordionTrigger className="justify-end">Filters</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">
                    {/* TODO */}
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}