# Media Optimization Implementation

## Overview

This implementation provides a complete image optimization system for the Slovenian blog using Sharp.js with Convex and Backblaze B2 storage.

## Key Features

### 🖼️ Image Processing

- **Multiple Formats**: AVIF (primary) and JPEG (fallback) for maximum browser compatibility
- **Responsive Variants**: 400w, 800w, 1200w, 1600w breakpoints
- **Blur Placeholder**: Base64-encoded tiny blurred images for lazy loading
- **Smart Resizing**: Never upscales images, maintains aspect ratio

### ⚙️ Optimization Settings

#### AVIF Settings

- **Quality**: 75 (good balance of quality/size)
- **Effort**: 6 (high effort for better compression)
- **Chroma Subsampling**: 4:2:0 (standard)

#### JPEG Settings

- **Quality**: 85 (high quality for web)
- **Progressive**: true (better perceived loading)
- **MozJPEG**: true (enhanced compression)
- **Optimize Scans**: true (optimized progressive scans)
- **Trellis Quantization**: true (better compression, ~13% size reduction)
- **Overshoot Deringing**: true (reduced artifacts)

### 🔄 Workflow

1. **Upload**: Client uploads original image to B2 using presigned URL
2. **Confirm**: `confirm_upload` mutation triggers processing
3. **Optimize**: Sharp.js processes image in background action
4. **Variants**: Multiple sizes and formats are generated and uploaded
5. **Update**: Database is updated with variant metadata

## API Functions

### Public Functions

#### `generate_presigned_upload_url`

```typescript
const { presigned_url, key, src } = await convex.mutation(
  api.media.generate_presigned_upload_url,
  {
    filename: "image.jpg",
    content_type: "image/jpeg",
    size_bytes: 1024000,
  }
);
```

#### `confirm_upload`

```typescript
await convex.mutation(api.media.confirm_upload, {
  article_id: "article123",
  media_db_id: key,
});
```

#### `get_optimized_urls`

```typescript
const urls = await convex.query(api.media.get_optimized_urls, {
  media_id: "media123",
  preferred_format: "avif" // optional, defaults to "avif"
});

// Returns:
{
  original: "https://gradivo.jknm.site/media123/original.jpg",
  variants: {
    "400w.avif": { url: "...", width: 400, height: 300 },
    "800w.avif": { url: "...", width: 800, height: 600 },
    // ... more variants
  },
  srcsets: {
    avif: "url1 400w, url2 800w, url3 1200w",
    jpeg: "url1 400w, url2 800w, url3 1200w"
  },
  metadata: {
    width: 1920,
    height: 1080,
    filename: "image.jpg",
    content_type: "image/jpeg"
  }
}
```

### Internal Functions

#### `optimize_image` (internal action)

- Fetches original image from B2
- Generates optimized variants using Sharp.js
- Uploads variants back to B2
- Updates database with variant metadata
- Creates blur placeholder for lazy loading

#### `save_variants` (internal mutation)

- Saves variant metadata to database
- Updates upload status to "completed"

## Usage in Frontend

### Picture Element for Responsive Images

```html
<picture>
  <source
    srcset="${srcsets.avif}"
    sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
    type="image/avif"
  />
  <source
    srcset="${srcsets.jpeg}"
    sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
    type="image/jpeg"
  />
  <img
    src="${original}"
    alt="Description"
    loading="lazy"
    style="background-image: url(${blur_placeholder})"
  />
</picture>
```

### Lazy Loading with Blur Placeholder

The blur placeholder is included as a base64 data URL that can be used as a background image while the main image loads.

## Performance Benefits

- **AVIF**: ~50% smaller file sizes vs JPEG
- **Progressive JPEG**: Better perceived loading performance
- **Multiple Breakpoints**: Serve appropriate image sizes
- **Blur Placeholder**: Instant visual feedback
- **CDN**: Backblaze B2 with global delivery

## Error Handling

- Graceful fallbacks for non-image files
- Proper error status updates in database
- Detailed logging for debugging
- Transaction safety with Convex mutations

## Environment Variables Required

- `VITE_AWS_BUCKET_NAME`: B2 bucket name
- `VITE_AWS_REGION`: B2 region
- `AWS_ACCESS_KEY_ID`: B2 access key
- `AWS_SECRET_ACCESS_KEY`: B2 secret key

## Notes

- Only generates variants up to original image size (no upscaling)
- Blur placeholders are created at 40px width for fast loading
- Uses "inside" fit to maintain aspect ratios
- All variants stored at `${media_id}/${variant_name}` in B2
- CDN URLs are hardcoded to `https://gradivo.jknm.site/` for consistency
