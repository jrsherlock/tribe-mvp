# Photo Deletion Implementation

## Overview
This document describes the implementation of photo deletion functionality for Photo Albums in the Sangha MVP application. Users can now delete photos from both personal albums and facility albums through the grid view and lightbox modal.

## Implementation Date
2025-10-06

## Features Implemented

### 1. Service Layer (`src/lib/services/albums.ts`)
- **New Function**: `deletePhoto(photoId: string)`
  - Deletes a single photo record from the `album_photos` table
  - Returns a Supabase query result
  - RLS policies handle authorization automatically

### 2. ImageLightbox Component (`src/components/ImageLightbox.tsx`)
- **New Props**:
  - `onDelete?: (index: number) => void` - Callback when delete button is clicked
  - `canDelete?: boolean` - Controls visibility of delete button
- **New Features**:
  - Delete button in top-right controls (red trash icon)
  - Hover effect on delete button (red background on hover)
  - Calls `onDelete` callback with current photo index

### 3. PhotoAlbums Component (`src/components/PhotoAlbums.tsx`)
- **New Functions**:
  - `handleDeletePhoto(photoId: string, photoUrl: string)` - Main deletion handler
    - Shows confirmation dialog before deletion
    - Deletes from database using `deletePhoto` service
    - Deletes from Supabase storage using `deletePhotos` service
    - Updates local state to remove photo from UI
    - Handles lightbox index adjustment when deleting current photo
  - `handleDeletePhotoByIndex(index: number)` - Wrapper for lightbox callback
- **UI Changes**:
  - Delete button added to photo grid (appears on hover)
  - Red trash icon button positioned in top-right of each photo
  - Grouped with "Set as Cover" button for better UX
  - Delete functionality wired to lightbox via `onDelete` prop
- **Authorization**: Only available when `isOwnProfile === true`

### 4. FacilityPhotoAlbums Component (`src/components/admin/FacilityPhotoAlbums.tsx`)
- **New Functions**:
  - `handleDeletePhoto(photoId: string, photoUrl: string)` - Main deletion handler
    - Shows confirmation dialog before deletion
    - Deletes from database using `deletePhoto` service
    - Deletes from Supabase storage using `deletePhotos` service
    - Updates local state to remove photo from UI
    - Handles lightbox index adjustment when deleting current photo
  - `handleDeletePhotoByIndex(index: number)` - Wrapper for lightbox callback
- **UI Changes**:
  - Delete button added to photo grid (appears on hover)
  - Red trash icon button positioned in top-right of each photo
  - Grouped with "Set as Cover" button for better UX
  - Delete functionality wired to lightbox via `onDelete` prop
- **Authorization**: Only available when `canEdit === true` (Facility Admins and SuperUsers)

## User Experience

### Deletion Flow
1. **Grid View**: User hovers over a photo → Delete button appears → Click to delete
2. **Lightbox View**: User opens photo in lightbox → Delete button visible in top controls → Click to delete
3. **Confirmation**: Browser confirmation dialog appears: "Are you sure you want to delete this photo? This action cannot be undone."
4. **Deletion**: If confirmed, photo is deleted from both database and storage
5. **UI Update**: Photo disappears from grid/lightbox without page refresh
6. **Lightbox Adjustment**: If deleting current photo in lightbox:
   - If last photo: lightbox closes
   - If last in array: shows previous photo
   - Otherwise: shows next photo at same index

### Visual Design
- **Delete Button**: Red background with white trash icon
- **Hover Effect**: Darker red on hover for better feedback
- **Positioning**: Top-right corner, grouped with other action buttons
- **Visibility**: Only appears on hover (grid view) or always visible (lightbox)

## Security & Authorization

### Row Level Security (RLS)
The implementation relies on existing RLS policies:

#### Personal User Photos (`album_photos` table)
- **Policy**: "Users can delete own photos"
- **Rule**: `auth.uid() = user_id`
- **Effect**: Users can only delete photos they uploaded

