# GitHub Copilot Instructions

## Project Overview

This is a Slovenian blog built with **TanStack Start** (SSR framework), **Convex** (reactive backend), **PlateJS** (rich text editor), and **Backblaze B2** (media storage). The project uses Tailwind CSS v4, shadcn/ui components, and Better Auth for authentication.

## Architecture & Key Patterns

### Stack Integration

- **TanStack Start + Convex**: Uses `@convex-dev/react-query` for seamless integration between TanStack Query and Convex
- **Router Context**: All routes have access to `queryClient`, `convexClient`, and `convexQueryClient` via context
- **Authentication**: Server-side session fetching in `__root.tsx` with Better Auth + Convex integration
- **SSR**: Media URLs and auth tokens are set on the server for optimal SEO

### Database Design (Convex)

- **Articles**: Main content with PlateJS JSON (`content_json`), slug-based routing, status workflow
- **Authors**: Junction table pattern for many-to-many relationships (`articles_to_authors`)
- **Media**: B2 storage with variants system (`original`, `400w`, `800w`, etc.) and CDN URLs
- **Compound Indexes**: Critical for performance - `by_status_and_published_year`, `by_status_and_published_at`

### PlateJS Editor Architecture

- **Plugin System**: Modular kits in `src/components/plugins/` (e.g., `BasicBlocksKit`, `MediaKit`)
- **Dual Components**: Static (`-static.tsx`) for SSR rendering, interactive for editor
- **Editor Types**: `BaseEditorKit` for static rendering, `EditorKit` for full editor functionality
- **Custom Plugins**: Save/publish functionality integrated with Convex mutations

## Critical Development Patterns

### Convex Function Patterns

```typescript
// Always use new function syntax with validators
export const myFunction = query({
  args: { id: v.id("articles") },
  returns: v.object({ title: v.string() }),
  handler: async (ctx, args) => {
    // Use proper authentication check
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Use withIndex for efficient queries
    return await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});
```

### TanStack Router Patterns

```typescript
// Route with loader and search params
export const Route = createFileRoute("/articles/")({
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      convexQuery(api.articles.getPublished, {})
    );
  },
  validateSearch: zodValidator(searchSchema),
  component: Component,
});
```

### PlateJS Plugin Development

```typescript
// Plugin pattern with static companion
export const MyPlugin = createPlatePlugin({
  key: 'myPlugin',
  node: { component: MyComponent },
});

// Always create static version
export const MyComponentStatic = ({ children, ...props }) => (
  <PlateElement {...props}>{children}</PlateElement>
);
```

## File Upload & Media System

### B2 Integration Pattern

- **Presigned URLs**: Generated in Convex mutations for direct browser upload
- **Two-step Process**: 1) `generate_presigned_upload_url` → 2) `confirm_upload` → triggers image processing
- **Storage Structure**: `/media/${media_db_id}/${variant}.${ext}`
- **CDN URLs**: Built server-side and stored into media -> storage_path

### Image Processing Workflow

1. Direct upload to B2 using presigned URL with progress tracking (`XMLHttpRequest`)
2. Convex action processes images with Sharp (AVIF/JPEG variants)
3. Responsive variants generated (`400w`, `800w`, `1200w`, `1600w`)
4. Media record updated with variant metadata

## Development Workflow

### Local Development

```bash
# Start both dev servers concurrently
npm run dev  # Runs both Vite and Convex dev servers

# Individual commands
npm run dev:web     # TanStack Start dev server
npm run dev:server  # Convex dev server
```

### Database Queries

- **Always use indexes** - define in `convex/schema.ts` and use `.withIndex()` in queries
- **Pagination**: Use built-in Convex pagination with `paginationOptsValidator`
- **Search**: Full-text search with `.searchIndex()` and filtering by status/year
- **Timestamps**: Unix timestamps (`Date.now()`) for Convex compatibility

### Authentication Flow

- Better Auth handles OAuth (Google) and session management
- Convex integration via `@convex-dev/better-auth`
- Server-side session fetching in root route for SSR
- Protected routes use `beforeLoad` with `notFound()` for unauthorized access

## Common Gotchas

### PlateJS Editor

- **State Management**: Use `useEditorRef()` for editor instance, `useEditorMounted()` for initialization
- **Plugin Options**: Set via `editor.setOption(PluginKey, "optionName", value)`
- **Serialization**: Content stored as JSON string in Convex, parsed for editor

### Convex Patterns

- **Function Registration**: Use `query`, `mutation`, `action` for public APIs, `internal*` for private
- **Validators**: Always include `args` validator, but never include `returns` validator
- **Error Handling**: Throw descriptive errors, they're automatically handled by the client

### TanStack Router

- **Context Types**: Extend router context interface for type safety
- **Search Params**: Use `zodValidator` with `fallback()` for defaults
- **Server Functions**: Use `createServerFn` for server-side operations

## File Structure Conventions

- `src/components/plugins/` - PlateJS plugins with accompanying static versions
- `src/components/plate-ui/` - PlateJS UI components (both interactive and static)
- `src/hooks/` - Custom React hooks, especially for file uploads and debouncing
- `convex/` - All backend functions, follow Convex file-based routing
- `src/routes/` - TanStack Router file-based routing structure

## Environment Variables

Key environment variables for development:

- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CONVEX_SITE_URL` - For Better Auth integration
- B2 credentials: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `VITE_AWS_REGION`

When working with this codebase, always consider the SSR implications, follow the established patterns for Convex queries, and ensure proper authentication checks in backend functions.
