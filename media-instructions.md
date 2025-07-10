I am making a Slovenian blog with Tanstack Start and Convex. I use shadcn/ui and tailwind v4, the editor is Plate, which uses tailwind and shadcn registry. BTW, Tanstack Start doesn't use Vinxi anymore, it's Vite + Nitro. No more app.config.ts.

I have a Backblaze B2 bucket, where I will store all my media, uploaded from the editor. It is proxied through cloudflare on the `gradivo` subdomain.
The bucket structure is `/media/${media_db_id}/${variant}.${ext}`. The `${variant}` is `${size}w` for images and `original` for documents, videos and audio. I will do image optimization with Convex actions for AVIF and progressive JPEG, srcset sizes not determined yet. I will also store original images for backup. Also, an article thumbnail is required, it doesn't need size variants, but it does need both AVIF and JPEG - it can be hardcoded as `naslovnica.${ext}`. This thumbnail can be from the article image, or a custom one. For the custom one, I also need to store the original uploaded image - `naslovnica-izvirnik.${ext}`.
I still need to build the homepage, which will show an infinite loader of articles in a `Card` component, and based on the padding I will determine the sizes. max homepage page width is 1500px, but one to three columns based on the breakpoints. The article view could be from 800px to 1200px. But that's for later.

When an image is uploaded from the editor, it will be uploaded to B2 using a presigned URL. It will be stored just as the media_db_id+variant+ext parts as a relative path. However, I need to configure the PlateJS media plugin, as the URL doesn't actually point to the file. I will have an environment variable `MEDIA_CDN_URL = "https://gradivo.jknm.site"`, and I will build the URL on the fly on the client. Because Tanstack Start is an SSR framework, this will also be done on the server for the first request of `/novica/..., good for SEO.

When the media is uploaded and the completition request arrives, I will trigger a Convex action for images that will make variants using sharp and store them.

lukaprsina: Can you please make a plan for `media-instructions.md`, so we can then go step by step.

You can search for files in my codebase. The frontend is still very unfinished - look in the `./convex` directory and analyse the `src\components\plugins\media-kit.tsx` imports. Ther are also MCP servers available.

P.S.: I will not use Convex Filestorage.

#fetch #default #websearch #codebase #plate #convex

GitHub Copilot: I'll help you analyze the codebase to create a plan for `media-instructions.md`. Let me start by examining the current state of the workspace and understanding the media-related components. I'll analyze your codebase to create a comprehensive plan for `media-instructions.md`. Let me examine the media-related components and understand the current implementation. I'll help you create a comprehensive plan for `media-instructions.md`. Let me first analyze the media-related code in your workspace to understand the current implementation and requirements. Based on my analysis of your codebase, I can see you have a sophisticated media system planned with PlateJS editor, Convex backend, and Backblaze B2 storage. Let me create a comprehensive plan for implementing your media instructions. Based on my analysis of your codebase, I'll create a comprehensive plan for implementing your media system. Here's what I found and the step-by-step plan:

## Current State Analysis

From your codebase, I can see you have:

- A well-structured PlateJS media system with components for images, videos, audio, files, and embeds
- Convex backend with articles/authors schema
- Backblaze B2 integration scripts
- Cloudflare CDN proxy setup (`gradivo.jknm.site`)
- Media components that currently use placeholder/dummy upload functionality

## Comprehensive Implementation Plan for `media-instructions.md`

### Phase 1: Database Schema & Core Infrastructure

**1.1 Extend Convex Schema**

- Add `media` table to `convex/schema.ts`:
  ```typescript
  media: defineTable({
    media_db_id: v.string(), // UUID for B2 storage path
    filename: v.string(),
    mime_type: v.string(),
    size: v.number(),
    width: v.optional(v.number()), // for images
    height: v.optional(v.number()), // for images
    duration: v.optional(v.number()), // for video/audio
    article_id: v.optional(v.id("articles")),
    upload_status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    variants: v.optional(
      v.array(
        v.object({
          size: v.string(), // "original", "800w", "1200w", etc.
          format: v.string(), // "webp", "avif", "jpg", etc.
          url_path: v.string(), // relative path for CDN
        })
      )
    ),
    created_at: v.number(),
    updated_at: v.number(),
  });
  ```

