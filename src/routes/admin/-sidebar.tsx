import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import type { article_status_validator } from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { Infer } from "convex/values";
import {
	ArchiveIcon,
	CheckCircleIcon,
	Edit3Icon,
	type LucideIcon,
	Trash2Icon,
} from "lucide-react";
import { useMemo } from "react";
import { Sidebar, SidebarContent, SidebarRail } from "~/components/ui/sidebar";
import { ArticleSidebar, type ArticleSidebarItem } from "./-article-sidebar";

type ArticleStatus = Infer<typeof article_status_validator>;

type StatusInfo = {
	label: string;
	icon: LucideIcon;
};

/**
 * Type-safe status metadata - TypeScript will ensure all statuses from the validator are covered.
 * If a new status is added to `article_status_validator`, TypeScript will require it to be added here.
 * The `satisfies` constraint ensures this object contains exactly the statuses defined in the validator.
 */
const status_meta = {
	draft: { label: "Osnutki", icon: Edit3Icon },
	published: { label: "Objavljeno", icon: CheckCircleIcon },
	archived: { label: "Arhiv", icon: ArchiveIcon },
	deleted: { label: "Koš", icon: Trash2Icon },
} as const satisfies Record<ArticleStatus, StatusInfo>;

const status_order = Object.keys(status_meta) as readonly ArticleStatus[];

// TODO: when clicking edit on published articles, it edits the article directly, invalid state
export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { data: articles_by_status } = useSuspenseQuery(
		convexQuery(api.articles.get_latest_of_every_status, { limit: 5 }),
	);

	const sidebar_content = useMemo(() => {
		// Type-safe creation of sidebar items for all status values
		const sidebar_items: ArticleSidebarItem[] = status_order.map((status) => {
			const articles = articles_by_status[status] ?? [];
			return create_sidebar_item(articles, status);
		});

		return <ArticleSidebar items={sidebar_items} />;
	}, [articles_by_status]);

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarContent>{sidebar_content}</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}

function create_sidebar_item(
	articles: Doc<"articles">[],
	status: ArticleStatus,
) {
	const { label, icon } = status_meta[status];

	const item: ArticleSidebarItem = {
		label,
		icon,
		isActive: true,
		link: (props: LinkProps) => (
			<Link {...props} from="/admin" to="/admin/$status" params={{ status }} />
		),
		items: articles.map((article) => ({
			label: article.title,
			link: (props: LinkProps) => (
				<Link
					{...props}
					from="/admin"
					to="/admin/$status/$article_slug"
					params={{
						article_slug: article.slug,
						status,
					}}
				/>
			),
			edit_link: (props: LinkProps) => (
				<Link
					{...props}
					from="/admin"
					to="/admin/$status/$article_slug/uredi"
					params={{
						article_slug: article.slug,
						status,
					}}
				/>
			),
		})),
	};

	return item;
}
