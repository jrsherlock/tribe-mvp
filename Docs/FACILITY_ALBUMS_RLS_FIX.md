# Facility Photo Albums RLS Fix

## Issue Summary

**Error:** `Failed to create album: new row violates row-level security policy for table "photo_albums"`  
**HTTP Status:** 403 Forbidden  
**Location:** `FacilityPhotoAlbums.tsx:172`

## Problem Description

When attempting to create a facility photo album from the Admin console, the operation failed with an RLS (Row Level Security) policy violation. The error occurred because:

1. Facility albums have `user_id = NULL` (they belong to the facility/tenant, not a specific user)
2. The existing RLS policies only allowed users to create albums where `auth.uid() = user_id`
3. Since `user_id` is `NULL` for facility albums, this check always failed
4. SuperUsers and Facility Admins were unable to create facility albums despite having the necessary permissions

## Root Cause

The original RLS policies in `supabase-rls-policies.sql` were designed for personal user albums only:

```sql
-- Users can insert their own albums
CREATE POLICY "Users can insert own albums" ON photo_albums
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

This policy doesn't account for facility albums where `user_id IS NULL`.

## Solution Implemented

Created comprehensive RLS policies for facility albums that:
1. Allow SuperUsers to manage all facility albums
2. Allow Facility Admins to manage albums for their facility
3. Allow tenant members to view public facility albums
4. Apply the same permissions to both `photo_albums` and `album_photos` tables

### Migration File

**File:** `supabase/migrations/20251007000001_facility_albums_rls.sql`

### Policies Created

#### Photo Albums Table

**SELECT (View) Policies:**
- `SuperUsers can view facility albums` - SuperUsers can view all facility albums
- `Facility Admins can view facility albums` - Facility Admins can view their facility's albums
- `Tenant members can view public facility albums` - Tenant members can view public albums

**INSERT (Create) Policies:**
- `SuperUsers can create facility albums` - SuperUsers can create facility albums
- `Facility Admins can create facility albums` - Facility Admins can create albums for their facility

**UPDATE (Modify) Policies:**
- `SuperUsers can update facility albums` - SuperUsers can update all facility albums
- `Facility Admins can update facility albums` - Facility Admins can update their facility's albums

**DELETE (Remove) Policies:**
- `SuperUsers can delete facility albums` - SuperUsers can delete all facility albums
- `Facility Admins can delete facility albums` - Facility Admins can delete their facility's albums

#### Album Photos Table

**SELECT (View) Policies:**
- `SuperUsers can view facility photos` - SuperUsers can view all facility photos
- `Facility Admins can view facility photos` - Facility Admins can view their facility's photos
- `Tenant members can view public facility photos` - Tenant members can view public photos

**INSERT (Upload) Policies:**
- `SuperUsers can upload facility photos` - SuperUsers can upload photos to any facility album
- `Facility Admins can upload facility photos` - Facility Admins can upload photos to their facility's albums

**UPDATE (Modify) Policies:**
- `SuperUsers can update facility photos` - SuperUsers can update all facility photos
- `Facility Admins can update facility photos` - Facility Admins can update their facility's photos

**DELETE (Remove) Policies:**
- `SuperUsers can delete facility photos` - SuperUsers can delete all facility photos
- `Facility Admins can delete facility photos` - Facility Admins can delete their facility's photos

## Policy Logic

### SuperUser Policies

```sql
CREATE POLICY "SuperUsers can create facility albums" ON photo_albums
  FOR INSERT WITH CHECK (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );
```

**Logic:**
1. Check that `user_id IS NULL` (facility album, not personal)
2. Verify the current user is in the `superusers` table

### Facility Admin Policies

```sql
CREATE POLICY "Facility Admins can create facility albums" ON photo_albums
  FOR INSERT WITH CHECK (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = photo_albums.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );
