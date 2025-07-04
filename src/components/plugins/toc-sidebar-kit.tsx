"use client";

import { createPlatePlugin } from "platejs/react";

import { TocSidebar } from "~/components/ui/toc-sidebar";

export const TocSidebarKit = [
	createPlatePlugin({
		key: "toc-sidebar",
		render: {
			afterEditable: () => <TocSidebar />,
		},
	}),
];
