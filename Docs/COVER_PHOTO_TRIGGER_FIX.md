# Cover Photo Trigger Fix - MIN(UUID) Error

## Issue Summary

**Error:** `function min(uuid) does not exist`  
**PostgreSQL Error Code:** 42883  
**HTTP Status:** 404 Not Found  
**Location:** Photo upload to facility album  
**Endpoint:** `POST /rest/v1/album_photos`

## Problem Description

When attempting to upload photos to a facility photo album, the database operation failed with a PostgreSQL function error. The error occurred in the `auto_set_cover_photo()` trigger function that runs after inserting photos into the `album_photos` table.

### Error Details

```
Hint: No function matches the given name and argument types. 
You might need to add explicit type casts.
```

The error message indicates that PostgreSQL cannot execute `MIN(id)` on a UUID column because:
1. UUIDs are not naturally ordered (they're random identifiers)
2. PostgreSQL's `MIN()` aggregate function requires a comparable/orderable data type
3. UUIDs don't support comparison operators like `<` or `>` by default

## Root Cause

The bug was in the `auto_set_cover_photo()` function at line 49 of migration `20251006000001_add_cover_photo_support.sql`:

### **Broken Code**

```sql
DECLARE
  photo_count INTEGER;
  first_photo_id UUID;
BEGIN
  -- Count photos in the album
  SELECT COUNT(*), MIN(id) INTO photo_count, first_photo_id  -- ❌ BUG HERE
  FROM album_photos
  WHERE album_id = COALESCE(NEW.album_id, OLD.album_id);
```

**The Problem:**
- `MIN(id)` attempts to find the "minimum" UUID value
- UUIDs are not comparable - they're random 128-bit identifiers
- PostgreSQL throws error: `function min(uuid) does not exist`

### **Why This Happened**

The function was trying to get the "first" photo in an album by using `MIN(id)`, which works for integer IDs but not for UUIDs. The correct approach is to use `ORDER BY created_at` to get the chronologically first photo.

## Solution Implemented

### **Fixed Code**

```sql
DECLARE
  photo_count INTEGER;
  first_photo_id UUID;
  first_photo_url TEXT;
BEGIN
  -- Count photos in the album
  SELECT COUNT(*) INTO photo_count  -- ✅ FIXED: Separate query
  FROM album_photos
  WHERE album_id = COALESCE(NEW.album_id, OLD.album_id);
  
  -- If a cover photo was deleted, set the first remaining photo as cover
  IF TG_OP = 'DELETE' AND OLD.is_cover_photo = true AND photo_count > 0 THEN
    -- Get the first photo by created_at (not by MIN(id))
    SELECT id, photo_url INTO first_photo_id, first_photo_url  -- ✅ FIXED
    FROM album_photos
    WHERE album_id = OLD.album_id
    ORDER BY created_at ASC  -- ✅ Use timestamp ordering
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE album_photos
      SET is_cover_photo = true
      WHERE id = first_photo_id;
      
      UPDATE photo_albums
      SET cover_photo_url = first_photo_url
      WHERE id = OLD.album_id;
    END IF;
  END IF;
```

### **Key Changes**

1. **Separated COUNT query**: Count photos in a separate query instead of combining with MIN(id)
2. **Added first_photo_url variable**: Store both ID and URL in one query
3. **Used ORDER BY created_at**: Get the chronologically first photo instead of trying to find "minimum" UUID
4. **Added IF FOUND check**: Verify that a photo was actually found before updating

## Migration Files

### **New Migration**
**File:** `supabase/migrations/20251007000002_fix_cover_photo_trigger.sql`

This migration recreates the `auto_set_cover_photo()` function with the fix.

### **Updated Migration**
**File:** `supabase/migrations/20251006000001_add_cover_photo_support.sql`

Updated the original migration file to prevent this issue in fresh deployments.

## Technical Details

### Why MIN(UUID) Doesn't Work

UUIDs are designed to be:
- **Random**: Generated using random numbers or timestamps + random data
- **Unique**: Globally unique identifiers
- **Unordered**: No natural ordering or comparison

PostgreSQL UUIDs:
- Are stored as 128-bit values
- Don't have built-in comparison operators
- Can't be used with aggregate functions like MIN(), MAX(), AVG()
- Can be compared for equality (`=`, `!=`) but not for ordering (`<`, `>`)

### Correct Approach for "First" Record

When you need the "first" record with a UUID primary key:

❌ **Wrong:**
```sql
SELECT MIN(id) FROM table;  -- Error: function min(uuid) does not exist
```

✅ **Correct:**
```sql
SELECT id FROM table ORDER BY created_at ASC LIMIT 1;  -- Use timestamp
```

## Files Modified

- ✅ `supabase/migrations/20251007000002_fix_cover_photo_trigger.sql` - New fix migration
- ✅ `supabase/migrations/20251006000001_add_cover_photo_support.sql` - Updated original
- ✅ Applied to dev Supabase project (ID: ohlscdojhsifvnnkoiqi)
- ✅ `Docs/COVER_PHOTO_TRIGGER_FIX.md` - This documentation

## Testing Checklist

- [ ] Upload a photo to an empty facility album
- [ ] Verify the photo is automatically set as cover
- [ ] Verify album's `cover_photo_url` is updated
- [ ] Upload multiple photos to the album
- [ ] Delete the cover photo
- [ ] Verify the next photo (by created_at) becomes the new cover
- [ ] Delete all photos from the album
- [ ] Verify album's `cover_photo_url` is cleared
- [ ] Test with both user albums and facility albums
- [ ] Verify no PostgreSQL errors in logs

## Expected Behavior After Fix

1. **First Photo Upload**:
   - Photo is inserted successfully
   - Trigger sets `is_cover_photo = true` automatically
   - Album's `cover_photo_url` is updated
   - No errors

2. **Subsequent Photo Uploads**:
   - Photos are inserted successfully
   - Existing cover photo remains unchanged
   - No errors

3. **Cover Photo Deletion**:
   - Cover photo is deleted
   - Trigger finds the next photo (by `created_at`)
   - Next photo becomes the new cover
   - Album's `cover_photo_url` is updated
   - No errors

4. **Last Photo Deletion**:
   - Last photo is deleted
   - Album's `cover_photo_url` is cleared
   - No errors

## Related Issues

This fix resolves:
- ✅ Photo upload failures for facility albums
- ✅ `function min(uuid) does not exist` errors
- ✅ 404 errors when inserting into `album_photos` table
- ✅ Trigger failures that prevented photo uploads

## Prevention

To prevent similar issues in the future:

1. **Never use MIN/MAX on UUIDs**: Always use `ORDER BY` with a timestamp column
2. **Test triggers thoroughly**: Test all trigger code paths (INSERT, UPDATE, DELETE)
3. **Use proper data types**: Understand the limitations of each data type
4. **Check PostgreSQL docs**: Verify that aggregate functions support your data types
5. **Test with real data**: Test migrations with actual UUID values, not just integers

## Additional Notes

- This issue only affected photo uploads, not album creation
- The RLS policies we created earlier are working correctly
- User albums (with `user_id NOT NULL`) were also affected by this bug
- The fix applies to both user albums and facility albums
- No data migration needed - this is a function-only fix

## PostgreSQL Function Reference

**Aggregate Functions on UUIDs:**
- ❌ `MIN(uuid_column)` - Not supported
- ❌ `MAX(uuid_column)` - Not supported
- ❌ `AVG(uuid_column)` - Not supported
- ✅ `COUNT(uuid_column)` - Supported
- ✅ `COUNT(DISTINCT uuid_column)` - Supported

**Correct Patterns:**
```sql
-- Get first record by timestamp
SELECT id FROM table ORDER BY created_at ASC LIMIT 1;

-- Get last record by timestamp
SELECT id FROM table ORDER BY created_at DESC LIMIT 1;

-- Get random record
SELECT id FROM table ORDER BY RANDOM() LIMIT 1;

-- Count records
SELECT COUNT(*) FROM table;
```

