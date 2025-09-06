import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { article_status_validator } from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { Infer } from "convex/values";
import {
	HomeIcon,
	type LucideIcon,
	ShieldIcon,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { NavProjects } from "~/components/nav-projects";
import { Sidebar, SidebarContent, SidebarRail } from "~/components/ui/sidebar";
import { ArticleSidebar } from "./-article-sidebar";
import { status_meta } from "~/components/status-meta";
import { SidebarSecondary } from "~/components/ui/sidebar-secondary";

export type ArticleSidebarByStatusSubItem = {
	id: Id<"articles">;
	status: ArticleStatus;
	label: string;
	link: (props: LinkProps) => ReactNode;
	edit_link: (props: LinkProps) => ReactNode;
};

export type ArticleSidebarByStatusItem = {
	label: string;
	link: (props: LinkProps) => ReactNode;
	icon: LucideIcon;
	isActive?: boolean;
	items?: ArticleSidebarByStatusSubItem[];
};

type ArticleStatus = Infer<typeof article_status_validator>;

const status_order = Array.from(status_meta.keys())

// https://ui.shadcn.com/blocks/sidebar
// TODO: when clicking edit on published articles, it edits the article directly, invalid state
export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { data: articles_by_status } = useSuspenseQuery(
		convexQuery(api.articles.get_latest_of_every_status, { limit: 5 }),
	);

	const sidebar_content = useMemo(() => {
		const sidebar_items: ArticleSidebarByStatusItem[] = status_order.map(
			(status) => {
				const articles = articles_by_status[status] ?? [];
				return create_sidebar_item(articles, status);
			},
		);

		return <ArticleSidebar articles_by_status={sidebar_items} />;
	}, [articles_by_status]);

	return (
		<Sidebar className="h-full" collapsible="icon" {...props}>
			<SidebarContent>
				<NavProjects projects={[
					{ name: "Domov", icon: HomeIcon, url: "/" },
					{ name: "Admin", icon: ShieldIcon, url: "/admin" }
				]} />
				{sidebar_content}
				<SidebarSecondary className="mt-auto" items={[
					{ title: "Dokumentacija", url: "https://docs.jknm.dev", icon: HomeIcon },
				]} />
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}

function create_sidebar_item(
	articles: Doc<"articles">[],
	status: ArticleStatus,
) {
	const meta = status_meta.get(status);
	if (!meta) throw new Error("Status meta not found");

	const item: ArticleSidebarByStatusItem = {
		label: meta.label,
		icon: meta.icon,
		isActive: true,
		link: (props: LinkProps) => (
			<Link {...props} to="/admin/$status" params={{ status }} />
		),
		items: articles.map((article) => ({
			id: article._id,
			status: article.status,
			label: article.title,
			link: (props: LinkProps) => (
				<Link
					{...props}
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
