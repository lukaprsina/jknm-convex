"use client";

import { TogglePlugin } from "@platejs/toggle/react";
import { ToggleElement } from "~/components/plate-ui/toggle-node";
import { IndentKit } from "~/components/plugins/indent-kit";

export const ToggleKit = [
	...IndentKit,
	TogglePlugin.withComponent(ToggleElement),
];
