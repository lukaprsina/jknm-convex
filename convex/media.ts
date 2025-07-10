import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const generate_presigned_upload_url = mutation({
	args: {
		filename: v.string(),
		content_type: v.string(),
		size_bytes: v.number(),
	},
	handler: async (ctx, args) => {
		// B2 S3-compatible endpoint
		const client = new S3Client({
			endpoint: `https://s3.${process.env.AWS_REGION}.backblazeb2.com`,
			region: process.env.AWS_REGION,
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

		await ctx.db.patch(media_db_id, {
			storage_path: key,
		});

		/* 
		const { url, fields } = await createPresignedPost(client, {
			Bucket: process.env.AWS_BUCKET_NAME!,
			Key: key,
			Expires: 600, // URL valid for 10 minutes
			Conditions: [
				["content-length-range", 0, 100 * 1024 * 1024], // Limit to 100MB
				["starts-with", "$Content-Type", ""],
				// ["starts-with", "$Content-Type", args.content_type],
			],
		});
		*/

		const putObjectCommand = new PutObjectCommand({
			Bucket: process.env.AWS_BUCKET_NAME,
			Key: key,
			// ContentType: args.content_type,
		});

		const presignedUrl = await getSignedUrl(client, putObjectCommand, {
			expiresIn: 3600,
		});

		return {
			url: presignedUrl,
			key,
			media_db_id,
		};
	},
});
