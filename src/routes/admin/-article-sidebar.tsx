"use client";

import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import {
	ArchiveRestoreIcon,
	EditIcon,
	ExternalLinkIcon,
	MoreHorizontalIcon,
	ShareIcon,
	Trash2Icon,
} from "lucide-react";
import { Fragment } from "react/jsx-runtime";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
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
								<Fragment key={sub_item.id.toString()}>
									<ArticleSidebarSubItem
										id={sub_item.id}
										status={sub_item.status}
										slug={sub_item.slug}
										key={sub_item.label}
										label={sub_item.label}
										link={sub_item.link}
										edit_button={sub_item.edit_button}
									/>
								</Fragment>
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

function ArticleSidebarSubItem({
	id,
	status,
	slug,
	label,
	link,
	edit_button,
}: ArticleSidebarByStatusSubItem) {
	const { isMobile } = useSidebar();
	const navigate = useNavigate();
	const match_route = useMatchRoute();

	const delete_article_mutation = useMutation({
		mutationFn: useConvexMutation(api.articles.soft_delete),
	});

	const hard_delete_article_mutation = useMutation({
		mutationFn: useConvexMutation(api.articles.hard_delete),
	});

	const restore_article_mutation = useMutation({
		mutationFn: useConvexMutation(api.articles.restore),
	});

	const copy_published_into_draft_mutation =
		useCopyPublishedIntoDraftMutation();

	let edit_component: React.ReactNode;
	if (status === "published") {
		edit_component = (
			<DropdownMenuItem asChild>
				{edit_button({
					children: (
						<>
							<EditIcon size={14} className="text-muted-foreground" />
							<span>Uredi</span>
						</>
					),
					onClick: () => {
						copy_published_into_draft_mutation.mutate({ article_id: id });
					},
				})}
			</DropdownMenuItem>
		);
	} else if (status === "draft") {
		edit_component = (
			<DropdownMenuItem asChild>
				{edit_button({
					children: (
						<>
							<EditIcon size={14} className="text-muted-foreground" />
							<span>Uredi</span>
						</>
					),
					onClick: () => {
						navigate({
							to: "/admin/$status/$article_slug/uredi",
							params: { article_slug: slug, status: "draft" },
						});
					},
				})}
			</DropdownMenuItem>
		);
	} else {
		edit_component = null;
	}

	let delete_component: React.ReactNode;
	if (status === "deleted") {
		delete_component = (
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<DropdownMenuItem>
						<Trash2Icon size={14} className="text-muted-foreground" />
						<span>Trajno zbriši</span>
					</DropdownMenuItem>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Potrdi trajno brisanje</AlertDialogTitle>
						<AlertDialogDescription>
							Ali res želiš trajno izbrisati ta članek? Tega dejanja ni mogoče
							razveljaviti.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Prekliči</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								const is_viewing = match_route({
									to: "/admin/$status/$article_slug",
									params: {
										article_slug: slug,
										status: status,
									},
									fuzzy: true,
								});

								hard_delete_article_mutation.mutate({
									article_id: id,
								});

								if (is_viewing) {
									navigate({
										to: "/admin",
									});
								}
							}}
						>
							Potrdi brisanje
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	} else {
		delete_component = (
			<DropdownMenuItem
				onClick={() => {
					const is_viewing = match_route({
						to: "/admin/$status/$article_slug",
						params: { article_slug: id, status },
						fuzzy: true,
					});

					delete_article_mutation.mutate({ article_id: id });

					if (is_viewing) {
						navigate({
							to: "/admin",
						});
					}
				}}
			>
				<Trash2Icon size={14} className="text-muted-foreground" />
				<span>Zbriši</span>
			</DropdownMenuItem>
		);
	}

	let restore_component: React.ReactNode;
	if (status === "deleted") {
		restore_component = (
			<DropdownMenuItem
				onClick={() => {
					restore_article_mutation.mutate({ article_id: id });
				}}
			>
				<ArchiveRestoreIcon size={14} className="text-muted-foreground" />
				<span>Obnovi</span>
			</DropdownMenuItem>
		);
	} else {
		restore_component = null;
	}

	return (
		<SidebarMenuSubItem className="overflow-ellipsis whitespace-nowrap">
			<SidebarMenuSubButton className="w-[calc(100%-2rem)]" asChild>
				{link({ children: label })}
			</SidebarMenuSubButton>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuAction showOnHover>
						<MoreHorizontalIcon />
						<span className="sr-only">Več</span>
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
					{edit_component}
					{delete_component && (
						<DropdownMenuItem>
							<ShareIcon size={14} className="text-muted-foreground" />
							<span>Deli</span>
						</DropdownMenuItem>
					)}
					{!delete_component && restore_component}
					{delete_component && (
						<>
							<DropdownMenuSeparator />
							{delete_component}
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuSubItem>
	);
}
