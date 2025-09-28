import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
import type React from "react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	SidebarMenuAction,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "~/components/ui/sidebar";
import type { ArticleSidebarByStatusSubItem } from "./-sidebar";

/**
 * SubItemRow - owns open state for the alert dialog and renders
 * the confirmation dialog + the subitem UI.
 */
export function SubItemRow({
	sub_item,
}: {
	sub_item: ArticleSidebarByStatusSubItem;
}) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<DeleteAlertDialog
				article_id={sub_item.id}
				slug={sub_item.slug}
				status={sub_item.status}
				open={open}
				setOpen={setOpen}
			/>
			<ArticleSidebarSubItem {...sub_item} setOpen={setOpen} />
		</>
	);
}

type CopyPublishedIntoDraftMutation =
	typeof api.articles.copy_published_into_draft;

/**
 * ArticleSidebarSubItem - moved from -article-sidebar and adapted to accept setOpen.
 * setOpen is used to open the hard-delete confirmation dialog when appropriate.
 */
export function ArticleSidebarSubItem({
	id,
	status,
	slug,
	label,
	link,
	edit_button,
	setOpen,
}: ArticleSidebarByStatusSubItem & {
	setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const { isMobile } = useSidebar();
	const navigate = useNavigate();
	const match_route = useMatchRoute();

	const delete_article_mutation = useMutation({
		mutationFn: useConvexMutation(api.articles.soft_delete),
	});

	const restore_article_mutation = useMutation({
		mutationFn: useConvexMutation(api.articles.restore),
	});

	// keep existing published->draft flow
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
		// for already-deleted items, trigger the hard-delete confirmation dialog
		delete_component = (
			<DropdownMenuItem
				onClick={() => {
					setOpen(true);
				}}
			>
				<Trash2Icon size={14} className="text-muted-foreground" />
				<span>Trajno zbriši</span>
			</DropdownMenuItem>
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

/**
 * DeleteAlertDialog - confirmation dialog for hard delete.
 * Controlled via open + setOpen from SubItemRow.
 */
export function DeleteAlertDialog({
	article_id,
	slug,
	status,
	open,
	setOpen,
}: {
	article_id: string;
	slug: string;
	status: string;
	open: boolean;
	setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const navigate = useNavigate();
	const match_route = useMatchRoute();

	const hard_delete_article_mutation = useMutation({
		mutationFn: useConvexMutation(api.articles.hard_delete),
	});

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Potrdi trajno brisanje</AlertDialogTitle>
					<AlertDialogDescription>
						Tega ni mogoče razveljaviti.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => setOpen(false)}>
						Prekliči
					</AlertDialogCancel>
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
								article_id: article_id as Id<"articles">,
							});

							setOpen(false);

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
}