**1.2 Environment Configuration**

- Set up environment variables:
  - `MEDIA_CDN_URL="https://gradivo.jknm.site"`
  - `B2_BUCKET_NAME="jknm-novice"`
  - `B2_APPLICATION_KEY_ID`
  - `B2_APPLICATION_KEY`
  - `B2_ENDPOINT_URL`

### Phase 2: Backend Services

**2.1 Convex Functions**

- Create `convex/media.ts`:
  - `generateUploadUrl()` - Generate B2 presigned URL
  - `createMediaRecord()` - Create media DB entry
  - `updateMediaStatus()` - Update processing status
  - `getMediaByArticle()` - Get media for an article
  - `deleteMedia()` - Mark media as deleted

**2.2 Convex Actions**

- Create `convex/media-actions.ts`:
  - `processImageVariants()` - Generate AVIF/WebP variants using Sharp
  - `generateThumbnail()` - Create article thumbnails
  - `cleanupFailedUploads()` - Clean up orphaned media

**2.3 B2 Integration**

- Create `convex/lib/b2-client.ts`:
  - B2 API client wrapper
  - Presigned URL generation
  - File upload/delete operations

### Phase 3: Frontend Media System

**3.1 Media Upload Hook**

- Create `src/hooks/use-media-upload.ts`:
  - Handle file selection and validation
  - Generate presigned URLs via Convex
  - Upload to B2 with progress tracking
  - Update media records

**3.2 Media URL Builder**

- Create `src/lib/media-utils.ts`:
  - `buildMediaUrl(mediaDbId, variant, ext)` - Build CDN URLs
  - `getOptimalImageVariant()` - Choose best image size
  - `generateSrcSet()` - Create responsive image srcsets

**3.3 Update PlateJS Components**

- Modify `src/components/plate-ui/media-placeholder-node.tsx`:
  - Replace dummy upload with real B2 upload
  - Add progress tracking
  - Handle upload errors
- Update `src/components/plate-ui/media-image-node.tsx`:
  - Use CDN URLs instead of direct storage
  - Add responsive image support
  - Implement lazy loading

### Phase 4: Media Processing Pipeline

**4.1 Image Processing**

- Set up Sharp-based image processing:
  - Generate AVIF and progressive JPEG variants
  - Create multiple size variants (responsive images)
  - Optimize for web delivery

**4.2 Thumbnail System**

- Implement article thumbnail generation:
  - Extract from article images or custom upload
  - Generate both AVIF and JPEG formats
  - Store as `naslovnica.{ext}` and `naslovnica-izvirnik.{ext}`

**4.3 Processing Queue**

- Implement background processing:
  - Queue image optimization tasks
  - Handle processing failures
  - Notify frontend of completion

### Phase 5: PlateJS Integration

**5.1 Plugin Configuration**

- Update `src/components/plugins/media-kit.tsx`:
  - Configure real upload handlers
  - Set up proper file validation
  - Add progress tracking components

**5.2 Media Components**

- Update all media components to use CDN URLs
- Add proper error handling
- Implement loading states

### Phase 6: Article Integration

**6.1 Article Media Association**

- Link media records to articles
- Handle media cleanup on article deletion
- Implement media reuse across articles

**6.2 SEO Optimization**

- Generate proper meta tags for images
- Implement structured data for media
- Optimize for social media sharing

### Phase 7: Admin & Management

**7.1 Media Management Interface**

- Create admin interface for media management
- Implement bulk operations
- Add media analytics

**7.2 Cleanup & Optimization**

- Implement orphaned media cleanup
- Add media usage tracking
- Create optimization reports

### Phase 8: Performance & Monitoring

**8.1 Performance Optimization**

- Implement proper caching strategies
- Add CDN optimization
- Monitor upload performance

**8.2 Error Handling & Recovery**

