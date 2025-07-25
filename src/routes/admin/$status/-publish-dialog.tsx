import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEditorRef, usePluginOption } from "platejs/react";
import { useState } from "react";
import AuthorMultiselect from "~/components/author-mutliselect";
import DatePickerDemo from "~/components/date-time";
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
import type { Option } from "~/components/ui/multiselect";

type PublishMutation = typeof api.articles.publish_draft;
const admin_draft_route = getRouteApi("/admin/$status/$article_slug/uredi/");

export function PublishDialog() {
	const today = new Date();
	const [date, setDate] = useState<Date | undefined>(today);
	const [time, setTime] = useState<string | undefined>("12:00");
	const [authors, setAuthors] = useState<Option[]>([]);

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

			navigate({
				from: "/admin/$status/$article_slug/uredi",
				to: "/admin/$status/$article_slug",
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
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="px-6 pt-6">Objavi novico</DialogTitle>
				</DialogHeader>
				<DatePickerDemo
					date={date}
					setDate={setDate}
					time={time}
					setTime={setTime}
				/>
				<AuthorMultiselect authors={authors} onAuthorsChange={setAuthors} />
				<div className="overflow-y-auto">
					{selectedImage && (
						<PublishImageCropper className="m-10" image={selectedImage} />
					)}
					<ImageSelector
						selectedImage={selectedImage}
						setSelectedImage={setSelectedImage}
					/>
				</div>
				<DialogFooter className="px-6 pb-6 sm:justify-start">
					<DialogClose asChild>
						<Button variant="outline">Prekliči</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button
							variant="destructive"
							onClick={() => {
								if (!article_id || !editor || !date || !selectedImage) return;
								const content_json = JSON.stringify(editor.children);
								const published_at = new Date(date);
								if (time) {
									const [hours, minutes] = time.split(":").map(Number);
									published_at.setHours(hours, minutes, 0, 0);
								}

								// TODO: change image shape
								publish_mutation.mutate({
									article_id,
									content_json,
									author_ids: authors.map((a) => a.value),
									published_at: published_at.getTime(),
									thumbnail: {
										image_id: selectedImage._id,
										height: 1500, // selectedImage?.height,
										width: 800, // selectedImage?.width,
										x: 0,
										y: 0,
									},
								});
							}}
						>
							Objavi
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
