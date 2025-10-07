# Photo Albums Lightbox Runtime Error Fix

## Issue Summary

**Error:** `Uncaught TypeError: Cannot read properties of undefined (reading 'src')`  
**Location:** `ImageLightbox.tsx:95:20`  
**Component Stack:** `ImageLightbox` → `FacilityPhotoAlbums` → `FacilityProfile` → `AdminTreeView`

## Root Cause Analysis

The error occurred when navigating to the Photo Albums section within a Facility detail view. The issue was caused by:

1. **Empty Photos Array**: When the Photo Albums tab is first loaded, the `photos` state starts as an empty array `[]`
2. **Default Index**: The `lightboxIndex` state is initialized to `0`
3. **Undefined Access**: The `ImageLightbox` component tried to access `images[0]` on an empty array, resulting in `undefined`
4. **Callback Dependency**: The `handleDownload` callback had `currentImage.src` in its dependency array, which threw an error when `currentImage` was `undefined`

The problem was that React's `useCallback` hooks were being evaluated during the render phase **before** the guard check `if (!currentImage) return null;` at line 137, causing the error to occur when accessing `currentImage.src` in the dependency array.

## Solution Implemented

### 1. Early Return Guard (Lines 57-60)

Added an early return at the beginning of the component to prevent any hooks from being created when the images array is empty or the index is out of bounds:

```typescript
// Early return if images array is empty or index is out of bounds
if (images.length === 0 || index < 0 || index >= images.length) {
  return null;
}
```

This ensures that:
- No hooks are created when there are no images
- The component safely handles edge cases
- The lightbox doesn't attempt to render with invalid data

### 2. Safe Property Access in Callback (Lines 78-83)

Added a guard check inside the `handleDownload` callback to handle cases where `currentImage` might be undefined:

```typescript
const handleDownload = useCallback(async () => {
  // Guard against undefined currentImage
  if (!currentImage?.src) {
    console.warn('Cannot download: image source is undefined');
    return;
  }
  // ... rest of download logic
}, [currentImage?.src]);
```

Changed the dependency from `currentImage.src` to `currentImage?.src` using optional chaining to prevent errors.

## Files Modified

- **src/components/ImageLightbox.tsx**
  - Added early return guard for empty images array or invalid index
  - Added null safety check in `handleDownload` callback
  - Changed dependency array to use optional chaining

## Testing Checklist

- [ ] Navigate to Admin console
- [ ] Select a facility (e.g., "Top of the World Ranch")
- [ ] Click on "Photo Albums" tab
- [ ] Verify no runtime error occurs
- [ ] Verify empty state displays correctly when no albums exist
- [ ] Create a new album
- [ ] Upload photos to the album
- [ ] Click on a photo to open the lightbox
- [ ] Verify lightbox displays correctly
- [ ] Test navigation arrows (if multiple photos)
- [ ] Test download button
- [ ] Test keyboard shortcuts (arrow keys, ESC)
- [ ] Test clicking outside to close

## Expected Behavior After Fix

1. **Empty State**: When navigating to Photo Albums with no photos, the component should render without errors
2. **Loading State**: During data fetching, the component should handle the empty array gracefully
3. **Normal Operation**: Once photos are loaded, the lightbox should work as expected
4. **Error Prevention**: The component should never attempt to access properties of undefined images

## Additional Notes

- This fix maintains backward compatibility with existing functionality
- No changes were needed in `FacilityPhotoAlbums.tsx` or `PhotoAlbums.tsx`
- The fix applies to both user photo albums and facility photo albums
- The component now handles all edge cases: empty arrays, invalid indices, and undefined images

## Related Components

- `src/components/admin/FacilityPhotoAlbums.tsx` - Uses ImageLightbox for facility albums
- `src/components/PhotoAlbums.tsx` - Uses ImageLightbox for user albums
- `src/lib/services/albums.ts` - Album and photo data services

## Prevention

To prevent similar issues in the future:

1. Always add early return guards when dealing with array access in components
2. Use optional chaining (`?.`) when accessing properties that might be undefined
3. Place guards before any hooks that depend on potentially undefined values
4. Test components with empty data states during development

