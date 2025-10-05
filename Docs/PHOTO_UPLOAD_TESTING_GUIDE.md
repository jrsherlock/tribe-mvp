# Photo Upload Testing Guide

## Quick Test Checklist

### 1. Basic Upload Test
- [ ] Navigate to My Profile → Photo Albums
- [ ] Click "New Album"
- [ ] Create an album with a title
- [ ] Click on the album to open it
- [ ] Click "Add Photos"
- [ ] Click the upload area to browse files
- [ ] Select 1-3 photos
- [ ] Verify previews appear
- [ ] Click "Upload X Photos"
- [ ] Verify progress bar appears
- [ ] Verify success toast appears
- [ ] Verify photos appear in the album
- [ ] Verify album cover photo is set

### 2. Drag-and-Drop Test
- [ ] Open an album
- [ ] Click "Add Photos"
- [ ] Drag photos from your file explorer onto the drop zone
- [ ] Verify drop zone highlights when dragging over
- [ ] Verify previews appear after drop
- [ ] Upload and verify success

### 3. Batch Upload Test
- [ ] Select 10+ photos at once
- [ ] Verify all previews appear
- [ ] Verify progress bar updates smoothly
- [ ] Verify all photos upload successfully
- [ ] Verify album photo count is correct

### 4. Error Handling Test
- [ ] Try uploading a non-image file (should be filtered out)
- [ ] Try uploading a very large file (>10MB if limit exists)
- [ ] Verify appropriate error messages appear

### 5. Preview Management Test
- [ ] Select multiple photos
- [ ] Click X on individual photos to remove them
- [ ] Verify preview is removed
- [ ] Click "Clear all"
- [ ] Verify all previews are cleared
- [ ] Select photos again and verify it works

### 6. Mobile Test
- [ ] Test on mobile device or responsive mode
- [ ] Verify modal is properly sized
- [ ] Verify preview grid is responsive
- [ ] Verify buttons are touch-friendly
- [ ] Verify upload works on mobile

---

## Detailed Test Scenarios

### Scenario 1: First-Time User
**Goal**: Verify complete flow for new user

1. Sign in as a new user
2. Navigate to My Profile
3. Verify "No albums yet" message appears
4. Click "New Album"
5. Enter album details:
   - Title: "My First Album"
   - Description: "Testing photo uploads"
   - Public: Unchecked
6. Click "Create Album"
7. Verify success toast
8. Verify album appears in grid
9. Click on the album
10. Verify "No photos yet" message
11. Click "Add Photos"
12. Select 3 photos
13. Verify previews appear
14. Click "Upload 3 Photos"
15. Verify progress bar
16. Verify success toast
17. Verify photos appear
18. Verify album cover is set
19. Go back to albums list
20. Verify album shows "3 photos"

### Scenario 2: Power User - Batch Upload
**Goal**: Test uploading many photos at once

1. Open an existing album
2. Click "Add Photos"
3. Select 20 photos
4. Verify all 20 previews appear
5. Scroll through previews
6. Remove 2 photos using X button
7. Verify 18 photos remain
8. Click "Upload 18 Photos"
9. Watch progress bar go from 0% to 100%
10. Verify success toast shows "18 photos uploaded"
11. Verify all 18 photos appear in album
12. Verify album count updated correctly

### Scenario 3: Drag-and-Drop
**Goal**: Test drag-and-drop functionality

1. Open an album
2. Click "Add Photos"
3. Open file explorer
4. Drag 5 photos over the drop zone
5. Verify drop zone highlights (border changes color)
6. Drop the photos
7. Verify drop zone returns to normal
8. Verify 5 previews appear
9. Upload and verify success

### Scenario 4: Error Recovery
**Goal**: Test error handling

1. Open an album
2. Click "Add Photos"
3. Select mix of images and non-images (e.g., .txt, .pdf)
4. Verify only images are added to previews
5. Verify error toast if non-images were selected
6. Upload the valid images
7. Verify partial success works

### Scenario 5: Cancel and Resume
**Goal**: Test canceling and resuming

1. Open an album
2. Click "Add Photos"
3. Select photos
4. Click "Cancel" before uploading
5. Verify modal closes
6. Verify no photos were uploaded
7. Click "Add Photos" again
8. Verify modal is clean (no previous selections)
9. Select new photos
10. Upload successfully

---

## Browser Testing Matrix