```

**Logic:**
1. Check that `user_id IS NULL` (facility album)
2. Check that `tenant_id IS NOT NULL` (album belongs to a facility)
3. Verify the current user is a member of the facility
4. Verify the user has OWNER or ADMIN role for that facility

### Tenant Member Policies (View Only)

```sql
CREATE POLICY "Tenant members can view public facility albums" ON photo_albums
  FOR SELECT USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND is_public = true
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = photo_albums.tenant_id
    )
  );
```

**Logic:**
1. Check that `user_id IS NULL` (facility album)
2. Check that `tenant_id IS NOT NULL` (album belongs to a facility)
3. Check that `is_public = true` (album is marked as public)
4. Verify the current user is a member of the facility (any role)

## Files Modified

- ✅ `supabase/migrations/20251007000001_facility_albums_rls.sql` - New migration file
- ✅ Applied to dev Supabase project (ID: ohlscdojhsifvnnkoiqi)

## Testing Checklist

- [ ] SuperUser can create facility albums
- [ ] SuperUser can view all facility albums
- [ ] SuperUser can upload photos to facility albums
- [ ] SuperUser can update facility albums
- [ ] SuperUser can delete facility albums
- [ ] Facility Admin can create albums for their facility
- [ ] Facility Admin can view their facility's albums
- [ ] Facility Admin can upload photos to their facility's albums
- [ ] Facility Admin can update their facility's albums
- [ ] Facility Admin can delete their facility's albums
- [ ] Facility Admin CANNOT create albums for other facilities
- [ ] Facility Admin CANNOT view other facilities' private albums
- [ ] Tenant members can view public facility albums
- [ ] Tenant members CANNOT view private facility albums
- [ ] Tenant members CANNOT create/update/delete facility albums
- [ ] Regular users CANNOT access facility albums from other facilities

## Expected Behavior After Fix

1. **Create Album**: SuperUsers and Facility Admins can successfully create facility albums
2. **Upload Photos**: SuperUsers and Facility Admins can upload photos to facility albums
3. **View Albums**: 
   - SuperUsers see all facility albums
   - Facility Admins see their facility's albums
   - Tenant members see public albums from their facility
4. **Edit/Delete**: SuperUsers and Facility Admins can modify and delete facility albums
5. **No Errors**: No RLS policy violations when performing authorized operations

## Security Considerations

✅ **Isolation**: Facility Admins can only manage albums for their own facility  
✅ **Role-Based**: Permissions are based on user roles (SuperUser, OWNER, ADMIN)  
✅ **Public/Private**: Public albums are visible to all tenant members, private albums only to admins  
✅ **Null Safety**: All policies explicitly check for `user_id IS NULL` to target facility albums  
✅ **Tenant Scoping**: All policies verify tenant membership before granting access  

## Related Components

- `src/components/admin/FacilityPhotoAlbums.tsx` - UI for managing facility albums
- `src/lib/services/albums.ts` - Album service functions
- `supabase/migrations/20251005000001_allow_facility_albums.sql` - Made user_id nullable
- `supabase/migrations/20251006000001_add_cover_photo_support.sql` - Cover photo functionality

## Notes

- Personal user albums (where `user_id IS NOT NULL`) continue to work with existing policies
- Facility albums (where `user_id IS NULL`) now have their own dedicated policies
- The policies are additive - they don't replace existing user album policies
- All policies use `EXISTS` subqueries for efficient permission checks
- Policies are applied to both `photo_albums` and `album_photos` tables for consistency

## Prevention

To prevent similar RLS issues in the future:

1. **Test with different user roles**: Always test new features as SuperUser, Facility Admin, and regular user
2. **Check RLS policies early**: When adding new tables or nullable columns, review RLS policies immediately
3. **Use explicit NULL checks**: When a column can be NULL, explicitly handle both NULL and NOT NULL cases
4. **Document permission model**: Clearly document which roles can perform which operations
5. **Test in dev first**: Always apply and test RLS changes in dev before production

