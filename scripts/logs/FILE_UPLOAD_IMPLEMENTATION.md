# File Upload Hook Implementation Guide

## Problem Summary

You were stuck implementing a `use-upload-file.ts` hook that needs to:

1. Get a presigned URL from Convex
2. Upload the file to S3 using that presigned URL
3. Track upload progress
4. Handle success/error states
5. Provide the required interface for the Plate editor

The main challenge was how to chain these operations within React Query's `useMutation` without violating the rules of hooks.

## Solutions

### Solution 1: Single Mutation with Chained Operations (Recommended)

**File:** `src/hooks/use-upload-file.ts`

This approach uses a single `useMutation` that chains both operations in the `mutationFn`. The key insight is to call `useConvexMutation` at the top level of the hook (not inside the mutation function) and then use the returned function inside the mutation.

**Benefits:**

- Simpler state management
- Single loading/error state
- Cleaner API
- Better error handling

**Key Pattern:**

```typescript
// ✅ Call hook at top level
const getPresignedUrl = useConvexMutation(api.media.generate_presigned_upload_url);

const mutation = useMutation({
  mutationFn: async (file: File) => {
    // ✅ Use the function returned by the hook
    const presignedData = await getPresignedUrl({...});

    // Chain the S3 upload
    await uploadToS3(presignedData, file);

    return result;
  }
});
```

### Solution 2: Separate Mutations (Alternative)

**File:** `src/hooks/use-upload-file-alternative.ts`

This approach uses two separate mutations that are chained through the `onSuccess` callback of the first mutation.

**Benefits:**

- More granular control over each step
- Separate error states for each operation
- Easier to debug individual steps
- Can retry individual steps

**Key Pattern:**

```typescript
const presignedUrlMutation = useMutation({
  mutationFn: useConvexMutation(api.media.generate_presigned_upload_url),
  onSuccess: (presignedData) => {
    // Chain to next mutation
    s3UploadMutation.mutate({ presignedData, file });
  },
});
```

## Why This Works

### React Query Mutation Chaining

React Query mutations support async operations in several ways:

1. **In `mutationFn`**: You can perform multiple async operations and chain them
2. **In `onSuccess`**: You can trigger additional mutations or side effects
3. **Using multiple mutations**: Chain them through callbacks

### Avoiding Hook Rule Violations

The key is to call hooks (`useConvexMutation`) at the top level of your custom hook, not inside mutation functions or callbacks.

```typescript
// ❌ Wrong - calling hook inside function
const mutation = useMutation({
  mutationFn: async (file) => {
    const fn = useConvexMutation(api.something); // Hook rule violation!
    return await fn(file);
  },
});

// ✅ Correct - call hook at top level
const convexMutation = useConvexMutation(api.something);
const mutation = useMutation({
  mutationFn: async (file) => {
    return await convexMutation(file); // Use the function
  },
});
```

## Progress Tracking

Both solutions use `XMLHttpRequest` for S3 uploads to get proper upload progress:

```typescript
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener("progress", (event) => {
  if (event.lengthComputable) {
    const progressPercent = (event.loaded / event.total) * 100;
    setProgress(progressPercent);
    onUploadProgress?.({ progress: progressPercent });
  }
});
```

This is necessary because:

- `fetch()` doesn't support upload progress
- `axios` would work but adds dependency
- `XMLHttpRequest` is built-in and provides the needed events

## Integration with Plate Editor

Both hooks return the interface expected by the Plate editor:

```typescript
return {
  isUploading,
  progress,
  uploadFile,
  uploadedFile,
  uploadingFile,
  // Additional state for better control
  error,
  isError,
  isSuccess,
  reset,
};
```

## Environment Variables

Make sure to set up your environment variables:

```env
NEXT_PUBLIC_AWS_S3_BASE_URL=https://your-bucket.s3.amazonaws.com
# or your CloudFlare R2/other S3-compatible endpoint
```

## Best Practices Applied

1. **Proper hook usage**: All hooks called at top level
2. **Error handling**: Comprehensive error states
3. **Progress tracking**: Real upload progress with XMLHttpRequest
4. **State management**: Clear loading/success/error states
5. **Cleanup**: Proper state reset and cleanup
6. **TypeScript**: Full type safety with proper generics
7. **Async chaining**: Proper async operation sequencing

## Usage Example

```typescript
function MyUploadComponent() {
  const { uploadFile, isUploading, progress, uploadedFile } = useUploadFile({
    onUploadComplete: (file) => {
      console.log('Upload complete:', file);
    },
    onUploadError: (error) => {
      console.error('Upload failed:', error);
    },
    onUploadProgress: ({ progress }) => {
      console.log('Progress:', progress);
    }
  });

  const handleFileSelect = (file: File) => {
    uploadFile(file);
  };

  return (
    <div>
      {isUploading && <progress value={progress} max={100} />}
      {uploadedFile && <img src={uploadedFile.url} alt="Uploaded" />}
    </div>
  );
}
```

This implementation provides a robust, type-safe, and performant file upload solution that integrates seamlessly with both Convex and the Plate editor.
