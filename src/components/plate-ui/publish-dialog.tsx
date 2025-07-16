import type { Id } from "@convex/_generated/dataModel";
import { useEditorRef, usePluginOption } from "platejs/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { PublishPlugin } from "../plugins/save-kit";
import { ImageSelector } from "./image-selector";
import PublishImageCropper from "./publish-image-cropper";

export function PublishDialog() {
	const open = usePluginOption(PublishPlugin, "open_dialogue");
	const editor = useEditorRef();
	const [selectedImage, setSelectedImage] = useState<Id<"media"> | undefined>();

	return (
		<Dialog
			open={open}
			onOpenChange={(new_open) =>
				editor.setOption(PublishPlugin, "open_dialogue", new_open)
			}
		>
			{/* sm:max-w-lg [&>button:last-child]:hidden  sm:max-h-[min(640px,80vh)] */}
			<DialogContent className="flex flex-col gap-0 p-0 sm:max-h-[min(800px,80vh)] sm:max-w-3xl ">
				<div className="overflow-y-auto">
					<DialogHeader className="contents space-y-0 text-left">
						<DialogTitle className="px-6 pt-6">Objavi novico</DialogTitle>
					</DialogHeader>
					<ImageSelector
						selectedImage={selectedImage}
						setSelectedImage={setSelectedImage}
					/>
					{selectedImage && (
						<PublishImageCropper className="m-10" image_id={selectedImage} />
					)}
					<DialogFooter className="px-6 pb-6 sm:justify-start">
						<DialogClose asChild>
							<Button variant="outline">Prekliči</Button>
						</DialogClose>
						<DialogClose asChild>
							<Button variant="destructive">Objavi</Button>
						</DialogClose>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
