import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const article_status_validator = v.union(
	v.literal("draft"),
	v.literal("published"),
	v.literal("archived"),
	v.literal("deleted"),
);

const schema = defineSchema({
	users: defineTable({
		email: v.string(),
	}).index("email", ["email"]),
	articles: defineTable({
		title: v.string(),
		slug: v.string(),
		status: article_status_validator,
		content_json: v.string(), // PlateJS Value type
		content_markdown: v.optional(v.string()), // For full-text search
		excerpt: v.optional(v.string()), // For previews/SEO
		view_count: v.number(),
		thumbnail: v.optional(
			v.object({
				original_id: v.id("media"),
				cropped_id: v.id("media"),
				x: v.number(),
				y: v.number(),
				width: v.number(),
				height: v.number(),
			}),
		),
		legacy_id: v.optional(v.number()),
		updated_at: v.number(), // Unix timestamp
		created_at: v.number(), // Unix timestamp
		deleted_at: v.optional(v.number()), // Unix timestamp
		published_at: v.optional(v.number()), // Unix timestamp
		archived_at: v.optional(v.number()), // Unix timestamp
		published_year: v.optional(v.number()), // Extracted year for efficient filtering
	})
		.index("by_slug", ["slug"])
		.index("by_legacy_id", ["legacy_id"])
		// Compound indexes for efficient year + status filtering
		.index("by_status_and_published_year", [
			"status",
			"published_year",
			"published_at",
		])
		.index("by_status_and_published_at", ["status", "published_at"])
		.index("by_status_and_updated_at", ["status", "updated_at"])
		// Search index with year filtering support
		.searchIndex("search_content_by_year", {
			searchField: "content_markdown",
			filterFields: ["status", "published_year"],
		}),

	media: defineTable({
		filename: v.string(),
		content_type: v.string(),
		size_bytes: v.number(),

		// Store base URL pattern for consistent URL building
		base_url: v.string(), // e.g., "https://gradivo.jknm.site/media123"

		// Original image info
		original: v.object({
			url: v.string(), // Full URL to original image
			width: v.optional(v.number()),
			height: v.optional(v.number()),
			size_bytes: v.number(),
		}),

		// Optimized variants - cleaner structure
		variants: v.optional(
			v.array(
				v.object({
					width: v.number(),
					height: v.number(),
					format: v.union(v.literal("avif"), v.literal("jpeg")),
					url: v.string(), // Full URL - no manual construction needed
					size_bytes: v.number(),
				}),
			),
		),

		// Pre-built srcsets for frontend convenience
		srcsets: v.optional(
			v.object({
				avif: v.string(), // Ready-to-use srcset string
				jpeg: v.string(), // Ready-to-use srcset string
				sizes: v.string(), // Recommended sizes attribute
			}),
		),

		// Blur placeholder for lazy loading
		blur_placeholder: v.optional(v.string()), // base64 data URL

		upload_status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("completed"),
			v.literal("failed"),
		),
		created_at: v.number(),
	}).index("by_status", ["upload_status"]),

	authors: defineTable({
		author_type: v.union(v.literal("member"), v.literal("guest")),
		name: v.string(), // non-unique
		google_id: v.optional(v.string()),
		email: v.optional(v.string()),
		image: v.optional(v.string()),
	}).index("by_name", ["name"]),

	articles_to_authors: defineTable({
		article_id: v.id("articles"),
		author_id: v.id("authors"),
		order: v.number(),
	})
		.index("by_article_and_order", ["article_id", "order"])
		.index("by_author", ["author_id"]),

	media_to_articles: defineTable({
		article_id: v.id("articles"),
		media_id: v.id("media"),
		order: v.number(),
	})
		.index("by_article_and_order", ["article_id", "order"])
		.index("by_media", ["media_id"]),
});

export default schema;

export const article_validator = schema.tables.articles.validator;
export const author_validator = schema.tables.authors.validator;
export const media_validator = schema.tables.media.validator;
export const articles_to_authors_validator =
	schema.tables.articles_to_authors.validator;
export const media_to_articles_validator =
	schema.tables.media_to_articles.validator;
