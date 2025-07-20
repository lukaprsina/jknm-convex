"use client";

import { Link, type LinkProps } from "@tanstack/react-router";
import {
	EditIcon,
	ExternalLinkIcon,
	type LucideIcon,
	MoreHorizontal,
	ShareIcon,
	Trash2Icon,
} from "lucide-react";
import type { ReactNode } from "react";
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

export type ArticleSidebarByStatusSubItem = {
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
	label,
	link,
	edit_link,
}: ArticleSidebarByStatusSubItem) {
	const { isMobile } = useSidebar();

	return (
		<SidebarMenuSubItem>
			<SidebarMenuSubButton asChild>
				{link({ children: label })}
			</SidebarMenuSubButton>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuAction showOnHover>
						<MoreHorizontal />
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
					<DropdownMenuItem>
						<Trash2Icon size={14} className="text-muted-foreground" />
						<span>Zbriši</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuSubItem>
	);
}
