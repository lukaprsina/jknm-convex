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

/**
 * Alternative implementation using separate mutations for each step.
 * This approach gives you more granular control over each step of the upload process.
 */
export function useUploadFileAlternative({
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

	// Step 1: Get presigned URL mutation
	const presignedUrlMutation = useMutation<
		typeof api.media.generate_presigned_upload_url._returnType,
		Error,
		{ filename: string; content_type: string; size_bytes: number }
	>({
		mutationFn: useConvexMutation(api.media.generate_presigned_upload_url),
		onSuccess: (presignedData) => {
			// Automatically trigger S3 upload when presigned URL is ready
			if (uploadingFile) {
				s3UploadMutation.mutate({ presignedData, file: uploadingFile });
			}
		},
		onError: (error) => {
			setIsUploading(false);
			onUploadError?.(error);
		},
	});

	// Step 2: S3 upload mutation
	const s3UploadMutation = useMutation<
		UploadedFile,
		Error,
		{
			presignedData: typeof api.media.generate_presigned_upload_url._returnType;
			file: File;
		}
	>({
		mutationFn: async ({ presignedData, file }) => {
			const formData = new FormData();

			// Add all fields from presigned URL response
			Object.entries(presignedData.fields).forEach(([key, value]) => {
				formData.append(key, value as string);
			});

			// Add the file last (as required by S3)
			formData.append("file", file);

			// Upload to S3 with progress tracking
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
						reject(new Error(`Upload failed with status ${xhr.status}`));
					}
				});

				xhr.addEventListener("error", () => {
					reject(new Error("Upload failed"));
				});

				xhr.open("POST", presignedData.url);
				xhr.send(formData);
			});

			// Construct the final file URL
			const fileUrl = `${process.env.NEXT_PUBLIC_AWS_S3_BASE_URL}/${presignedData.key}`;

			return {
				key: presignedData.media_db_id,
				url: fileUrl,
				name: file.name,
				size: file.size,
				type: file.type,
			};
		},
		onSuccess: (uploadedFile) => {
			setUploadedFile(uploadedFile);
			setIsUploading(false);
			onUploadComplete?.(uploadedFile);
		},
		onError: (error) => {
			setIsUploading(false);
			onUploadError?.(error);
		},
		onSettled: () => {
			setProgress(0);
		},
	});

	const uploadFile = (file: File) => {
		setIsUploading(true);
		setUploadingFile(file);
		setProgress(0);
		onUploadBegin?.(file.name);

		// Start the upload process by getting presigned URL
		presignedUrlMutation.mutate({
			filename: file.name,
			content_type: file.type,
			size_bytes: file.size,
		});
	};

	const reset = () => {
		setUploadedFile(null);
		setUploadingFile(undefined);
		setProgress(0);
		setIsUploading(false);
		presignedUrlMutation.reset();
		s3UploadMutation.reset();
	};

	return {
		isUploading,
		progress,
		uploadFile,
		uploadedFile,
		uploadingFile,
		reset,
		// Expose individual mutation states for fine-grained control
		presignedUrl: {
			isLoading: presignedUrlMutation.isPending,
			error: presignedUrlMutation.error,
			isError: presignedUrlMutation.isError,
		},
		s3Upload: {
			isLoading: s3UploadMutation.isPending,
			error: s3UploadMutation.error,
			isError: s3UploadMutation.isError,
		},
		// Overall state
		error: presignedUrlMutation.error || s3UploadMutation.error,
		isError: presignedUrlMutation.isError || s3UploadMutation.isError,
		isSuccess: s3UploadMutation.isSuccess,
	};
}