- Implement comprehensive error handling
- Add retry mechanisms
- Create monitoring dashboards

## Implementation Priority

1. **High Priority**: Schema, upload system, basic image handling
2. **Medium Priority**: Image optimization, thumbnail system
3. **Low Priority**: Admin interface, analytics, advanced features

## Key Technical Decisions

1. **Storage Structure**: `/media/${media_db_id}/${variant}.${ext}`
2. **CDN Integration**: Build URLs client-side with `MEDIA_CDN_URL`
3. **Image Formats**: AVIF primary, JPEG fallback
4. **Responsive Images**: Multiple size variants with srcset
5. **Processing**: Server-side with Sharp via Convex actions

This plan provides a complete roadmap for implementing your media system while maintaining the existing PlateJS integration and leveraging your Cloudflare CDN setup.I'll help you create a comprehensive plan for media-instructions.md. Let me first analyze your codebase to understand your current media setup and then research the latest best practices. Now, let me search for information about Sharp image processing and Convex actions for creating the image variants. Now I have enough information to create a comprehensive plan for the media-instructions.md file. Let me create the plan based on my analysis of your codebase and research.

# Comprehensive Plan for media-instructions.md

Based on my analysis of your codebase and research into PlateJS media plugins, Backblaze B2 integration, and modern image optimization techniques, here's a detailed step-by-step plan for implementing your media management system:

## **Overview**

Your project is a Slovenian blog built with TanStack Start, Convex, PlateJS editor, and Backblaze B2 storage. You want direct browser uploads to B2 using presigned URLs with automatic image optimization using Convex actions.

## **Phase 1: Database Schema & Backend Setup**

### **Step 1.1: Extend Convex Schema**

- Add https://v36.platejs.org/docs/media#%3A~%3Atext%3DAdd%20images%20by%20either%20uploading%2C%20such%20as%20videos%20and table to schema.ts to track all uploaded files:
  ```ts
  media: defineTable({
    filename: v.string(),
    content_type: v.string(),
    size_bytes: v.number(),
    storage_path: v.string(), // B2 path: /media/${media_db_id}/${variant}.${ext}
    variants: v.object({
      original: v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        size_bytes: v.number(),
      }),
      // Size variants for images (e.g., "400w", "800w", "1200w")
      size_variants: v.optional(
        v.record(
          v.string(),
          v.object({
            width: v.number(),
            height: v.number(),
            size_bytes: v.number(),
            format: v.union(
              v.literal("avif"),
              v.literal("jpeg"),
              v.literal("webp")
            ),
          })
        )
      ),
    }),
    upload_status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    article_id: v.optional(v.id("articles")),
    is_thumbnail: v.boolean(),
    created_at: v.number(),
  })
    .index("by_article", ["article_id"])
    .index("by_status", ["upload_status"]);
  ```

````

### **Step 1.2: Environment Variables & B2 Configuration**
- Set up environment variables in Convex dashboard:
  - `B2_APPLICATION_KEY_ID`
  - `B2_APPLICATION_KEY`
  - `B2_BUCKET_NAME`
  - `B2_BUCKET_ID`
  - `B2_ENDPOINT_URL` (e.g., `https://s3.us-west-004.backblazeb2.com`)
  - `B2_REGION` (e.g., `us-west-004`)
  - `MEDIA_CDN_URL` = `"https://gradivo.jknm.site"`

