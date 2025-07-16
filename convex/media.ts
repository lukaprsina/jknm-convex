import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

		// `/media/${media_db_id}/${variant}.${ext}`
		const media_db_id = await ctx.db.insert("media", {
			filename: args.filename,
			content_type: args.content_type,
			// Convex mutations are transactional, so we can set this to "ERROR" and update it later
			storage_path: "ERROR",
			created_at: Date.now(),
			size_bytes: args.size_bytes,
			upload_status: "pending",
		});

		const variant = "original";
		const ext = `.${args.filename.split(".").pop()}`;

		const key = `${media_db_id}/${variant}${ext}`;

		// This must be hardcoded because I need to change every article if I change the domain
		const storage_path = `https://gradivo.jknm.site/${key}`;

		await ctx.db.patch(media_db_id, {
			storage_path,
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
			src: storage_path,
		};
	},
});

export const confirm_upload = mutation({
	args: {
		media_db_id: v.id("media"),
	},
	handler: async (ctx, args) => {
		const media = await ctx.db.get(args.media_db_id);

		if (!media) {
			throw new Error(`Media with ID ${args.media_db_id} not found.`);
		}

		if (media.upload_status !== "pending") {
			throw new Error(
				`Media with ID ${args.media_db_id} is not in pending state.`,
			);
		}

		// const is_image = media.content_type.startsWith("image/");

		await ctx.db.patch(args.media_db_id, {
			// TODO
			// upload_status: is_image ? "processing" : "completed",
			upload_status: "completed",
		});

		/* ctx.scheduler.runAfter(0, internal.media_sharp.optimize_image, {
			image: media,
		}); */

		return {
			status: "success",
			message: "Upload confirmed successfully.",
		};
	},
});
