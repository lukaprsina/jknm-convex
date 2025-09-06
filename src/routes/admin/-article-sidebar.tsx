"use client";

import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import {
	EditIcon,
	ExternalLinkIcon,
	MoreHorizontalIcon,
	ShareIcon,
	Trash2Icon,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "~/components/ui/sidebar";
import type {
	ArticleSidebarByStatusItem,
	ArticleSidebarByStatusSubItem,
} from "./-sidebar";

export function ArticleSidebar({
	articles_by_status,
}: {
	articles_by_status: ArticleSidebarByStatusItem[];
}) {
	return (
		/* className="group-data-[collapsible=icon]:hidden" */
		<SidebarGroup>
			<SidebarGroupLabel>Novice</SidebarGroupLabel>
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
								<ArticleSidebarSubItem
									id={sub_item.id}
									status={sub_item.status}
									key={sub_item.label}
									label={sub_item.label}
									link={sub_item.link}
									edit_link={sub_item.edit_link}
								/>
							))}
						</SidebarMenuSub>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

function ArticleSidebarSubItem({
	id,
	status,
	label,
	link,
	edit_link,
}: ArticleSidebarByStatusSubItem) {
	const { isMobile } = useSidebar();
	const delete_article = useMutation({
		mutationFn: useConvexMutation(api.articles.delete_article),
	});
	const navigate = useNavigate();
	const match_route = useMatchRoute();

	return (
		<SidebarMenuSubItem>
			<SidebarMenuSubButton asChild>
				{link({ children: label })}
			</SidebarMenuSubButton>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuAction showOnHover>
						<MoreHorizontalIcon />
						<span className="sr-only">More</span>
					</SidebarMenuAction>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-48 rounded-lg"
					side={isMobile ? "bottom" : "right"}
					align={isMobile ? "end" : "start"}
				>
					<DropdownMenuItem asChild>
						{link({
							children: (
								<>
									<ExternalLinkIcon
										size={14}
										className="text-muted-foreground"
									/>
									<span>Odpri</span>
								</>
							),
						})}
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						{edit_link({
							children: (
								<>
									<EditIcon size={14} className="text-muted-foreground" />
									<span>Uredi</span>
								</>
							),
						})}
					</DropdownMenuItem>
					<DropdownMenuItem>
						<ShareIcon size={14} className="text-muted-foreground" />
						<span>Deli</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => {
							const is_viewing = match_route({
								to: "/admin/$status/$article_slug",
								params: { article_slug: id, status },
								fuzzy: true,
							});

							if (is_viewing) {
								navigate({
									to: "/admin",
								});
							}

							delete_article.mutate({ article_id: id });
						}}
					>
						<Trash2Icon size={14} className="text-muted-foreground" />
						<span>Zbriši</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuSubItem>
	);
}
