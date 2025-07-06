import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const article_status_validator = v.union(
	v.literal("draft"),
	v.literal("published"),
	v.literal("archived"),
	v.literal("deleted"),
);

const schema = defineSchema({
	...authTables,

	articles: defineTable({
		title: v.string(),
		slug: v.string(),
		status: article_status_validator,
		content_json: v.optional(v.any()), // PlateJS Value type
		content_markdown: v.optional(v.string()), // For full-text search
		excerpt: v.optional(v.string()), // For previews/SEO
		view_count: v.number(),
		thumbnail_crop: v.optional(
			v.object({
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
		// Search index with year filtering support
		.searchIndex("search_content_by_year", {
			searchField: "content_markdown",
			filterFields: ["status", "published_year"],
		}),

	authors: defineTable({
		author_type: v.union(v.literal("member"), v.literal("guest")),
		name: v.string(), // Unique name for authors
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
});
export default schema;

export const article = schema.tables.articles.validator;
export const author = schema.tables.authors.validator;
export const articles_to_authors = schema.tables.articles_to_authors.validator;

export const update_article_schema = v.object({
	title: article.fields.title,
	status: article.fields.status,
	content_json: article.fields.content_json,
	thumbnail_crop: article.fields.thumbnail_crop,
	author_ids: v.optional(v.array(v.id("authors"))),
});

export const create_draft_article_schema = v.object({
	published_id: v.optional(v.id("articles")),
});

export const rename_guest_validator = v.object({
	id: v.id("authors"),
	name: v.string(),
});
