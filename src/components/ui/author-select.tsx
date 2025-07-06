import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "~/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface AuthorSelectProps extends React.ComponentProps<"div"> {
    authors?: { value: string; label: string }[];
    selectedAuthor?: string;
    onAuthorChange?: (author: string) => void;
    placeholder?: string;
}

export function AuthorSelect({
    authors = [],
    selectedAuthor,
    onAuthorChange,
    placeholder = "Izberi avtorja",
    className,
    id,
    ...props
}: AuthorSelectProps) {
    const [open, setOpen] = useState<boolean>(false);
    const [value, setValue] = useState<string>(selectedAuthor || "");

    const handleSelect = (currentValue: string) => {
        const newValue = currentValue === value ? "" : currentValue;
        setValue(newValue);
        setOpen(false);
        onAuthorChange?.(newValue);
    };

    return (
        <Popover open={open} onOpenChange={setOpen} {...props}>
            <PopoverTrigger asChild>
                {/** biome-ignore lint/a11y/useSemanticElements: idk lol */}
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("bg-background hover:bg-background border-input w-auto min-w-[180px] justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]", className)}
                >
                    <span className={cn("truncate", !value && "text-muted-foreground")}>
                        {value
                            ? authors.find((author) => author.value === value)?.label
                            : placeholder}
                    </span>
                    <ChevronDownIcon
                        size={16}
                        className="text-muted-foreground/80 shrink-0"
                        aria-hidden="true"
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Poišči avtorja..." />
                    <CommandList>
                        <CommandEmpty>Avtor ni najden.</CommandEmpty>
                        <CommandGroup>
                            {authors.map((author) => (
                                <CommandItem
                                    key={author.value}
                                    value={author.value}
                                    onSelect={handleSelect}
                                >
                                    {author.label}
                                    {value === author.value && (
                                        <CheckIcon size={16} className="ml-auto" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
