"use client";

import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
} from "~/components/ui/sidebar";
import { SubItemRow } from "./-article-subitem-row";
import type { ArticleSidebarByStatusItem } from "./-sidebar";

export function ArticleSidebar({
	articles_by_status,
}: {
	articles_by_status: ArticleSidebarByStatusItem[];
}) {
	return (
		/* className="group-data-[collapsible=icon]:hidden" */
		<SidebarGroup>
			<SidebarGroupLabel>Kategorije</SidebarGroupLabel>
			<SidebarMenu>
				{articles_by_status.map((item) => (
					<SidebarMenuItem key={item.label}>
						<SidebarMenuButton tooltip={item.label} asChild>
							{item.link({
								children: (
									<>
										<item.icon />
										<span>{item.label}</span>
									</>
								),
							})}
						</SidebarMenuButton>
						<SidebarMenuSub>
							{item.items?.map((sub_item) => (
								<SubItemRow key={sub_item.id.toString()} sub_item={sub_item} />
							))}
						</SidebarMenuSub>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

export type CopyPublishedIntoDraftMutation =
	typeof api.articles.copy_published_into_draft;

export function useCopyPublishedIntoDraftMutation() {
	const navigate = useNavigate();

	const copy_published_into_draft_mutation = useMutation<
		CopyPublishedIntoDraftMutation["_returnType"],
		Error,
		CopyPublishedIntoDraftMutation["_args"]
	>({
		mutationFn: useConvexMutation(api.articles.copy_published_into_draft),
		onSuccess: ({ ok, draft_id }) => {
			if (!ok) {
				alert("Napaka pri kopiranju objavljenega članka v osnutek.");
				return;
			}

			navigate({
				to: "/admin/$status/$article_slug/uredi",
				params: { article_slug: draft_id, status: "draft" },
			});
		},
	});

	return copy_published_into_draft_mutation;
}
