import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import type { Doc } from "convex/_generated/dataModel";
import { ArchiveRestoreIcon, EditIcon, Trash2Icon } from "lucide-react";
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
import { Button } from "~/components/ui/button";
import { useCopyPublishedIntoDraftMutation } from "../-article-sidebar";

export function CardButtons({ article }: { article: Doc<"articles"> }) {
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
	if (article.status === "draft") {
		edit_component = (
			<Button variant="outline" asChild>
				<Link
					to="/admin/$status/$article_slug/uredi"
					params={{ article_slug: article.slug, status: article.status }}
				>
					<EditIcon />
				</Link>
			</Button>
		);
	} else if (article.status === "published") {
		edit_component = (
			<Button
				variant="outline"
				onClick={() => {
					copy_published_into_draft_mutation.mutate({
						article_id: article._id,
					});
				}}
			>
				<EditIcon />
			</Button>
		);
	} else {
		edit_component = null;
	}

	let delete_component: React.ReactNode;
	if (article.status === "deleted") {
		delete_component = (
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant="destructive">
						<Trash2Icon size={14} className="text-muted-foreground" />
						<span>Trajno zbriši</span>
					</Button>
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
										article_slug: article.slug,
										status: article.status,
									},
									fuzzy: true,
								});

								hard_delete_article_mutation.mutate({
									article_id: article._id,
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
			<Button
				variant="destructive"
				onClick={() => {
					const is_viewing = match_route({
						to: "/admin/$status/$article_slug",
						params: { article_slug: article.slug, status: article.status },
						fuzzy: true,
					});

					delete_article_mutation.mutate({ article_id: article._id });

					if (is_viewing) {
						navigate({
							to: "/admin",
						});
					}
				}}
			>
				<Trash2Icon size={14} className="text-muted-foreground" />
				<span>Zbriši</span>
			</Button>
		);
	}

	let restore_component: React.ReactNode;
	if (article.status === "deleted") {
		restore_component = (
			<Button
				variant="outline"
				onClick={() => {
					restore_article_mutation.mutate({ article_id: article._id });
				}}
			>
				<ArchiveRestoreIcon size={14} className="text-muted-foreground" />
				<span>Obnovi</span>
			</Button>
		);
	} else {
		restore_component = null;
	}

	/* Buttons positioned absolutely */
	return (
		<div className="absolute top-4 right-4 ml-auto flex gap-2">
			{edit_component}
			{restore_component}
			{delete_component}
		</div>
	);
}
