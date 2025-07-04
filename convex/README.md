# Convex Schema for Blog Site

This directory contains the Convex backend implementation for a blog site, migrated from DrizzleORM to ConvexDB.

## Schema

### Tables

#### `authors`

- `author_type`: "member" | "guest"
- `name`: string
- `google_id`: optional string
- `email`: optional string
- `image`: optional string

**Indexes:**

- `by_google_id`: for Google OAuth integration
- `by_email`: for email-based lookups
- `by_author_type`: for filtering by author type

#### `articles`

- `title`: string
- `slug`: string (URL-friendly version)
- `url`: string (full URL for legacy support)
- `status`: "draft" | "published" | "archived" | "deleted"
- `content_json`: optional any (PlateJS editor content)
- `content_html`: optional string
- `content_markdown`: optional string (for full-text search)
- `excerpt`: optional string (for previews/SEO)
- `view_count`: number
- `thumbnail_crop`: optional object with x, y, width, height
- `meta_description`: optional string (SEO)
- `legacy_id`: optional number (for migration)
- `updated_at`: number (Unix timestamp)
- `created_at`: number (Unix timestamp)
- `deleted_at`: optional number (Unix timestamp)
- `published_at`: optional number (Unix timestamp)
- `archived_at`: optional number (Unix timestamp)

**Indexes:**

- `by_slug`: for URL routing
- `by_status`: for filtering by publication status
- `by_created_at`: for chronological ordering
- `by_published_at`: for published articles ordering
- `by_legacy_id`: for legacy migration support
- `by_status_and_published_at`: compound index for efficient published article queries

**Search Index:**

- `search_content`: full-text search on `content_markdown` with `status` filter

#### `articles_to_authors`

Junction table for many-to-many relationship between articles and authors.

- `article_id`: reference to articles table
- `author_id`: reference to authors table
- `order`: number (for author ordering within an article)

**Indexes:**

- `by_article`: for finding authors of an article
- `by_author`: for finding articles by an author
- `by_article_and_order`: for ordered author retrieval
- `by_article_and_author`: for checking existing relationships

## Functions

### Articles (`convex/articles.ts`)

- `getBySlug(slug)`: Get article by slug
- `getPublished(paginationOpts)`: Get published articles with pagination
- `searchArticles(searchTerm, paginationOpts)`: Full-text search articles
- `create(...)`: Create new article
- `update(id, ...)`: Update existing article
- `incrementViewCount(id)`: Increment article view count

### Authors (`convex/authors.ts`)

- `getAll()`: Get all authors
- `getById(id)`: Get author by ID
- `getByGoogleId(google_id)`: Get author by Google ID
- `getByEmail(email)`: Get author by email
- `create(...)`: Create new author
- `update(id, ...)`: Update existing author
- `remove(id)`: Delete author (checks for associated articles)

### Articles to Authors (`convex/articles_to_authors.ts`)

- `getAuthorsForArticle(article_id)`: Get authors for an article (ordered)
- `getArticlesForAuthor(author_id)`: Get articles for an author
- `addAuthorToArticle(article_id, author_id, order?)`: Associate author with article
- `removeAuthorFromArticle(article_id, author_id)`: Remove author from article
- `updateAuthorOrder(article_id, author_id, order)`: Update author ordering

## Key Features

1. **Full-text Search**: Articles can be searched by content using the `search_content` index
2. **Efficient Pagination**: All list queries support Convex's built-in pagination
3. **Automatic Timestamps**: Created/updated timestamps are managed automatically
4. **Status Management**: Article status transitions automatically set appropriate timestamps
5. **View Tracking**: Article view counts can be incremented
6. **Ordered Authors**: Multiple authors per article with customizable ordering
7. **Legacy Support**: Includes legacy_id field for smooth migration from existing system

## Migration Notes

- Timestamps are stored as Unix timestamps (numbers) instead of PostgreSQL timestamps
- The `v.any()` validator is used for PlateJS content JSON to maintain flexibility
- All string length constraints from Drizzle are removed (Convex handles this automatically)
- Indexes are automatically named with descriptive names following Convex conventions
- Foreign key relationships are managed through separate junction table with proper indexes

## Getting Started

1. `npm run dev` to run the Convex dev server
2. Open another terminal and run your app
3. Use the functions in `convex/articles.ts`, `convex/authors.ts`, and `convex/articles_to_authors.ts` to interact with your data

Convex docs: https://docs.convex.dev
