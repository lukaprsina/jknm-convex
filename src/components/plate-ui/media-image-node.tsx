"use client";

import { useDraggable } from "@platejs/dnd";
import { Image, ImagePlugin, useMediaState } from "@platejs/media/react";
import { ResizableProvider, useResizableValue } from "@platejs/resizable";
import type { TImageElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, withHOC } from "platejs/react";

import { cn } from "~/lib/utils";

import { Caption, CaptionTextarea } from "./caption";
import { MediaToolbar } from "./media-toolbar";
import {
	mediaResizeHandleVariants,
	Resizable,
	ResizeHandle,
} from "./resize-handle";

// packages/media/src/react/image/components/Image.tsx
/* const useImage = () => {
	const element = useElement<TMediaElement>();
	const editor = useEditorRef();

	// https://jknm-gradivo.s3.eu-central-003.backblazeb2.com/jh79zr5b0sb7w7b7td8ckz0msh7khebn/original.jpg
	return {
		props: {
			draggable: true,
			src: element.url,
			// src: `https://${import.meta.env.VITE_AWS_BUCKET_NAME}.s3.${import.meta.env.VITE_AWS_REGION}.backblazeb2.com/${element.url}`,
			// src: `https://gradivo.jknm.site/${element.url}`,
			onDoubleClickCapture: () => {
				openImagePreview(editor, element);
			},
		},
	};
};

const Image = createPrimitiveComponent("img")({
	propsHook: useImage,
}); */

export const ImageElement = withHOC(
	ResizableProvider,
	function ImageElement(props: PlateElementProps<TImageElement>) {
		const { align = "center", focused, readOnly, selected } = useMediaState();
		const width = useResizableValue("width");

		const { isDragging, handleRef } = useDraggable({
			element: props.element,
		});

		return (
			<MediaToolbar plugin={ImagePlugin}>
				<PlateElement {...props} className="py-2.5">
					<figure className="group relative m-0" contentEditable={false}>
						<Resizable
							align={align}
							options={{
								align,
								readOnly,
							}}
						>
							<ResizeHandle
								className={mediaResizeHandleVariants({ direction: "left" })}
								options={{ direction: "left" }}
							/>
							<Image
								ref={handleRef}
								className={cn(
									"block w-full max-w-full cursor-pointer object-cover px-0",
									"rounded-sm",
									focused && selected && "ring-2 ring-ring ring-offset-2",
									isDragging && "opacity-50",
								)}
								alt={(props.attributes as any).alt}
							/>
							<ResizeHandle
								className={mediaResizeHandleVariants({
									direction: "right",
								})}
								options={{ direction: "right" }}
							/>
						</Resizable>

						<Caption style={{ width }} align={align}>
							<CaptionTextarea
								readOnly={readOnly}
								onFocus={(e) => {
									e.preventDefault();
								}}
								placeholder="Write a caption..."
							/>
						</Caption>
					</figure>

					{props.children}
				</PlateElement>
			</MediaToolbar>
		);
	},
);
