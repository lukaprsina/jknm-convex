"use client";

import { createPlatePlugin } from "platejs/react";

import { TocSidebar } from "~/components/plate-ui/toc-sidebar";

export const TocSidebarKit = [
	createPlatePlugin({
		key: "toc-sidebar",
		render: {
			afterEditable: () => <TocSidebar />,
		},
	}),
];
