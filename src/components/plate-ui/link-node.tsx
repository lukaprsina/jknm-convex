"use client";

import { useLink } from "@platejs/link/react";
import type { TLinkElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

export function LinkElement(props: PlateElementProps<TLinkElement>) {
	const { props: linkProps } = useLink({ element: props.element });

	return (
		<PlateElement
			{...props}
			as="a"
			className="font-medium text-primary underline decoration-primary underline-offset-4"
			attributes={{
				...props.attributes,
				...linkProps,
			}}
		>
			{props.children}
		</PlateElement>
	);
}
