"use node";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v } from "convex/values";
import sharp from "sharp";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { media_validator } from "./schema";

type VariantsType = typeof media_validator.fields.variants.type;

interface ImageVariant {
	width: number;
	height: number;
	size_bytes: number;
	format: "avif" | "jpeg";
}

interface VariantResult {
	variant_name: string;
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
		variant_name,
		width: buffer.info.width!,
		height: buffer.info.height!,
		size_bytes: buffer.info.size,
		format,
	};
}

async function create_blur_placeholder(
	image: sharp.Sharp,
	s3_client: S3Client,
	image_db_id: Id<"media">,
): Promise<string> {
	// Create a small blurred placeholder for lazy loading
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
	const key = `${image_db_id}/blur.jpeg`;

	const command = new PutObjectCommand({
		Bucket: process.env.VITE_AWS_BUCKET_NAME!,
		Key: key,
		Body: buffer,
		ContentType: "image/jpeg",
	});

	await s3_client.send(command);

	// Return as base64 data URL for inline embedding
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
			console.log("Starting image optimization:", {
				image: args.image.filename,
				image_db_id: args.image_db_id,
			});

			const response = await fetch(args.image.storage_path);
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`);
			}

			const buffer = await response.arrayBuffer();
			const image = sharp(Buffer.from(buffer));
			const metadata = await image.metadata();

			console.log("Image metadata:", {
				filename: args.image.filename,
				width: metadata.width,
				height: metadata.height,
				format: metadata.format,
				size: metadata.size,
			});

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
			const blur_placeholder = await create_blur_placeholder(
				image,
				client,
				args.image_db_id,
			);

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

			// Build variants object according to schema
			const image_variants: Record<string, ImageVariant> = {};
			for (const result of variant_results) {
				image_variants[result.variant_name] = {
					width: result.width,
					height: result.height,
					size_bytes: result.size_bytes,
					format: result.format,
				};
			}

			const variants_data: VariantsType = {
				original: {
					width: metadata.width,
					height: metadata.height,
				},
				image_variants,
			};

			// Update the media record with variants
			await ctx.runMutation(internal.media.save_variants, {
				media_id: args.image_db_id,
				variants: variants_data,
				blur_placeholder,
				upload_status: "completed",
			});

			console.log("Image optimization completed:", {
				filename: args.image.filename,
				variants_generated: variant_results.length,
				blur_placeholder_size: blur_placeholder.length,
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
