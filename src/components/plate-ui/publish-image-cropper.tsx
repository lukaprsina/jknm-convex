import {
	Cropper,
	CropperCropArea,
	CropperDescription,
	CropperImage,
} from "~/components/ui/cropper";

export default function PublishImageCropper() {
	return (
		<div className="flex flex-col items-center gap-2">
			<Cropper
				className="h-80"
				image="https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/cropper-01_bcxaic.jpg"
			>
				<CropperDescription />
				<CropperImage />
				<CropperCropArea />
			</Cropper>
		</div>
	);
}
