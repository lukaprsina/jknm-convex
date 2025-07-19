import { api } from "@convex/_generated/api";
import type { article_status_validator } from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Infer } from "convex/values";
import { FolderIcon } from "lucide-react";
import { useMemo } from "react";
import { NavMain, type NavMainItemType } from "~/components/nav-main";
import { Sidebar, SidebarContent, SidebarRail } from "~/components/ui/sidebar";
import { exhaustive_check } from "~/types/utils";

function status_to_label(status: Infer<typeof article_status_validator>) {
	switch (status) {
		case "draft":
			return "Osnutki";
		case "published":
			return "Objavljeno";
		case "archived":
			return "Arhiv";
		case "deleted":
			return "Koš";
		default:
			exhaustive_check(status);
	}
}

export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { data: articles_by_status } = useSuspenseQuery(
		convexQuery(api.articles.get_latest_of_every_status, { limit: 5 }),
	);

	const navMain = useMemo(() => {
		const items: NavMainItemType[] = [];

		for (const status of Object.keys(articles_by_status)) {
			const typesafe_status = status as Infer<typeof article_status_validator>;
			const articles = articles_by_status[typesafe_status];
			if (articles.length === 0) continue; // Skip empty statuses

			items.push({
				title: status_to_label(typesafe_status),
				url: `/admin/osnutki/${typesafe_status}`,
				icon: FolderIcon,
				isActive: true,
				items: articles.map((article) => ({
					title: article.title,
					url: `/admin/osnutki/${article.slug}`,
				})),
			});
		}

		return items;
	}, [articles_by_status]);

	return (
		<Sidebar collapsible="icon" {...props}>
			{/* <SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader> */}
			<SidebarContent>
				<NavMain items={navMain} />
				{/* <NavProjects projects={data.projects} /> */}
			</SidebarContent>
			{/* <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter> */}
			<SidebarRail />
		</Sidebar>
	);
}
