import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { media_validator } from "./schema";
import { without_system_fields } from "./utils";

/**
 * Helper function to load articles for a media item in the correct order
 */
async function load_articles_for_media(
	ctx: QueryCtx,
	article_id: Id<"articles">,
) {
	const mediaLinks = await ctx.db
		.query("media_to_articles")
		.withIndex("by_article_and_order", (q) => q.eq("article_id", article_id))
		.collect();

	const sorted = mediaLinks
		.filter((ML): ML is NonNullable<typeof ML> => ML !== null)
		.sort((a, b) => a.order - b.order);

	// fetch article itself
	const article = await ctx.db.get(article_id);
	if (!article) throw new Error(`article ${article_id} not found`);

	// fetch all media in parallel
	const mediaList = await Promise.all(
		sorted.map((link) =>
			ctx.db.get(link.media_id).then((m) => {
				if (!m) throw new Error(`media ${link.media_id} not found`);
				return m;
			}),
		),
	);

	return {
		article,
		media: mediaList,
	};
}

export const get_by_id = query({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error("User must be authenticated to get media by ID.");
		}

		const result = await ctx.db.get(args.id);

		if (!result) {
			throw new Error(`Media with ID ${args.id} not found.`);
		}

		if (result.upload_status === "pending") {
			throw new Error(`Media with ID ${args.id} is still pending upload.`);
		}

		return result;
	},
});

export const get_for_article = query({
	args: { article_id: v.id("articles") },
	handler: async (ctx, args) => {
		// this should be accessible to all users

		const result = await load_articles_for_media(ctx, args.article_id);

		return result;
	},
});

export const generate_presigned_upload_url = mutation({
	args: {
		filename: v.string(),
		content_type: v.string(),
		size_bytes: v.number(),
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error(
				"User must be authenticated to generate a presigned URL.",
			);
		}

		// B2 S3-compatible endpoint
		const client = new S3Client({
			endpoint: `https://s3.${process.env.VITE_AWS_REGION}.backblazeb2.com`,
			region: process.env.VITE_AWS_REGION,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
			},
		});

		// Create the media record first to get the ID
		const media_db_id = await ctx.db.insert("media", {
			filename: args.filename,
			content_type: args.content_type,
			size_bytes: args.size_bytes,
			// Store base URL for consistent URL building
			base_url: "PENDING",
			// Temporary original object, will be updated after upload
			original: {
				url: "PENDING",
				size_bytes: args.size_bytes,
			},
			upload_status: "pending",
		});

		const variant = "original";
		const ext = `.${args.filename.split(".").pop()}`;
		const key = `${media_db_id}/${variant}${ext}`;

		// Build the final URL
		const storage_url = `https://gradivo.jknm.org/${key}`;
		const base_url = `https://gradivo.jknm.org/${media_db_id}`;

		// Update the media record with correct URLs
		await ctx.db.patch(media_db_id, {
			base_url,
			original: {
				url: storage_url,
				size_bytes: args.size_bytes,
			},
		});

		const putObjectCommand = new PutObjectCommand({
			Bucket: process.env.VITE_AWS_BUCKET_NAME,
			Key: key,
			ContentType: args.content_type,
		});

		const presignedUrl = await getSignedUrl(client, putObjectCommand, {
			expiresIn: 10 * 60, // 10 minutes
		});

		return {
			presigned_url: presignedUrl,
			key: media_db_id,
			src: storage_url,
		};
	},
});

export const confirm_upload = mutation({
	args: {
		article_id: v.id("articles"),
		media_db_id: v.id("media"),
	},
	handler: async (ctx, args) => {
		const user_id = await ctx.auth.getUserIdentity();
		if (!user_id) {
			throw new Error("User must be authenticated to confirm upload.");
		}

		const media = await ctx.db.get(args.media_db_id);
		if (!media) {
			throw new Error(`Media with ID ${args.media_db_id} not found.`);
		}

		if (media.upload_status !== "pending") {
			throw new Error(
				`Media with ID ${args.media_db_id} is not in pending state.`,
			);
		}

		// Create media-to-article link
		await ctx.db.insert("media_to_articles", {
			article_id: args.article_id,
			media_id: args.media_db_id,
			order: 0, // Default order, can be updated later
		});

		const is_image = media.content_type.startsWith("image/");

		// Update upload status
		await ctx.db.patch(args.media_db_id, {
			upload_status: is_image ? "processing" : "completed",
		});

		// Schedule image optimization for image files
		if (is_image) {
			await ctx.scheduler.runAfter(0, internal.media_sharp.optimize_image, {
				image_db_id: args.media_db_id,
				image: without_system_fields(media),
			});
		}

		return {
			status: "success",
			message: is_image
				? "Upload confirmed, image optimization scheduled."
				: "Upload confirmed successfully.",
		};
	},
});

export const save_variants = internalMutation({
	args: {
		media_id: v.id("media"),
		variants: v.array(
			v.object({
				width: v.number(),
				height: v.number(),
				format: v.union(v.literal("avif"), v.literal("jpeg")),
				url: v.string(),
				size_bytes: v.number(),
			}),
		),
		srcsets: v.object({
			avif: v.string(),
			jpeg: v.string(),
			sizes: v.string(),
		}),
		blur_placeholder: v.string(),
		upload_status: media_validator.fields.upload_status,
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.media_id, {
			variants: args.variants,
			srcsets: args.srcsets,
			blur_placeholder: args.blur_placeholder,
			upload_status: args.upload_status,
		});
	},
});

export const update_upload_status = internalMutation({
	args: {
		media_id: v.id("media"),
		status: media_validator.fields.upload_status,
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.media_id, {
			upload_status: args.status,
		});
	},
});
