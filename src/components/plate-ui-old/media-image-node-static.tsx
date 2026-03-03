import type {
	SlateElementProps,
	TCaptionProps,
	TImageElement,
	TResizableProps,
} from "platejs";
import { NodeApi, SlateElement } from "platejs";
import { use } from "react";
import { MediaContext } from "~/lib/media-context";

export function ImageElementStatic(
	props: SlateElementProps<TImageElement & TCaptionProps & TResizableProps>,
) {
	const { align = "center", caption, url, width } = props.element;
	const { media_map } = use(MediaContext);

	const image = media_map.get(url);
	if (!image) return null;

	return (
		<SlateElement {...props} className="py-2.5">
			<figure className="group relative m-0 inline-block" style={{ width }}>
				<div
					className="relative min-w-[92px] max-w-full"
					style={{ textAlign: align }}
				>
					<picture>
						{image.srcsets?.avif && (
							<source
								srcSet={image.srcsets.avif}
								sizes={image.srcsets.sizes}
								type="image/avif"
							/>
						)}
						{image.srcsets?.jpeg && (
							<source
								srcSet={image.srcsets.jpeg}
								sizes={image.srcsets.sizes}
								type="image/jpeg"
							/>
						)}
						<img
							src={image.original.url}
							alt={caption ? NodeApi.string(caption[0]) : ""}
							loading="lazy"
							width={image.original.width}
							height={image.original.height}
							style={{
								backgroundImage: image.blur_placeholder
									? `url(${image.blur_placeholder})`
									: undefined,
								backgroundSize: "cover",
								backgroundRepeat: "no-repeat",
								backgroundPosition: "center",
							}}
						/>
					</picture>
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