| Browser | Desktop | Mobile | Drag-Drop | Upload | Notes |
|---------|---------|--------|-----------|--------|-------|
| Chrome | ✅ | ✅ | ✅ | ✅ | Full support |
| Firefox | ✅ | ✅ | ✅ | ✅ | Full support |
| Safari | ✅ | ✅ | ⚠️ | ✅ | Drag-drop limited on iOS |
| Edge | ✅ | ✅ | ✅ | ✅ | Full support |

---

## Performance Testing

### Small Files (< 1MB each)
- [ ] Upload 1 photo: < 2 seconds
- [ ] Upload 10 photos: < 10 seconds
- [ ] Upload 50 photos: < 60 seconds

### Large Files (5-10MB each)
- [ ] Upload 1 photo: < 5 seconds
- [ ] Upload 5 photos: < 30 seconds
- [ ] Upload 10 photos: < 60 seconds

### Network Conditions
- [ ] Test on fast connection (WiFi)
- [ ] Test on slow connection (3G simulation)
- [ ] Verify progress bar is accurate
- [ ] Verify timeout handling

---

## Common Issues and Solutions

### Issue: Photos don't appear after upload
**Solution**: 
- Check browser console for errors
- Verify Supabase storage bucket exists
- Verify RLS policies are correct
- Check network tab for failed requests

### Issue: Drag-and-drop doesn't work
**Solution**:
- Verify browser supports drag-and-drop
- Check if event handlers are properly attached
- Try using file input as fallback

### Issue: Progress bar stuck at 0%
**Solution**:
- Check if upload is actually happening
- Verify progress calculation logic
- Check for JavaScript errors

### Issue: Modal doesn't close after upload
**Solution**:
- Verify success handler is called
- Check if `setShowPhotoUpload(false)` is executed
- Look for errors in upload function

---

## Debugging Tips

### Enable Verbose Logging
Add to `uploadPhotos` function:
```typescript
console.log('Starting upload:', files.length, 'files')
console.log('Album ID:', albumId)
console.log('User ID:', user.userId)
console.log('Tenant ID:', currentTenantId)
```

### Check Network Requests
1. Open browser DevTools
2. Go to Network tab
3. Filter by "storage" or "supabase"
4. Upload photos
5. Verify POST requests to storage bucket
6. Check response status codes

### Verify Storage Bucket
```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'photos';

-- Check storage policies
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

### Check Database Records
```sql
-- Verify album exists
SELECT * FROM photo_albums WHERE id = 'album-id';

-- Check uploaded photos
SELECT * FROM album_photos WHERE album_id = 'album-id';

-- Verify photo count
SELECT photo_count FROM photo_albums WHERE id = 'album-id';
```

---

## Success Criteria

✅ **Upload Works**: Photos successfully upload to Supabase Storage  
✅ **Database Updated**: Records created in `album_photos` table  
✅ **UI Updates**: Photos appear in album immediately  
✅ **Progress Shown**: User sees upload progress  
✅ **Errors Handled**: Clear error messages for failures  
✅ **Mobile Works**: Fully functional on mobile devices  
✅ **Performance**: Uploads complete in reasonable time  
✅ **UX Smooth**: No confusing states or broken flows  

---

## Automated Testing (Future)

### Unit Tests
```typescript
describe('PhotoAlbums', () => {
  it('should handle file selection', () => {
    // Test handleFileSelect function
  })
  
  it('should create preview URLs', () => {
    // Test preview URL creation
  })
  
  it('should upload photos successfully', () => {
    // Test uploadPhotos function
  })
  
  it('should handle upload errors', () => {
    // Test error handling
  })
})
```

### Integration Tests
```typescript
describe('Photo Upload Flow', () => {
  it('should complete full upload flow', async () => {
    // 1. Create album
    // 2. Select photos
    // 3. Upload photos
    // 4. Verify photos appear
  })
})
```

---

## Reporting Issues

If you find bugs, report with:
1. **Browser**: Chrome 120, Firefox 121, etc.
2. **Device**: Desktop, iPhone 14, etc.
3. **Steps to reproduce**: Detailed steps
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happened
6. **Screenshots**: If applicable
7. **Console errors**: Any JavaScript errors
8. **Network logs**: Failed requests

---

## Sign-Off Checklist

Before marking as complete:
- [ ] All basic tests pass
- [ ] All detailed scenarios pass
- [ ] Tested on 3+ browsers
- [ ] Tested on mobile
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Ready for production

