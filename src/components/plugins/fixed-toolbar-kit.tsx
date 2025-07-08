"use client";

import { createPlatePlugin } from "platejs/react";

import { FixedToolbar } from "~/components/plate-ui/fixed-toolbar";
import { FixedToolbarButtonsFirst } from "../plate-ui/fixed-toolbar-buttons-first";

export const FixedToolbarKit = [
	createPlatePlugin({
		key: "fixed-toolbar",
		render: {
			beforeEditable: () => (
				<>
					<FixedToolbar>
						<FixedToolbarButtonsFirst />
					</FixedToolbar>
					{/* <FixedToolbar>
						<FixedToolbarButtonSecond />
					</FixedToolbar> */}
				</>
			),
		},
	}),
];
