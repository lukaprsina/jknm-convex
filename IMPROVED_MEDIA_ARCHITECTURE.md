# Improved Media Architecture

## Problems with Current Schema

1. **Redundant Data**: Variant keys like `"400w.avif"` duplicate width information
2. **Complex Frontend Logic**: Manual URL construction from storage_path + variants
3. **Missing Blur Placeholder**: No direct access to lazy loading placeholder
4. **Inconsistent Naming**: Width encoded differently in key vs object
5. **Complex srcset Building**: Frontend needs complex logic to build responsive images

## Proposed Improved Schema

```typescript
media: defineTable({
  filename: v.string(),
  content_type: v.string(),
  size_bytes: v.number(),
  
  // Store base URL pattern for consistent URL building
  base_url: v.string(), // e.g., "https://gradivo.jknm.site/media123"
  
  // Original image info
  original: v.object({
    url: v.string(),     // Full URL to original image
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    size_bytes: v.number(),
  }),
  
  // Optimized variants - cleaner structure
  variants: v.optional(v.array(
    v.object({
      width: v.number(),
      height: v.number(),
      format: v.union(v.literal("avif"), v.literal("jpeg")),
      url: v.string(),     // Full URL - no manual construction needed
      size_bytes: v.number(),
    })
  )),
  
  // Pre-built srcsets for frontend convenience
  srcsets: v.optional(v.object({
    avif: v.string(),    // Ready-to-use srcset string
    jpeg: v.string(),    // Ready-to-use srcset string
  })),
  
  // Blur placeholder for lazy loading
  blur_placeholder: v.optional(v.string()), // base64 data URL
  
  upload_status: v.union(
    v.literal("pending"),
    v.literal("processing"), 
    v.literal("completed"),
    v.literal("failed"),
  ),
  created_at: v.number(),
})
```

## Benefits of New Schema

### 1. **Simplified Frontend**
```tsx
// Before (complex):
const variants = image.variants?.image_variants;
const parent_dir = image.storage_path.split("/").slice(0, -1).join("/");
const srcset_avif = entries
  .filter(([_, v]) => v.format === "avif")
  .map(([key, v]) => `${parent_dir}/${key} ${v.width}w`)
  .join(", ");

// After (simple):
const { srcsets, blur_placeholder, original } = image;
```

### 2. **Pre-computed URLs**
- No manual URL construction needed
- Consistent URL building in backend
- Ready-to-use srcset strings

### 3. **Better Performance**
- Frontend gets pre-built srcsets
- No client-side string manipulation
- Cleaner React component logic

### 4. **Built-in Lazy Loading Support**
- Direct access to blur placeholder
- No additional queries needed

## Updated Component Example

```tsx
export function ImageElementStatic(props) {
  const { image } = use(MediaContext);
  
  return (
    <SlateElement {...props}>
      <picture>
        {image.srcsets?.avif && (
          <source
            srcSet={image.srcsets.avif}
            sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
            type="image/avif"
          />
        )}
        {image.srcsets?.jpeg && (
          <source
            srcSet={image.srcsets.jpeg}
            sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
            type="image/jpeg"
          />
        )}
        <img
          src={image.original.url}
          alt="Description"
          loading="lazy"
          width={image.original.width}
          height={image.original.height}
          style={{ 
            backgroundImage: image.blur_placeholder ? `url(${image.blur_placeholder})` : undefined 
          }}
        />
      </picture>
    </SlateElement>
  );
}
```

## Migration Strategy

No need for a migration from the old to the new schema, as there are is no production articles yet. Just do the following:

1. **Add new fields to schema, remove old ones**
2. **Update media_sharp.ts and media.ts** to populate the new structure
3. **Update frontend components** to use new structure

