"use client";

import { useCallback, useEffect, useState } from "react";
import {
	type FileUploadActions,
	type FileUploadOptions,
	type FileUploadState,
	type FileWithPreview,
	useFileUpload,
} from "./use-file-upload-dnd";
import { useUploadFile } from "./use-file-upload-raw";

export interface ConvexFileUploadOptions extends FileUploadOptions {
	onUploadComplete?: (file: {
		key: string;
		url: string;
		name: string;
		size: number;
		type: string;
	}) => void;
	onUploadError?: (error: unknown) => void;
	onUploadBegin?: (fileName: string) => void;
	onUploadProgress?: (progress: { progress: number }) => void;
	autoUpload?: boolean; // Whether to automatically upload files when they're added
}

export interface ConvexFileUploadState extends FileUploadState {
	isUploading: boolean;
	progress: number;
	uploadingFile?: File;
	uploadedFiles: Array<{
		key: string;
		url: string;
		name: string;
		size: number;
		type: string;
	}>;
}

export interface ConvexFileUploadActions extends FileUploadActions {
	uploadFile: (file: File) => void;
	uploadFiles: (files: File[]) => void;
	resetUpload: () => void;
}

export const useConvexFileUpload = (
	options: ConvexFileUploadOptions = {},
): [ConvexFileUploadState, ConvexFileUploadActions] => {
	const {
		onUploadComplete,
		onUploadError,
		onUploadBegin,
		onUploadProgress,
		autoUpload = true,
		...fileUploadOptions
	} = options;

	const [uploadedFiles, setUploadedFiles] = useState<
		Array<{
			key: string;
			url: string;
			name: string;
			size: number;
			type: string;
		}>
	>([]);
	const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
	const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

	// Initialize the raw upload hook
	const {
		isUploading,
		progress,
		uploadFile: rawUploadFile,
		uploadingFile,
		reset,
	} = useUploadFile({
		onUploadComplete: (file) => {
			setUploadedFiles((prev) => [...prev, file]);
			onUploadComplete?.(file);

			// Upload next file if there are more
			if (currentUploadIndex + 1 < filesToUpload.length) {
				setCurrentUploadIndex((prev) => prev + 1);
			} else {
				// All files uploaded, reset the queue
				setFilesToUpload([]);
				setCurrentUploadIndex(0);
			}
		},
		onUploadError: (error) => {
			onUploadError?.(error);
			// Reset the queue on error
			setFilesToUpload([]);
			setCurrentUploadIndex(0);
		},
		onUploadBegin,
		onUploadProgress,
	});

	// Handle auto-upload when files are added
	const handleFilesAdded = useCallback(
		(addedFiles: FileWithPreview[]) => {
			if (autoUpload) {
				const newFiles = addedFiles
					.map((f) => f.file)
					.filter((file): file is File => file instanceof File);

				if (newFiles.length > 0) {
					setFilesToUpload((prev) => [...prev, ...newFiles]);
				}
			}
		},
		[autoUpload],
	);

	// Initialize the OriginUI file upload hook
	const [state, actions] = useFileUpload({
		...fileUploadOptions,
		onFilesAdded: handleFilesAdded,
	});

	// Upload files sequentially when filesToUpload changes
	useEffect(() => {
		if (
			filesToUpload.length > 0 &&
			currentUploadIndex < filesToUpload.length &&
			!isUploading
		) {
			const fileToUpload = filesToUpload[currentUploadIndex];
			if (fileToUpload) {
				rawUploadFile(fileToUpload);
			}
		}
	}, [filesToUpload, currentUploadIndex, isUploading, rawUploadFile]);

	// Manual upload functions
	const uploadFile = useCallback(
		(file: File) => {
			if (!isUploading) {
				setFilesToUpload([file]);
				setCurrentUploadIndex(0);
			}
		},
		[isUploading],
	);

	const uploadFiles = useCallback(
		(files: File[]) => {
			if (!isUploading && files.length > 0) {
				setFilesToUpload(files);
				setCurrentUploadIndex(0);
			}
		},
		[isUploading],
	);

	const resetUpload = useCallback(() => {
		reset();
		setUploadedFiles([]);
		setFilesToUpload([]);
		setCurrentUploadIndex(0);
	}, [reset]);

	// Enhanced state with upload information
	const enhancedState: ConvexFileUploadState = {
		...state,
		isUploading,
		progress,
		uploadingFile,
		uploadedFiles,
	};

	// Enhanced actions with upload functions
	const enhancedActions: ConvexFileUploadActions = {
		...actions,
		uploadFile,
		uploadFiles,
		resetUpload,
	};

	return [enhancedState, enhancedActions];
};

export { formatBytes } from "./use-file-upload-dnd";