#### Facility Photos (`album_photos` table)
- **Policy**: "SuperUsers can delete facility photos"
- **Rule**: User exists in `superusers` table
- **Policy**: "Facility Admins can delete facility photos"
- **Rule**: User is OWNER or ADMIN in `tenant_members` for the photo's tenant

### Storage Deletion
- **Policy**: "Users can delete photos" (from `supabase/migrations/20251007000001_facility_albums_rls.sql`)
- **Rules**:
  - SuperUsers can delete anywhere
  - Facility Admins can delete from their facility folder
  - Regular users can delete from folders containing their user_id

### Multi-Tenant Isolation
- Personal albums: Photos filtered by `user_id` and `tenant_id`
- Facility albums: Photos filtered by `tenant_id` with `user_id IS NULL`
- RLS ensures users cannot delete photos from other tenants

## Database Triggers

### Automatic Cover Photo Management
When a photo is deleted, existing database triggers handle:
1. **Photo Count Update**: `album_photos_count_trigger` decrements `photo_count` in `photo_albums`
2. **Cover Photo Reassignment**: If deleted photo was cover photo:
   - First remaining photo (by `created_at`) becomes new cover
   - Album's `cover_photo_url` is updated
   - If no photos remain, `cover_photo_url` is cleared

## Error Handling

### Client-Side
- Confirmation dialog prevents accidental deletions
- Try-catch blocks handle errors gracefully
- Toast notifications for success/failure
- Console logging for debugging

### Server-Side
- RLS policies return permission errors if unauthorized
- Database constraints prevent orphaned records
- Storage deletion failures are logged but don't block database deletion

## Testing Checklist

- [ ] Delete photo from personal album grid view
- [ ] Delete photo from personal album lightbox view
- [ ] Delete photo from facility album grid view (as Facility Admin)
- [ ] Delete photo from facility album lightbox view (as Facility Admin)
- [ ] Verify confirmation dialog appears
- [ ] Verify photo is removed from UI without refresh
- [ ] Verify photo is deleted from Supabase storage
- [ ] Verify photo is deleted from database
- [ ] Verify lightbox adjusts index correctly when deleting current photo
- [ ] Verify lightbox closes when deleting last photo
- [ ] Verify cover photo is reassigned if deleted photo was cover
- [ ] Verify album photo count decrements
- [ ] Verify RLS prevents unauthorized deletions
- [ ] Verify multi-tenant isolation (users can't delete other tenant's photos)
- [ ] Test as different roles: SuperUser, Facility Admin, Regular User
- [ ] Test in solo mode (no tenant)

## Files Modified

1. `src/lib/services/albums.ts` - Added `deletePhoto` function
2. `src/components/ImageLightbox.tsx` - Added delete button and props
3. `src/components/PhotoAlbums.tsx` - Added delete handlers and UI
4. `src/components/admin/FacilityPhotoAlbums.tsx` - Added delete handlers and UI

## Dependencies

- Existing RLS policies (no changes needed)
- Existing database triggers (no changes needed)
- Existing storage policies (no changes needed)
- `deletePhotos` function from `src/lib/services/storage.ts`
- `deletePhoto` function from `src/lib/services/albums.ts` (new)

## Future Enhancements

1. **Bulk Deletion**: Allow selecting multiple photos for deletion
2. **Soft Delete**: Add trash/archive functionality with restore option
3. **Deletion History**: Track deleted photos for audit purposes
4. **Undo Feature**: Brief window to undo deletion before permanent removal
5. **Permissions UI**: Show why delete button is disabled (if applicable)
6. **Loading States**: Show spinner during deletion process
7. **Optimistic Updates**: Remove from UI immediately, rollback on error

## Notes

- The implementation maintains consistency with existing code patterns
- All authorization is handled by RLS policies (no client-side checks beyond UI visibility)
- Storage paths are extracted from photo URLs using the same pattern as album deletion
- The lightbox index adjustment logic prevents out-of-bounds errors
- Confirmation dialogs use native browser `confirm()` for simplicity

