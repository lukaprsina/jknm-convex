import { BaseLinkPlugin } from "@platejs/link";

import { LinkElementStatic } from "~/components/plate-ui/link-node-static";

export const BaseLinkKit = [BaseLinkPlugin.withComponent(LinkElementStatic)];
