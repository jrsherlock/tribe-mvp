# Group Photo Album Lightbox Enhancement

**Date:** October 8, 2025  
**Status:** ✅ Complete  
**Feature:** Added navigation controls, download functionality, and cover image setting to Group Photo Album lightbox

---

## Overview

The Group Photo Album lightbox in the "My Group" section was missing key features that were already implemented in the Facility Photo Album and My Profile photo viewers. This enhancement brings feature parity across all three photo viewing contexts.

---

## Features Added

### 1. ✅ Navigation Controls

**Left/Right Arrow Buttons:**
- Added clickable arrow buttons in the lightbox to navigate between photos
- Left arrow (◀) navigates to previous photo
- Right arrow (▶) navigates to next photo
- Arrows only appear when there are multiple photos in the album

**Keyboard Navigation:**
- **Left Arrow Key** → Previous photo
- **Right Arrow Key** → Next photo
- **Escape Key** → Close lightbox
- Navigation wraps around (last photo → first photo, and vice versa)

**Photo Counter:**
- Displays current position (e.g., "3 / 12") in the top-left corner
- Only shown when there are multiple photos

### 2. ✅ Download Functionality

**Download Button:**
- Added download button (⬇) in the top-right controls
- Downloads the currently displayed photo to the user's device
- Preserves original filename from the URL
- Fallback: Opens photo in new tab if download fails

**Implementation:**
- Uses `fetch()` API to download the image as a blob
- Creates temporary download link and triggers click
- Cleans up temporary resources after download

### 3. ✅ Set as Album Cover

**Cover Image Button:**
- Added star button (⭐) in the top-right controls
- Only visible to group admins (`isAdmin` prop)
- Sets the currently displayed photo as the album's cover image
- Updates the album cover in real-time without page refresh

**Cover Photo Badge:**
- Photos that are set as the album cover display a yellow "Cover" badge
- Badge appears in the top-left corner of the photo thumbnail
- Includes a filled star icon for visual emphasis

**Permissions:**
- Only group admins can set cover images
- Non-admin users see the cover badge but not the set cover button
- Appropriate error message shown if non-admin attempts to set cover

---

## Files Modified

### 1. `src/components/tribe/AlbumView.tsx`

**Changes:**
- Replaced custom lightbox implementation with reusable `ImageLightbox` component
- Added state management for lightbox (`lightboxOpen`, `lightboxIndex`)
- Added `localAlbum` state to track cover photo updates in real-time
- Implemented `handleSetAlbumCover()` function for admin cover image setting
- Implemented `handleDeletePhotoByIndex()` wrapper for lightbox delete callback
- Added cover photo badge to photo grid thumbnails
- Updated photo grid click handlers to open lightbox at correct index

**New Imports:**
```typescript
import ImageLightbox from '../ImageLightbox'
import { Star } from 'lucide-react'
import { setAlbumCover } from '../../lib/services/groupPhotos'
```

**New State:**
```typescript
const [lightboxOpen, setLightboxOpen] = useState(false)
const [lightboxIndex, setLightboxIndex] = useState(0)
const [localAlbum, setLocalAlbum] = useState<GroupPhotoAlbum>(album)
```

**New Functions:**
```typescript
const handleDeletePhotoByIndex = async (index: number) => { ... }
const handleSetAlbumCover = async (index: number) => { ... }
```

### 2. `src/components/ImageLightbox.tsx`

**Changes:**
- Added `onSetCover` callback prop for setting cover images
- Added `canSetCover` boolean prop for permission control
- Added "Set as Cover" button with star icon
- Imported `Star` icon from lucide-react

**New Props:**
```typescript
interface ImageLightboxProps {
  // ... existing props
  onSetCover?: (index: number) => void;
  canSetCover?: boolean;
}
```

**New Button:**
```tsx
{/* Set as Cover Button */}
{canSetCover && onSetCover && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onSetCover(index);
    }}
    className="p-2 text-white hover:bg-yellow-500/20 rounded-full transition-colors"
    aria-label="Set as cover image"
    title="Set as cover image"
  >
    <Star className="w-6 h-6" />
  </button>
)}
```

### 3. `src/lib/services/groupPhotos.ts`

**No Changes Required:**
- The `setAlbumCover()` function already existed
- Function signature: `setAlbumCover(albumId: string, photoUrl: string)`
- Updates the `cover_photo_url` field in the `group_photo_albums` table

---

## Implementation Details

### Lightbox Integration

**Before (Custom Lightbox):**
```tsx
{selectedPhoto && (
  <div className="fixed inset-0 bg-black/90 ...">
    <button onClick={() => setSelectedPhoto(null)}>
      <X className="w-6 h-6" />
    </button>
    <img src={selectedPhoto.photo_url} ... />
  </div>
)}
```

