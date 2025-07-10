import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useState } from "react";

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

	// Hook for getting presigned URL from Convex
	const getPresignedUrl = useConvexMutation(
		api.media.generate_presigned_upload_url,
	);

	// The main upload mutation that chains both operations
	const mutation = useMutation<UploadedFile, Error, File>({
		mutationFn: async (file: File) => {
			// Step 1: Get presigned URL from Convex
			const presignedData = await getPresignedUrl({
				filename: file.name,
				content_type: file.type,
				size_bytes: file.size,
			});

			/* // Step 2: Upload file to S3 using presigned URL
			const formData = new FormData();

			// Add all fields from presigned URL response
			Object.entries(presignedData).forEach(([key, value]) => {
				formData.append(key, value as string);
			});

			// Add the file last (as required by S3)
			formData.append("file", file); */

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
				// https://www.reddit.com/r/backblaze/comments/1f4zplk/backblaze_multipart_upload_with_presigned_url/
				// https://github.com/backblaze-b2-samples/b2-browser-upload
				// B2 doesn't support POST for presigned URLs, so we use PUT
				xhr.open("PUT", presignedData.url);
				xhr.setRequestHeader("Content-Type", file.type);
				xhr.send(file_content);
			});

			// Step 3: Construct the final file URL
			// This depends on your S3 configuration
			const fileUrl = `${process.env.NEXT_PUBLIC_AWS_S3_BASE_URL}/${presignedData.key}`;

			return {
				key: presignedData.media_db_id,
				url: fileUrl,
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
		onSuccess: (uploadedFile) => {
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
