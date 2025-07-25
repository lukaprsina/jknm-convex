import { BaseListPlugin } from "@platejs/list";
import { KEYS } from "platejs";
import { BlockListStatic } from "~/components/plate-ui/block-list-static";
import { BaseIndentKit } from "~/components/plugins/indent-base-kit";

export const BaseListKit = [
	...BaseIndentKit,
	BaseListPlugin.configure({
		inject: {
			targetPlugins: [
				...KEYS.heading,
				KEYS.p,
				KEYS.blockquote,
				KEYS.codeBlock,
				KEYS.toggle,
			],
		},
		render: {
			belowNodes: BlockListStatic,
		},
	}),
];
