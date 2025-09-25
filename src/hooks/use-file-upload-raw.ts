import type { Id } from "@convex/_generated/dataModel";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useConvex } from "convex/react";
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
	const convex = useConvex();
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
			// Step 1: Record intent (creates media record and schedules presign action)
			const upload_info = await get_presigned_url({
				filename: file.name,
				content_type: file.type,
				size_bytes: file.size,
			});
			const file_content = await file.arrayBuffer();

			// Step 2: Poll for presigned URL availability
			const media_id = upload_info.key as Id<"media">;
			let presigned_url: string | undefined;

			const max_wait_ms = 60_000; // 60s
			const interval_ms = 1_000; // 1s
			const start_time = Date.now();
			// Imperatively call query via Convex client
			while (Date.now() - start_time < max_wait_ms) {
				const intent = await convex.query(api.media.get_upload_intent, {
					id: media_id,
				});
				if (intent.upload_error) {
					throw new Error(
						`Failed to create presigned URL: ${intent.upload_error}`,
					);
				}
				if (intent.presigned_url) {
					presigned_url = intent.presigned_url;
					break;
				}
				await new Promise((r) => setTimeout(r, interval_ms));
			}

			if (!presigned_url) {
				throw new Error("Timed out waiting for presigned URL");
			}

			// Step 3: Upload to B2 with progress tracking using XMLHttpRequest
			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest();

				xhr.upload.addEventListener("progress", (event) => {
					if (event.lengthComputable) {
						const progress_percent = (event.loaded / event.total) * 100;
						setProgress(progress_percent);
						onUploadProgress?.({ progress: progress_percent });
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
				xhr.open("PUT", presigned_url!);
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
