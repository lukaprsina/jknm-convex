import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { media_validator } from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ImageIcon, Upload } from "lucide-react";
import { usePluginOption } from "platejs/react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import * as Masonry from "~/components/ui/masonry";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { SavePlugin } from "../plugins/save-kit";
import SingleImageUpload from "../single-image-upload";

interface ImageCardProps {
	image: typeof media_validator.type;
	isSelected: boolean;
	onSelect: () => void;
}

function ImageCard({ image, isSelected, onSelect }: ImageCardProps) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);

	const dimensions = image.variants?.original;
	const aspectRatio =
		dimensions?.width && dimensions?.height
			? dimensions.width / dimensions.height
			: 1;

	return (
		<Card
			className={cn(
				"group relative cursor-pointer overflow-hidden border-2 transition-all duration-200 hover:border-primary/50",
				isSelected && "border-primary ring-2 ring-primary/20",
			)}
			onClick={onSelect}
		>
			<CardContent className="p-0">
				{!imageLoaded && !imageError && (
					<Skeleton
						className="w-full rounded-none"
						style={{ aspectRatio: aspectRatio }}
					/>
				)}
				{!imageError && (
					<img
						src={image.storage_path}
						alt={image.filename}
						className={cn(
							"w-full object-cover transition-opacity duration-300",
							imageLoaded ? "opacity-100" : "opacity-0",
						)}
						style={{ aspectRatio: aspectRatio }}
						onLoad={() => setImageLoaded(true)}
						onError={() => setImageError(true)}
					/>
				)}
				{imageError && (
					<div
						className="flex items-center justify-center bg-muted text-muted-foreground"
						style={{ aspectRatio: aspectRatio }}
					>
						<ImageIcon className="h-8 w-8" />
					</div>
				)}

				{/* Selection indicator */}
				{isSelected && (
					<div className="absolute top-2 right-2 rounded-full bg-primary p-1 text-primary-foreground">
						<Check className="h-4 w-4" />
					</div>
				)}

				{/* Hover overlay */}
				<div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
			</CardContent>
		</Card>
	);
}

function _SkeletonCard() {
	return (
		<Card className="overflow-hidden">
			<CardContent className="p-0">
				<Skeleton className="aspect-square w-full rounded-none" />
			</CardContent>
		</Card>
	);
}

export function ImageSelector({
	selectedImage,
	setSelectedImage,
}: {
	selectedImage: Doc<"media"> | undefined;
	setSelectedImage: (imageId: Doc<"media"> | undefined) => void;
}) {
	const article_id = usePluginOption(SavePlugin, "article_id");

	const { data: images_for_article } = useSuspenseQuery(
		convexQuery(api.media.get_for_article, {
			article_id: article_id as Id<"articles">,
		}),
	);

	const _skeletonIds = Array.from(
		{ length: 6 },
		() => `skeleton-${Math.random().toString(36).substring(2, 9)}`,
	);

	useEffect(() => {
		const first_image = images_for_article.media.at(0);
		if (!first_image || selectedImage) return;

		setSelectedImage(first_image);
	}, [selectedImage, setSelectedImage, images_for_article.media]);

	return (
		<div className="p-6">
			<div className="mb-4">
				<h3 className="mb-2 font-semibold text-lg">
					Izberi sliko za naslovnico
				</h3>
			</div>

			<Tabs defaultValue="existing" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="existing" className="flex items-center gap-2">
						<ImageIcon className="h-4 w-4" />
						Obstoječe slike
					</TabsTrigger>
					<TabsTrigger value="upload" className="flex items-center gap-2">
						<Upload className="h-4 w-4" />
						Naloži novo
					</TabsTrigger>
				</TabsList>

				<TabsContent value="existing" className="mt-4">
					{images_for_article.media.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
							<p className="text-muted-foreground">
								V tem članku ni še nobenih slik.
							</p>
							<p className="mt-1 text-muted-foreground text-sm">
								Naloži sliko v zavihku "Naloži novo" ali dodaj slike v
								urejevalnik.
							</p>
						</div>
					) : (
						<ScrollArea className="h-[400px]">
							<Masonry.Root
								columnCount={3}
								// gap={{ column: 12, row: 12 }}
								gap={{ column: 8, row: 8 }}
								className="w-full"
								/* fallback={
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
										{skeletonIds.map((id) => (
											<SkeletonCard key={id} />
										))}
									</div>
								} */
							>
								{images_for_article.media.map((image) => (
									<Masonry.Item
										key={image._id}
										className="relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
									>
										<ImageCard
											image={image}
											isSelected={selectedImage?._id === image._id}
											onSelect={() => {
												setSelectedImage(
													selectedImage?._id === image._id ? undefined : image,
												);
											}}
										/>
									</Masonry.Item>
								))}
							</Masonry.Root>
						</ScrollArea>
					)}
				</TabsContent>

				<TabsContent value="upload" className="mt-4">
					<SingleImageUpload
						selectedImage={selectedImage}
						setSelectedImage={setSelectedImage}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
