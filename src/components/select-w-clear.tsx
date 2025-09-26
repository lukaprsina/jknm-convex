import { ChevronDownIcon, XIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { useId } from "react";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

function SelectTrigger({
	className,
	children,
	selectedValue,
	onClear,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
	selectedValue?: string | null;
	onClear?: () => void;
}) {
	return (
		<div className={cn("relative w-full", className)}>
			<SelectPrimitive.Trigger
				data-slot="select-trigger"
				className={cn(
					"flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-foreground text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:aria-invalid:ring-destructive/40 [&>span]:line-clamp-1 [&_svg]:pointer-events-none [&_svg]:shrink-0",
					/* "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-foreground text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:aria-invalid:ring-destructive/40 [&>span]:line-clamp-1 [&_svg]:pointer-events-none [&_svg]:shrink-0", */
					className,
				)}
				{...props}
			>
				{/* content stays; icon placeholder kept empty because we'll render an absolute icon */}
				{children}
				<span aria-hidden className="w-6" />
			</SelectPrimitive.Trigger>

			{/* absolute area for chevron or clear button to avoid nested button */}
			<div className="absolute inset-y-0 end-2 flex items-center">
				{selectedValue ? (
					<button
						type="button"
						aria-label="Clear selection"
						onClick={(e) => {
							// prevent the trigger from opening the select
							e.stopPropagation();
							e.preventDefault();
							onClear?.();
						}}
						className="rounded-full p-0.5 text-muted-foreground/80 hover:text-foreground/90"
						data-slot="select-clear"
					>
						<XIcon size={14} />
					</button>
				) : (
					<SelectPrimitive.Icon asChild>
						<ChevronDownIcon
							size={16}
							className="shrink-0 in-aria-invalid:text-destructive/80 text-muted-foreground/80"
						/>
					</SelectPrimitive.Icon>
				)}
			</div>
		</div>
	);
}

// https://originui.com/r/comp-204.json
// Select with placeholder
export function SelectWithClear({
	value,
	setValue,
	items,
	placeholder,
	label,
}: {
	value: string;
	setValue: (v: string) => void;
	items: { id: string; label: string }[];
	placeholder?: string;
	label?: string;
}) {
	const id = useId();

	return (
		<div /* className="*:not-first:mt-2" */>
			<Label htmlFor={id}>{label}</Label>
			<Select
				value={value}
				onValueChange={(v) => setValue(v ?? "")}
				required={false}
			>
				<SelectTrigger
					id={id}
					selectedValue={value}
					onClear={() => setValue("")}
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{items.map((item) => (
						<SelectItem key={item.id} value={item.id}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