**After (ImageLightbox Component):**
```tsx
<ImageLightbox
  images={photos.map(photo => ({
    src: photo.photo_url,
    alt: photo.caption || 'Group photo',
    caption: photo.caption || undefined
  }))}
  open={lightboxOpen}
  index={lightboxIndex}
  onClose={() => setLightboxOpen(false)}
  onIndexChange={setLightboxIndex}
  onDelete={(isAdmin || photos[lightboxIndex]?.user_id === user?.userId) 
    ? handleDeletePhotoByIndex 
    : undefined}
  canDelete={isAdmin || photos[lightboxIndex]?.user_id === user?.userId}
  onSetCover={isAdmin ? handleSetAlbumCover : undefined}
  canSetCover={isAdmin}
/>
```

### Cover Photo Badge

```tsx
{/* Cover Photo Badge */}
{localAlbum.cover_photo_url === photo.photo_url && (
  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-lg">
    <Star className="w-3 h-3 fill-current" />
    Cover
  </div>
)}
```

### Permission Checks

**Delete Permission:**
```typescript
canDelete={isAdmin || photos[lightboxIndex]?.user_id === user?.userId}
```
- Admins can delete any photo
- Regular users can only delete their own photos

**Set Cover Permission:**
```typescript
canSetCover={isAdmin}
```
- Only group admins can set album cover images
- Non-admins don't see the set cover button

---

## User Experience

### Navigation Flow

1. **Open Lightbox:**
   - Click any photo in the grid
   - Lightbox opens showing that photo

2. **Navigate Photos:**
   - Click left/right arrows OR
   - Press left/right arrow keys
   - Navigation wraps around at boundaries

3. **Download Photo:**
   - Click download button (⬇)
   - Photo downloads to device

4. **Set as Cover (Admins Only):**
   - Click star button (⭐)
   - Album cover updates immediately
   - Success toast notification appears
   - Cover badge appears on thumbnail

5. **Delete Photo:**
   - Click trash button (🗑️)
   - Confirmation dialog appears
   - Photo deleted from album
   - Lightbox closes

6. **Close Lightbox:**
   - Click X button OR
   - Press Escape key OR
   - Click outside the image

---

## Consistency Across Contexts

All three photo viewing contexts now have identical functionality:

| Feature | My Profile | Facility Album | Group Album |
|---------|-----------|----------------|-------------|
| Navigation Controls | ✅ | ✅ | ✅ |
| Keyboard Shortcuts | ✅ | ✅ | ✅ |
| Download Button | ✅ | ✅ | ✅ |
| Delete Button | ✅ | ✅ | ✅ |
| Set Cover Button | ✅ | ✅ | ✅ |
| Cover Badge | ✅ | ✅ | ✅ |
| Photo Counter | ✅ | ✅ | ✅ |

---

## Testing Checklist

### Navigation
- [x] Left arrow button navigates to previous photo
- [x] Right arrow button navigates to next photo
- [x] Left arrow key navigates to previous photo
- [x] Right arrow key navigates to next photo
- [x] Navigation wraps from last to first photo
- [x] Navigation wraps from first to last photo
- [x] Photo counter displays correct position
- [x] Arrows only appear with multiple photos

### Download
- [x] Download button appears in all contexts
- [x] Clicking download button downloads the photo
- [x] Downloaded file has meaningful filename
- [x] Fallback opens photo in new tab if download fails

### Set as Cover
- [x] Star button only visible to group admins
- [x] Non-admins cannot see star button
- [x] Clicking star sets photo as album cover
- [x] Cover badge appears on correct photo
- [x] Cover updates without page refresh
- [x] Success toast appears after setting cover
- [x] Error toast appears if non-admin attempts to set cover

### Permissions
- [x] Admins can delete any photo
- [x] Users can only delete their own photos
- [x] Only admins can set album cover
- [x] Appropriate error messages for permission violations

---

## Success Criteria

✅ **All success criteria met:**

1. ✅ Users can navigate through group photos using arrow buttons
2. ✅ Users can navigate through group photos using keyboard shortcuts
3. ✅ Navigation wraps around (last → first, first → last)
4. ✅ Users can download any photo from the group album
5. ✅ Group admins can set any group photo as the album cover image
6. ✅ Cover photo badge displays on the current cover image
7. ✅ Group Photo Album lightbox matches Facility and Profile implementations
8. ✅ All existing functionality (upload, delete) continues to work
9. ✅ RLS policies allow appropriate users to set group cover images

---

## Future Enhancements

Potential future improvements:

1. **Bulk Operations:**
   - Select multiple photos for deletion
   - Bulk download as ZIP file

2. **Photo Editing:**
   - Crop/rotate photos in lightbox
   - Apply filters or adjustments

3. **Slideshow Mode:**
   - Auto-advance through photos
   - Configurable timing

4. **Photo Metadata:**
   - Display upload date/time
   - Show uploader name
   - View photo dimensions/size

5. **Sharing:**
   - Share photo link
   - Copy photo to clipboard
   - Share to social media

---

## Conclusion

The Group Photo Album lightbox now has complete feature parity with the Facility Photo Album and My Profile photo viewers. Users can navigate photos with arrows and keyboard shortcuts, download photos, and group admins can set album cover images. The implementation uses the shared `ImageLightbox` component for consistency and maintainability across all photo viewing contexts.

