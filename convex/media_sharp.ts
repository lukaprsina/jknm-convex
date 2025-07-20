"use node";

import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { v } from "convex/values";
import sharp from "sharp";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { media_validator } from "./schema";

interface VariantData {
	width: number;
	height: number;
	format: "avif" | "jpeg";
	url: string;
	size_bytes: number;
}

interface VariantResult {
	width: number;
	height: number;
	size_bytes: number;
	format: "avif" | "jpeg";
}

async function create_and_upload_variant(
	image: sharp.Sharp,
	s3_client: S3Client,
	image_db_id: Id<"media">,
	width: number,
	format: "avif" | "jpeg",
): Promise<VariantResult> {
	let transformer = image.clone().resize({
		width,
		withoutEnlargement: true, // Don't upscale smaller images
		fit: "inside", // Maintain aspect ratio
	});

	// Apply format-specific optimizations
	if (format === "avif") {
		// AVIF settings optimized for quality and reasonable encoding time
		transformer = transformer.avif({
			quality: 75, // Good balance of quality/size (recommended 70-80)
			effort: 6, // High effort for better compression (0-9, recommended 6-7)
			chromaSubsampling: "4:2:0", // Standard chroma subsampling
		});
	} else if (format === "jpeg") {
		// JPEG settings optimized with mozjpeg features
		transformer = transformer.jpeg({
			quality: 85, // High quality for web (recommended 80-90)
			progressive: true, // Progressive JPEG for better perceived loading
			mozjpeg: true, // Enable mozjpeg encoder for better compression
			optimizeScans: true, // Optimize progressive scans
			trellisQuantisation: true, // Better quantization (slower but smaller)
			overshootDeringing: true, // Reduce ringing artifacts
		});
	}

	const buffer = await transformer.toBuffer({ resolveWithObject: true });
	const variant_name = `${width}w.${format}`;
	const key = `${image_db_id}/${variant_name}`;

	const command = new PutObjectCommand({
		Bucket: process.env.VITE_AWS_BUCKET_NAME!,
		Key: key,
		Body: buffer.data,
		ContentType: format === "avif" ? "image/avif" : "image/jpeg",
	});

	await s3_client.send(command);

	return {
		width: buffer.info.width!,
		height: buffer.info.height!,
		size_bytes: buffer.info.size,
		format,
	};
}

// Create a small blurred placeholder for lazy loading
async function create_blur_placeholder(image: sharp.Sharp): Promise<string> {
	const blur_width = 40; // Very small for fast loading
	const blur_sigma = 20; // Heavy blur

	const transformer = image
		.clone()
		.resize({
			width: blur_width,
			withoutEnlargement: true,
			fit: "inside",
		})
		.blur(blur_sigma)
		.jpeg({ quality: 50 }); // Low quality is fine for blur

	const buffer = await transformer.toBuffer();

	const base64 = buffer.toString("base64");
	return `data:image/jpeg;base64,${base64}`;
}

export const optimize_image = internalAction({
	args: {
		image_db_id: v.id("media"),
		image: media_validator,
		is_thumbnail: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		try {
			const response = await fetch(args.image.original.url);
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`);
			}

			const buffer = await response.arrayBuffer();
			const image = sharp(Buffer.from(buffer));
			const metadata = await image.metadata();

			// Skip optimization for non-image files
			if (!metadata.width || !metadata.height) {
				console.log("Skipping optimization for non-image file");
				await ctx.runMutation(internal.media.update_upload_status, {
					media_id: args.image_db_id,
					status: "completed",
				});
				return;
			}

			const client = new S3Client({
				endpoint: `https://s3.${process.env.VITE_AWS_REGION}.backblazeb2.com`,
				region: process.env.VITE_AWS_REGION,
				credentials: {
					accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
					secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
				},
			});

			// Define responsive breakpoints
			const widths = [400, 800, 1200, 1600] as const;
			const formats = ["avif", "jpeg"] as const;

			// Create blur placeholder for lazy loading
			const blur_placeholder = await create_blur_placeholder(image);

			// Generate all variants
			const variant_promises: Promise<VariantResult>[] = [];
			for (const format of formats) {
				for (const width of widths) {
					// Skip generating variants larger than the original
					if (width > metadata.width) continue;

					variant_promises.push(
						create_and_upload_variant(
							image,
							client,
							args.image_db_id,
							width,
							format,
						),
					);
				}
			}

			const variant_results = await Promise.all(variant_promises);

			// Build variants array according to new schema
			const base_url = `https://gradivo.jknm.site/${args.image_db_id}`;
			const variants: VariantData[] = [];

			for (const result of variant_results) {
				const variant_name = `${result.width}w.${result.format}`;
				variants.push({
					width: result.width,
					height: result.height,
					format: result.format,
					url: `${base_url}/${variant_name}`,
					size_bytes: result.size_bytes,
				});
			}

			// Build srcsets
			const avif_variants = variants.filter((v) => v.format === "avif");
			const jpeg_variants = variants.filter((v) => v.format === "jpeg");

			const avif_srcset = avif_variants
				.map((v) => `${v.url} ${v.width}w`)
				.join(", ");

			const jpeg_srcset = jpeg_variants
				.map((v) => `${v.url} ${v.width}w`)
				.join(", ");

			//"(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px";
			// Dynamically build sizes attribute to match available variants
			const availableWidths = Array.from(
				new Set(variants.map((v) => v.width)),
			).sort((a, b) => a - b);

			// Example: (max-width: 400px) 400px, (max-width: 800px) 800px, 1200px
			const sizes =
				availableWidths
					.slice(0, -1)
					.map((w) => `(max-width: ${w}px) ${w}px`)
					.join(", ") +
				(availableWidths.length
					? `, ${availableWidths[availableWidths.length - 1]}px`
					: "");

			// Update the media record with variants
			await ctx.runMutation(internal.media.save_variants, {
				media_id: args.image_db_id,
				variants,
				srcsets: {
					avif: avif_srcset,
					jpeg: jpeg_srcset,
					sizes,
				},
				blur_placeholder,
				upload_status: "completed",
			});
		} catch (error) {
			console.error("Image optimization failed:", error);
			await ctx.runMutation(internal.media.update_upload_status, {
				media_id: args.image_db_id,
				status: "failed",
			});
			throw error;
		}
	},
});

export const copy_media = internalAction({
	args: {
		source_article_id: v.id("articles"),
		target_article_id: v.id("articles"),
	},
	handler: async (ctx, args) => {},
});

export const empty_bucket = internalAction({
	handler: async () => {
		const client = new S3Client({
			endpoint: `https://s3.${process.env.VITE_AWS_REGION}.backblazeb2.com`,
			region: process.env.VITE_AWS_REGION,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
			},
		});
		const listCommand = new ListObjectsV2Command({
			Bucket: process.env.VITE_AWS_BUCKET_NAME,
		});
		const listResponse = await client.send(listCommand);

		await client.send(
			new DeleteObjectsCommand({
				Bucket: process.env.VITE_AWS_BUCKET_NAME,
				Delete: {
					Objects:
						listResponse.Contents?.map((item) => ({
							Key: item.Key!,
						})) ?? [],
				},
			}),
		);

		console.log("Bucket emptied.", listResponse.Contents?.length ?? 0);
	},
});
