import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEditorRef, usePluginOption } from "platejs/react";
import { useState } from "react";
import { ImageSelector } from "~/components/plate-ui/image-selector";
import PublishImageCropper from "~/components/plate-ui/publish-image-cropper";
import { PublishPlugin } from "~/components/plugins/save-kit";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";

type PublishMutation = typeof api.articles.publish_draft;
const admin_draft_route = getRouteApi("/admin/osnutki/$draft_id/uredi/");

export function PublishDialog() {
	const open = usePluginOption(PublishPlugin, "open_dialogue");
	const article_id = usePluginOption(PublishPlugin, "article_id");
	const editor = useEditorRef();
	const [selectedImage, setSelectedImage] = useState<
		Doc<"media"> | undefined
	>();
	const navigate = admin_draft_route.useNavigate();

	const publish_mutation = useMutation<
		PublishMutation["_returnType"],
		Error,
		PublishMutation["_args"]
	>({
		mutationFn: useConvexMutation(api.articles.publish_draft),
		onSuccess: (data) => {
			if (!data) return;

			console.log("Article published successfully:", data);
			navigate({
				from: "/admin/osnutki/$draft_id/uredi",
				to: "/novica/$article_slug",
				params: {
					article_slug: data.slug,
				},
			});
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(new_open) =>
				editor.setOption(PublishPlugin, "open_dialogue", new_open)
			}
		>
			{/* sm:max-w-lg [&>button:last-child]:hidden  sm:max-h-[min(640px,80vh)] */}
			<DialogContent
				aria-describedby={undefined}
				className="flex flex-col gap-0 p-0 sm:max-h-[min(900px,80vh)] sm:max-w-3xl "
			>
				<div className="overflow-y-hidden">
					<DialogHeader className="contents space-y-0 text-left">
						<DialogTitle className="px-6 pt-6">Objavi novico</DialogTitle>
					</DialogHeader>
					{selectedImage && (
						<PublishImageCropper className="m-10" image={selectedImage} />
					)}
					<ImageSelector
						selectedImage={selectedImage}
						setSelectedImage={setSelectedImage}
					/>
					<DialogFooter className="px-6 pb-6 sm:justify-start">
						<DialogClose asChild>
							<Button variant="outline">Prekliči</Button>
						</DialogClose>
						<DialogClose
							asChild
							onClick={() => {
								if (!article_id || !editor) return;
								const content_json = JSON.stringify(editor.children);
								publish_mutation.mutate({ article_id, content_json });
							}}
						>
							<Button variant="destructive">Objavi</Button>
						</DialogClose>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
