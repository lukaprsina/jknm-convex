import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,
    authors: defineTable({
        author_type: v.union(v.literal("member"), v.literal("guest")),
        name: v.string(),
        google_id: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
    })
        .index("by_google_id", ["google_id"])
        .index("by_email", ["email"])
        .index("by_author_type", ["author_type"]),

    articles: defineTable({
        title: v.string(),
        slug: v.string(), // URL-friendly version
        url: v.string(), // Full URL for legacy
        status: v.union(
            v.literal("draft"),
            v.literal("published"),
            v.literal("archived"),
            v.literal("deleted")
        ),
        content_json: v.optional(v.any()), // PlateJS Value type
        content_html: v.optional(v.string()),
        content_markdown: v.optional(v.string()), // For full-text search
        excerpt: v.optional(v.string()), // For previews/SEO
        view_count: v.number(),
        thumbnail_crop: v.optional(
            v.object({
                x: v.number(),
                y: v.number(),
                width: v.number(),
                height: v.number(),
            })
        ),
        meta_description: v.optional(v.string()), // SEO
        legacy_id: v.optional(v.number()),
        updated_at: v.number(), // Unix timestamp
        created_at: v.number(), // Unix timestamp
        deleted_at: v.optional(v.number()), // Unix timestamp
        published_at: v.optional(v.number()), // Unix timestamp
        archived_at: v.optional(v.number()), // Unix timestamp
    })
        .index("by_slug", ["slug"])
        .index("by_status", ["status"])
        .index("by_created_at", ["created_at"])
        .index("by_published_at", ["published_at"])
        .index("by_legacy_id", ["legacy_id"])
        .index("by_status_and_published_at", ["status", "published_at"])
        .searchIndex("search_content", {
            searchField: "content_markdown",
            filterFields: ["status"],
        }),

    articles_to_authors: defineTable({
        article_id: v.id("articles"),
        author_id: v.id("authors"),
        order: v.number(),
    })
        .index("by_article", ["article_id"])
        .index("by_author", ["author_id"])
        .index("by_article_and_order", ["article_id", "order"])
        .index("by_article_and_author", ["article_id", "author_id"]),
});
