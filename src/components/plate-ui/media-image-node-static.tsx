import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convexQuery } from "@convex-dev/react-query";
import { BasePlaceholderPlugin } from "@platejs/media";
import { useSuspenseQuery } from "@tanstack/react-query";
import type {
	SlateElementProps,
	TCaptionProps,
	TImageElement,
	TResizableProps,
} from "platejs";
import { NodeApi, SlateElement } from "platejs";
import { usePluginOption } from "platejs/react";
import { useEffect } from "react";
import { cn } from "~/lib/utils";
import { ExtendedBasePlaceholderPlugin } from "../plugins/media-base-kit";

export function ImageElementStatic(
	props: SlateElementProps<TImageElement & TCaptionProps & TResizableProps>,
) {
	/* const media_id = usePluginOption(
		ExtendedBasePlaceholderPlugin,
		"media_db_id",
	);

	const { data: image_data } = useSuspenseQuery(
		convexQuery(api.media.get_optimized_urls, {
			media_id: media_id!,
		}),
	); */
	const { align = "center", caption, url, width } = props.element;

	/* useEffect(() => {
		console.log("image_data", image_data);
	}, [image_data]); */

	return (
		<SlateElement {...props} className="py-2.5">
			<figure className="group relative m-0 inline-block" style={{ width }}>
				<div
					className="relative min-w-[92px] max-w-full"
					style={{ textAlign: align }}
				>
					<img
						className={cn(
							"w-full max-w-full cursor-default object-cover px-0",
							"rounded-sm",
						)}
						alt={(props.attributes as any).alt}
						src={url}
					/>
					{caption && (
						<figcaption className="mx-auto mt-2 h-[24px] max-w-full">
							{NodeApi.string(caption[0])}
						</figcaption>
					)}
				</div>
			</figure>
			{props.children}
		</SlateElement>
	);
}
