import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Cropper,
	CropperCropArea,
	CropperDescription,
	CropperImage,
} from "~/components/ui/cropper";
import { cn } from "~/lib/utils";

type PublishImageCropperProps = Omit<
	React.ComponentProps<typeof Cropper>,
	"children" | "image"
> & {
	image: Doc<"media">;
};

export default function PublishImageCropper({
	className,
	image,
	...props
}: PublishImageCropperProps) {
	const { data: image_data } = useSuspenseQuery(
		convexQuery(api.media.get_by_id, {
			id: image._id,
		}),
	);

	return (
		<div className="flex flex-col items-center gap-2">
			<Cropper
				image={image_data.original.url}
				className={cn("h-80", className)}
				{...props}
			>
				<CropperDescription />
				<CropperImage />
				<CropperCropArea />
			</Cropper>
		</div>
	);
}
