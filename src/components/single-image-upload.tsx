import type { Doc, Id } from "@convex/_generated/dataModel";
import {
	AlertCircleIcon,
	CheckCircleIcon,
	ImageUpIcon,
	XIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useConvexFileUpload } from "~/hooks/use-file-upload-convex";
import type { FileMetadata } from "~/hooks/use-file-upload-dnd";

// TODO: selected se ne pojavi pri uploadedFiles

// Single image uploader w/ max size and Convex backend integration
export default function SingleImageUpload({
	selectedImage,
	setSelectedImage,
}: {
	selectedImage: Doc<"media"> | undefined;
	setSelectedImage: (imageId: Doc<"media"> | undefined) => void;
}) {
	const maxSizeMB = 5;
	const maxSize = maxSizeMB * 1024 * 1024; // 5MB default

	const initialFiles = useMemo(() => {
		console.log("Initial image data:", { selectedImage });
		if (!selectedImage) return [];

		return [
			{
				id: selectedImage._id,
				name: selectedImage.filename,
				size: selectedImage.size_bytes,
				type: selectedImage.content_type,
				url: selectedImage.storage_path,
			} satisfies FileMetadata,
		];
	}, [selectedImage]);

	const [
		{ files, isDragging, errors, isUploading, progress, uploadedFiles },
		{
			handleDragEnter,
			handleDragLeave,
			handleDragOver,
			handleDrop,
			openFileDialog,
			removeFile,
			getInputProps,
		},
	] = useConvexFileUpload({
		initialFiles,
		accept: "image/*",
		maxSize,
		onUploadComplete: (file) => {
			console.log("Upload completed:", file);
			const file_metadata = {
				_id: file.key as Id<"media">,
				filename: file.name,
				size_bytes: file.size,
				content_type: file.type,
				storage_path: file.url,

				// will ignore
				created_at: Date.now(),
				upload_status: "completed",
				variants: undefined,
				_creationTime: Date.now(),
			} satisfies Doc<"media">;

			setSelectedImage(file_metadata);
		},
		onUploadError: (error) => {
			console.error("Upload error:", error);
		},
		onUploadBegin: (fileName) => {
			console.log("Upload started:", fileName);
		},
		onUploadProgress: (progress) => {
			console.log("Upload progress:", progress);
		},
	});

	const previewUrl = files[0]?.preview || null;
	const hasUploadedFile = uploadedFiles.length > 0;

	return (
		<div className="flex flex-col gap-2">
			<div className="relative">
				{/* Drop area */}
				{/** biome-ignore lint/a11y/useSemanticElements: TODO */}
				<div
					role="button"
					tabIndex={0}
					onClick={openFileDialog}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							openFileDialog();
						}
					}}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					data-dragging={isDragging || undefined}
					className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring has-disabled:pointer-events-none has-[input:focus]:border-ring has-[img]:border-none has-disabled:opacity-50 has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
				>
					<input
						{...getInputProps()}
						className="sr-only"
						aria-label="Upload file"
						disabled={isUploading}
					/>
					{previewUrl ? (
						<div className="absolute inset-0">
							<img
								src={previewUrl}
								alt={files[0]?.file?.name || "Uploaded image"}
								className="size-full object-cover"
							/>
							{/* Upload progress overlay */}
							{isUploading && (
								<div className="absolute inset-0 flex items-center justify-center bg-black/50">
									<div className="text-center text-white">
										<div className="mb-2 font-medium text-sm">Uploading...</div>
										<div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
											<div
												className="h-full bg-blue-500 transition-all duration-300"
												style={{ width: `${progress}%` }}
											/>
										</div>
										<div className="mt-1 text-xs">{Math.round(progress)}%</div>
									</div>
								</div>
							)}
							{/* Upload complete indicator */}
							{hasUploadedFile && !isUploading && (
								<div className="absolute top-4 left-4">
									<div className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-white text-xs">
										<CheckCircleIcon className="size-3" />
										<span>Uploaded</span>
									</div>
								</div>
							)}
							{/* Selected as thumbnail indicator */}
							{uploadedFiles.length > 0 &&
								selectedImage?._id ===
									(uploadedFiles[0].key as Id<"media">) && (
									<div className="absolute top-4 right-4">
										<div className="flex items-center gap-1 rounded-full bg-blue-500 px-2 py-1 text-white text-xs">
											<CheckCircleIcon className="size-3" />
											<span>Selected</span>
										</div>
									</div>
								)}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center px-4 py-3 text-center">
							<div
								className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
								aria-hidden="true"
							>
								<ImageUpIcon className="size-4 opacity-60" />
							</div>
							<p className="mb-1.5 font-medium text-sm">
								Drop your image here or click to browse
							</p>
							<p className="text-muted-foreground text-xs">
								Max size: {maxSizeMB}MB
							</p>
							{isUploading && (
								<div className="mt-2 text-blue-600 text-sm">
									Uploading... {Math.round(progress)}%
								</div>
							)}
						</div>
					)}
				</div>
				{previewUrl && !isUploading && (
					<div className="absolute top-4 right-4">
						<button
							type="button"
							className="z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
							onClick={() => {
								// If this uploaded file is selected as thumbnail, deselect it
								if (
									uploadedFiles.length > 0 &&
									selectedImage?._id === (uploadedFiles[0].key as Id<"media">)
								) {
									setSelectedImage(undefined);
								}
								removeFile(files[0]?.id);
							}}
							aria-label="Remove image"
						>
							<XIcon className="size-4" aria-hidden="true" />
						</button>
					</div>
				)}
			</div>

			{errors.length > 0 && (
				<div
					className="flex items-center gap-1 text-destructive text-xs"
					role="alert"
				>
					<AlertCircleIcon className="size-3 shrink-0" />
					<span>{errors[0]}</span>
				</div>
			)}

			{/* Upload status */}
			{uploadedFiles.length > 0 && (
				<div className="text-center text-muted-foreground text-xs">
					Successfully uploaded {uploadedFiles.length} file(s)
				</div>
			)}

			<section
				aria-live="polite"
				className="mt-2 text-center text-muted-foreground text-xs"
			>
				Upload custom thumbnail image for this article
			</section>
		</div>
	);
}
