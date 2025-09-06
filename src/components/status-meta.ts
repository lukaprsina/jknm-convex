import type { article_status_validator } from "@convex/schema";
import type { Infer } from "convex/values";
import {
	ArchiveIcon,
	CheckCircleIcon,
	Edit3Icon,
	type LucideIcon,
	Trash2Icon,
} from "lucide-react";

type ArticleStatus = Infer<typeof article_status_validator>;

type StatusInfo = {
	label: string;
	icon: LucideIcon;
};

export const status_meta = new Map<ArticleStatus, StatusInfo>([
	["draft", { label: "Osnutki", icon: Edit3Icon }],
	["published", { label: "Objavljeno", icon: CheckCircleIcon }],
	["archived", { label: "Arhiv", icon: ArchiveIcon }],
	["deleted", { label: "Koš", icon: Trash2Icon }],
]);
