import type { Id } from "@convex/_generated/dataModel";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { usePluginOption } from "platejs/react";
import { useState } from "react";
import { SavePlugin } from "~/components/plugins/save-kit";

interface UseUploadFileProps {
	onUploadComplete?: (file: UploadedFile) => void;
	onUploadError?: (error: unknown) => void;
	headers?: Record<string, string>;
	onUploadBegin?: (fileName: string) => void;
	onUploadProgress?: (progress: { progress: number }) => void;
	skipPolling?: boolean;
}

interface UploadedFile {
	key: string; // Unique identifier
	url: string; // Public URL of the uploaded file
	name: string; // Original filename
	size: number; // File size in bytes
	type: string; // MIME type
}

export function useUploadFile({
	onUploadComplete,
	onUploadError,
	onUploadProgress,
	onUploadBegin,
}: UseUploadFileProps = {}) {
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
	const [uploadingFile, setUploadingFile] = useState<File | undefined>(
		undefined,
	);
	const article_id = usePluginOption(SavePlugin, "article_id");

	// Hook for getting presigned URL from Convex
	const get_presigned_url = useConvexMutation(
		api.media.generate_presigned_upload_url,
	);

	const confirm_upload = useConvexMutation(api.media.confirm_upload);

	// The main upload mutation that chains both operations
	const mutation = useMutation<UploadedFile, Error, File>({
		mutationFn: async (file: File) => {
			// Step 1: Get presigned URL from Convex
			const upload_info = await get_presigned_url({
				filename: file.name,
				content_type: file.type,
				size_bytes: file.size,
			});

			const file_content = await file.arrayBuffer();

			// Upload to S3 with progress tracking using XMLHttpRequest
			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest();

				xhr.upload.addEventListener("progress", (event) => {
					if (event.lengthComputable) {
						const progressPercent = (event.loaded / event.total) * 100;
						setProgress(progressPercent);
						onUploadProgress?.({ progress: progressPercent });
					}
				});

				xhr.addEventListener("load", () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve();
					} else {
						reject(
							new Error(
								`Upload failed with status ${xhr.status}: ${xhr.statusText}, ${xhr.responseText}, ${xhr.response}`,
							),
						);
					}
				});

				xhr.addEventListener("error", () => {
					reject(new Error("Upload failed"));
				});

				// https://www.backblaze.com/docs/cloud-storage-s3-compatible-api
				// https://github.com/backblaze-b2-samples/b2-browser-upload
				// B2 doesn't support POST for presigned URLs, so we use PUT
				xhr.open("PUT", upload_info.presigned_url);
				xhr.setRequestHeader("Content-Type", file.type);
				xhr.send(file_content);
			});

			return {
				key: upload_info.key, // This is the media DB ID
				url: upload_info.src,
				name: file.name,
				size: file.size,
				type: file.type,
			};
		},
		onMutate: (file) => {
			setIsUploading(true);
			setUploadingFile(file);
			setProgress(0);
			onUploadBegin?.(file.name);
		},
		onSuccess: async (uploadedFile) => {
			if (!article_id) {
				throw new Error("Article ID is required to confirm upload.");
			}

			await confirm_upload({
				media_db_id: uploadedFile.key as Id<"media">,
				article_id,
			});
			setUploadedFile(uploadedFile);
			onUploadComplete?.(uploadedFile);
		},
		onError: (error) => {
			onUploadError?.(error);
		},
		onSettled: () => {
			setIsUploading(false);
			setProgress(0);
			// Don't reset uploadingFile here to keep it available until next upload
		},
	});

	const uploadFile = (file: File) => {
		mutation.mutate(file);
	};

	return {
		isUploading,
		progress,
		uploadFile,
		uploadedFile,
		uploadingFile,
		// Expose mutation state for additional control
		error: mutation.error,
		isError: mutation.isError,
		isSuccess: mutation.isSuccess,
		reset: mutation.reset,
	};
}
