import type { Id } from "@convex/_generated/dataModel";

export function ImageSelector({
	selectedImage,
	setSelectedImage,
}: {
	selectedImage: Id<"media"> | undefined;
	setSelectedImage: (imageId: Id<"media"> | undefined) => void;
}) {
	return (
		<div>
			<p>Selected Image ID: {selectedImage?.toString() || "None"}</p>
		</div>
	);
}
