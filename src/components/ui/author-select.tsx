import { useId, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import { Label } from "~/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";

interface AuthorSelectProps {
	authors?: { value: string; label: string }[];
	selectedAuthor?: string;
	onAuthorChange?: (author: string) => void;
	placeholder?: string;
	label?: string;
	className?: string;
}

export function AuthorSelect({
	authors = [],
	selectedAuthor,
	onAuthorChange,
	placeholder = "Izberi avtorja",
	label = "Avtor",
	className,
}: AuthorSelectProps) {
	const id = useId();
	const [open, setOpen] = useState<boolean>(false);
	const [value, setValue] = useState<string>(selectedAuthor || "");

	const handleSelect = (currentValue: string) => {
		const newValue = currentValue === value ? "" : currentValue;
		setValue(newValue);
		setOpen(false);
		onAuthorChange?.(newValue);
	};

	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor={id}>{label}</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id={id}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]"
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
		</div>
	);
}
