# Group Photo Album - Quick Reference

## New Features Summary

### 1. Navigation Controls ✅
- **Arrow Buttons:** Click left/right arrows to navigate photos
- **Keyboard Shortcuts:** 
  - `←` Previous photo
  - `→` Next photo
  - `Esc` Close lightbox
- **Wrap-around:** Last photo → First photo (and vice versa)
- **Photo Counter:** Shows "3 / 12" position indicator

### 2. Download Functionality ✅
- **Download Button:** Click ⬇ icon to download current photo
- **Filename:** Preserves original filename from URL
- **Fallback:** Opens in new tab if download fails

### 3. Set as Album Cover ✅
- **Star Button:** Click ⭐ icon to set as album cover (admins only)
- **Cover Badge:** Yellow "Cover" badge on current cover photo
- **Real-time Update:** Cover updates immediately without refresh
- **Permissions:** Only group admins can set cover images

---

## User Guide

### Opening the Lightbox
1. Navigate to **My Group** → **Photo Albums**
2. Click on an album to view photos
3. Click any photo thumbnail to open lightbox

### Navigating Photos
**Option 1: Mouse/Touch**
- Click left arrow (◀) for previous photo
- Click right arrow (▶) for next photo

**Option 2: Keyboard**
- Press `←` for previous photo
- Press `→` for next photo
- Press `Esc` to close

### Downloading Photos
1. Open photo in lightbox
2. Click download button (⬇) in top-right
3. Photo downloads to your device

### Setting Album Cover (Admins Only)
1. Open photo in lightbox
2. Click star button (⭐) in top-right
3. Photo becomes album cover
4. Yellow "Cover" badge appears on thumbnail

### Deleting Photos
**Permissions:**
- Admins can delete any photo
- Users can only delete their own photos

**Steps:**
1. Open photo in lightbox
2. Click trash button (🗑️) in top-right
3. Confirm deletion
4. Photo removed from album

---

## Admin Features

### Group Admin Capabilities
- ✅ Upload photos to album
- ✅ Delete any photo in album
- ✅ Set any photo as album cover
- ✅ Download any photo
- ✅ Navigate through all photos

### Regular User Capabilities
- ✅ Upload photos to album
- ✅ Delete only their own photos
- ✅ Download any photo
- ✅ Navigate through all photos
- ❌ Cannot set album cover (admin only)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous photo |
| `→` | Next photo |
| `Esc` | Close lightbox |

---

## Visual Indicators

### Cover Photo Badge
- **Location:** Top-left corner of thumbnail
- **Color:** Yellow background, white text
- **Icon:** Filled star (⭐)
- **Text:** "Cover"

### Delete Button
- **Location:** Top-right corner of thumbnail
- **Visibility:** Appears on hover (for photo owner or admin)
- **Color:** Red background, white icon
- **Icon:** Trash can (🗑️)

### Lightbox Controls
- **Top-left:** Photo counter (e.g., "3 / 12")
- **Top-right:** Action buttons
  - ⭐ Set as Cover (admins only)
  - 🗑️ Delete (owner or admin)
  - ⬇ Download (everyone)
  - ✕ Close (everyone)
- **Left/Right:** Navigation arrows (when multiple photos)

---

## Troubleshooting

### "Only group admins can set the album cover"
**Cause:** You're not a group admin  
**Solution:** Ask a group admin to set the cover, or request admin permissions

### "You can only delete your own photos"
**Cause:** Trying to delete another user's photo without admin rights  
**Solution:** Ask a group admin to delete the photo, or request admin permissions

### Download button not working
**Cause:** Browser blocking download or network issue  
**Solution:** Photo will open in new tab as fallback - right-click and "Save Image As"

### Navigation arrows not appearing
**Cause:** Only one photo in the album  
**Solution:** Upload more photos to enable navigation

---

## Comparison with Other Photo Viewers

| Feature | My Profile | Facility Album | Group Album |
|---------|-----------|----------------|-------------|
| Navigation | ✅ | ✅ | ✅ |
| Keyboard | ✅ | ✅ | ✅ |
| Download | ✅ | ✅ | ✅ |
| Delete | ✅ | ✅ | ✅ |
| Set Cover | ✅ | ✅ | ✅ |
| Cover Badge | ✅ | ✅ | ✅ |

**All photo viewers now have identical functionality!**

---

## Technical Notes

### Files Modified
- `src/components/tribe/AlbumView.tsx` - Main album view component
- `src/components/ImageLightbox.tsx` - Shared lightbox component
- `src/lib/services/groupPhotos.ts` - Already had `setAlbumCover()` function

### Database Tables
- `group_photo_albums` - Stores album metadata including `cover_photo_url`
- `group_photos` - Stores individual photo records

### RLS Policies
- Group members can view photos in their group's albums
- Users can upload photos to their group's albums
- Users can delete their own photos
- Admins can delete any photo in their group's albums
- Admins can update album cover photo

---

## Quick Tips

💡 **Tip 1:** Use keyboard shortcuts for faster navigation  
💡 **Tip 2:** Set a visually appealing photo as the album cover to make it stand out  
💡 **Tip 3:** Download photos before deleting them if you want to keep a copy  
💡 **Tip 4:** The cover photo appears on the album grid view  
💡 **Tip 5:** Navigation wraps around - keep pressing → to cycle through all photos

---

## Support

For issues or questions:
1. Check this quick reference guide
2. Review the full documentation: `GROUP_PHOTO_ALBUM_LIGHTBOX_ENHANCEMENT.md`
3. Contact your group admin for permission-related issues
4. Report bugs to the development team