### **Step 1.3: Install Dependencies**
- Add to `convex/package.json`:
  ```json
  {
    "dependencies": {
      "@aws-sdk/client-s3": "^3.x.x",
      "@aws-sdk/s3-request-presigner": "^3.x.x",
      "sharp": "^0.33.x",
      "nanoid": "^5.x.x"
    }
  }
````

## **Phase 2: Convex Backend Implementation**

### **Step 2.1: B2 Upload Functions**

- Create `convex/media.ts`:
  - `generatePresignedUploadUrl` mutation: Creates presigned URL for direct B2 upload
  - `confirmUpload` mutation: Called after successful upload to trigger image processing
  - `getMediaUrl` query: Builds full CDN URLs for frontend consumption

### **Step 2.2: Image Processing Action**

- Create `convex/image-processing.ts` action:
  - Downloads original image from B2
  - Generates AVIF and progressive JPEG variants using Sharp
  - Creates responsive size variants (400w, 800w, 1200w, 1600w)
  - Uploads variants back to B2
  - Updates media record with variant information

### **Step 2.3: Thumbnail Management**

- Add thumbnail-specific functions:
  - `generateThumbnail` action: Creates article thumbnails in both AVIF and JPEG
  - `cropThumbnail` mutation: Handles custom thumbnail cropping based on `thumbnail_crop` field

## **Phase 3: Frontend PlateJS Integration**

### **Step 3.1: Custom Upload Hook**

- Create `src/hooks/use-upload-file.ts`:
  - Implements `UseUploadFileProps` interface for PlateJS compatibility
  - Handles presigned URL generation via Convex
  - Manages direct upload to B2
  - Triggers post-upload processing
  - Provides progress tracking and error handling

### **Step 3.2: Configure Media Plugin**

- Update media-kit.tsx:
  - Configure PlateJS media plugins with custom upload handler
  - Set up file validation (types, sizes, counts)
  - Configure URL building for media display

### **Step 3.3: URL Building Utilities**

- Create `src/lib/media-utils.ts`:
  - `buildMediaUrl()`: Constructs full CDN URLs from media records
  - `getOptimalImageSrc()`: Returns best format/size for current context
  - `generateSrcSet()`: Creates responsive image srcsets

## **Phase 4: Image Optimization & Responsive Images**

### **Step 4.1: Size Variants Strategy**

- **Homepage**: Determine optimal sizes based on your 1500px max width, 1-3 columns
- **Article View**: Optimize for 800px-1200px content width
- **Thumbnail**: Fixed sizes for consistent card layouts

### **Step 4.2: Format Strategy**

- **AVIF**: Primary format for modern browsers (better compression)
- **Progressive JPEG**: Fallback for older browsers
- **Original**: Backup/raw storage

### **Step 4.3: Responsive Implementation**

- Update PlateJS image components to use `<picture>` elements
- Implement automatic format detection and srcset generation
- Add loading states and progressive enhancement

## **Phase 5: Content Management**

### **Step 5.1: Article Thumbnail System**

- Implement thumbnail selection from article images
- Add custom thumbnail upload functionality
- Store both original and cropped versions
- Generate required AVIF/JPEG variants

### **Step 5.2: Media Library**

- Create admin interface for media management
- Implement media search and filtering
- Add bulk operations for media cleanup
- Track usage across articles

## **Phase 6: Performance & SEO**

### **Step 6.1: SSR Optimization**

- Ensure media URLs work correctly with TanStack Start SSR
- Implement proper SEO meta tags with optimized images
- Add structured data for articles with images

### **Step 6.2: Caching Strategy**

- Implement Cloudflare caching headers
- Set up proper CDN cache invalidation
- Add client-side image caching

## **Phase 7: Error Handling & Monitoring**

### **Step 7.1: Upload Error Handling**

- Implement retry logic for failed uploads
- Add comprehensive error messages
- Create cleanup for orphaned files

### **Step 7.2: Processing Monitoring**

- Add logging for image processing pipeline
- Implement status tracking for long-running operations
- Set up alerts for processing failures

---

## **Implementation Priority**

1. **High Priority** (Core functionality):

   - Database schema (Step 1.1)
   - B2 configuration (Step 1.2)
   - Basic upload functions (Step 2.1)
   - PlateJS integration (Step 3.1-3.2)

2. **Medium Priority** (Optimization):

   - Image processing (Step 2.2)
   - Responsive images (Step 4)
   - Thumbnail system (Step 5.1)

3. **Low Priority** (Enhancement):
   - Media library (Step 5.2)
   - Advanced monitoring (Step 7.2)

Would you like me to start implementing any specific step from this plan? I can begin with the database schema updates or the Convex backend functions.
