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

export type ArticleSidebarSubItem = {
	label: string;
	link: (props: LinkProps) => ReactNode;
	edit_link: (props: LinkProps) => ReactNode;
};

export type ArticleSidebarItem = {
	label: string;
	link: (props: LinkProps) => ReactNode;
	icon: LucideIcon;
	isActive?: boolean;
	items?: ArticleSidebarSubItem[];
};

export function ArticleSidebar({ items }: { items: ArticleSidebarItem[] }) {
	return (
		/* className="group-data-[collapsible=icon]:hidden" */
		<SidebarGroup>
			<SidebarGroupLabel>Novice</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => (
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
							{item.items?.map((subItem) => (
								<ArticleSidebarSubItem
									key={subItem.label}
									label={subItem.label}
									link={subItem.link}
									edit_link={subItem.edit_link}
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
}: ArticleSidebarSubItem) {
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
