import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "~/lib/utils";

const buttonGroupVariants = cva("flex items-center", {
	variants: {
		orientation: {
			horizontal:
				"flex-row *:not-last:rounded-r-none *:not-first:rounded-l-none *:not-first:border-l-0",
			vertical:
				// make the container size to the widest child and force every child to fill that width
				cn(
					"w-max flex-col items-stretch *:not-first:rounded-t-none *:not-last:rounded-b-none *:not-first:border-t-0",
					"inline-flex [&>*]:w-full",
				),
		},
	},
	defaultVariants: {
		orientation: "horizontal",
	},
});

export const ButtonGroup = ({
	className,
	orientation,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) => {
	return (
		<div
			className={cn(buttonGroupVariants({ orientation, className }))}
			{...props}
		/>
	);
};
