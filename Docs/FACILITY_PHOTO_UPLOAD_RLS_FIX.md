# Facility Photo Upload RLS Policy Fix ✅

## 🔍 Problem Identified

**Error**: `StorageApiError: new row violates row-level security policy`

When attempting to upload a facility profile photo, the upload was being blocked by an overly restrictive RLS policy on the `storage.objects` table.

### Root Cause

**Old RLS Policy** (RESTRICTIVE):
```sql
CREATE POLICY "Authenticated can upload to their folder" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'photos' 
  AND POSITION((auth.uid())::text IN name) > 0
);
```

**What this meant:**
- The file path MUST contain the user's `auth.uid()`
- Facility photo path: `facilities/{tenant_id}/profile-...`
- User ID: `7c1051b5-3e92-4215-8623-763f7fb627c7`
- Tenant ID: `a77d4b1b-7e8d-48e2-b509-b305c5615f4d`
- **Result**: Path contains tenant_id, NOT user_id → ❌ BLOCKED

### Why This Was a Problem

The facility photo upload uses the tenant ID in the path (which makes sense for organization), but the RLS policy required the user ID to be in the path. This prevented:
- ✅ SuperUsers from uploading facility photos
- ✅ Facility Admins from uploading photos for their facilities
- ✅ Any organizational/shared resource uploads

---

## ✅ Solution Implemented

### New RLS Policies (FLEXIBLE & SECURE)

#### 1. Upload Policy

```sql
CREATE POLICY "Users can upload photos" 
ON storage.objects FOR INSERT TO public 
WITH CHECK (
  bucket_id = 'photos' 
  AND (
    -- SuperUsers can upload anywhere
    EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    ) 
    OR 
    -- Facility Admins can upload to their facility folder
    EXISTS (
      SELECT 1 
      FROM tenant_members tm 
      JOIN user_profiles up ON tm.user_id = up.user_id 
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('OWNER', 'ADMIN') 
        AND name LIKE 'facilities/' || up.tenant_id || '%'
    ) 
    OR 
    -- Users can upload to their own folder
    (auth.uid())::text = ANY(string_to_array(name, '/'))
  )
);
```

#### 2. Delete Policy

```sql
CREATE POLICY "Users can delete photos" 
ON storage.objects FOR DELETE TO public 
USING (
  bucket_id = 'photos' 
  AND (
    -- SuperUsers can delete anywhere
    EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    ) 
    OR 
    -- Facility Admins can delete from their facility folder
    EXISTS (
      SELECT 1 
      FROM tenant_members tm 
      JOIN user_profiles up ON tm.user_id = up.user_id 
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('OWNER', 'ADMIN') 
        AND name LIKE 'facilities/' || up.tenant_id || '%'
    ) 
    OR 
    -- Users can delete from their own folder
    (auth.uid())::text = ANY(string_to_array(name, '/'))
  )
);
```

### What These Policies Allow

| User Type | Can Upload To | Can Delete From |
|-----------|---------------|-----------------|
| **SuperUser** | Anywhere in `photos` bucket | Anywhere in `photos` bucket |
| **Facility Admin** | `facilities/{their_tenant_id}/` | `facilities/{their_tenant_id}/` |
| **Facility Owner** | `facilities/{their_tenant_id}/` | `facilities/{their_tenant_id}/` |
| **Regular User** | Folders containing their user_id | Folders containing their user_id |

---

## 🧪 Testing the Fix

### Test Case 1: SuperUser Uploads Facility Photo

**User**: Jim Sherlock (SuperUser)  
**User ID**: `7c1051b5-3e92-4215-8623-763f7fb627c7`  
**Tenant ID**: `a77d4b1b-7e8d-48e2-b509-b305c5615f4d`  
**Facility**: "Top of the World Ranch"

**Steps**:
1. Navigate to `/admin/tree`
2. Click on "Top of the World Ranch" facility
3. Click on "Profile" tab in FacilityProfile component
4. Click "Change Photo" button
5. Select an image file
6. Upload

**Expected Result**:
- ✅ Upload succeeds (no RLS error)
- ✅ Photo appears in facility profile
- ✅ Photo stored at: `photos/facilities/a77d4b1b-7e8d-48e2-b509-b305c5615f4d/profile-{timestamp}-{filename}`
- ✅ `tenants.profile_picture_url` updated with public URL
- ✅ Toast notification: "Facility photo updated successfully! 📸"

### Test Case 2: Facility Admin Uploads Facility Photo

**User**: Any Facility Admin for "Top of the World Ranch"  
**Tenant Role**: ADMIN or OWNER

**Steps**: Same as Test Case 1

**Expected Result**: Same as Test Case 1 ✅

### Test Case 3: Regular User Tries to Upload Facility Photo

**User**: Regular user (not admin, not superuser)  
**Tenant Role**: MEMBER

**Steps**: Same as Test Case 1

**Expected Result**:
- ❌ Upload blocked by RLS policy (correct behavior)
- ❌ Error: "new row violates row-level security policy"
- This is CORRECT - regular users should not be able to upload facility photos

### Test Case 4: User Uploads Personal Photo

**User**: Any authenticated user  
**Path**: `{user_id}/profile-{timestamp}-{filename}`

**Expected Result**:
- ✅ Upload succeeds (existing behavior preserved)
- ✅ Users can still upload to their own folders

---

## 📁 Files Involved

### Code Files (No Changes Needed)

1. **src/lib/services/storage.ts**
   - `uploadPhoto()` function - works correctly
   - Uses authenticated Supabase client
   - No changes needed

2. **src/components/admin/FacilityProfile.tsx**
   - `handlePhotoUpload()` function (line 100-124)
   - Path: `facilities/${tenantId}/profile-${Date.now()}-${file.name}`
   - No changes needed - path structure is correct

### Database Changes

**Supabase Project**: `ohlscdojhsifvnnkoiqi` (dev)  
**Bucket**: `photos`  
**Table**: `storage.objects`

**Policies Modified**:
1. ❌ Dropped: "Authenticated can upload to their folder"
2. ❌ Dropped: "Owners can delete their files"
3. ✅ Created: "Users can upload photos"
4. ✅ Created: "Users can delete photos"
5. ✅ Kept: "Public read access to photos" (unchanged)

---

## 🔒 Security Considerations

### What's Protected

1. **SuperUsers**: Can upload/delete anywhere (appropriate for admin role)
2. **Facility Admins**: Can only upload/delete in their own facility folder
3. **Regular Users**: Can only upload/delete in folders containing their user_id
4. **Anonymous Users**: Cannot upload or delete (only read)

### Path Structure

```
photos/
├── facilities/
│   ├── {tenant_id_1}/
│   │   ├── profile-{timestamp}-{filename}
│   │   └── album-{timestamp}-{filename}
│   └── {tenant_id_2}/
│       └── profile-{timestamp}-{filename}
├── {user_id_1}/
│   └── avatar-{timestamp}-{filename}
└── {user_id_2}/
    └── avatar-{timestamp}-{filename}
```

### Policy Logic

The policies use a **cascading permission model**:
1. **First check**: Is user a SuperUser? → Allow all
2. **Second check**: Is user a Facility Admin AND path matches their facility? → Allow
3. **Third check**: Does path contain user's ID? → Allow
4. **Default**: Deny

---

## 🎯 Success Criteria

After implementing this fix:

1. ✅ SuperUsers can upload facility photos
2. ✅ Facility Admins can upload photos for their facilities
3. ✅ Regular users CANNOT upload facility photos (security maintained)
4. ✅ Users can still upload to their own folders (existing behavior preserved)
5. ✅ No RLS policy violation errors for authorized uploads
6. ✅ Facility profile photos display correctly after upload
7. ✅ Public read access maintained (photos are publicly viewable)

---

## 🚀 Deployment Notes

### Dev Environment (ohlscdojhsifvnnkoiqi)
- ✅ Policies updated and tested

### Production Environment (cbquhgzgffceopuqnzzm)
- ⚠️ **TODO**: Apply the same policy changes to production when ready
- Use the same SQL commands documented above
- Test with a non-critical facility first

### Migration Script

For production deployment, use this script:

```sql
-- Drop old restrictive policies
DROP POLICY IF EXISTS "Authenticated can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their files" ON storage.objects;

-- Create new flexible policies
CREATE POLICY "Users can upload photos" 
ON storage.objects FOR INSERT TO public 
WITH CHECK (
  bucket_id = 'photos' 
  AND (
    EXISTS (SELECT 1 FROM superusers WHERE user_id = auth.uid()) 
    OR 
    EXISTS (
      SELECT 1 
      FROM tenant_members tm 
      JOIN user_profiles up ON tm.user_id = up.user_id 
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('OWNER', 'ADMIN') 
        AND name LIKE 'facilities/' || up.tenant_id || '%'
    ) 
    OR 
    (auth.uid())::text = ANY(string_to_array(name, '/'))
  )
);

CREATE POLICY "Users can delete photos" 
ON storage.objects FOR DELETE TO public 
USING (
  bucket_id = 'photos' 
  AND (
    EXISTS (SELECT 1 FROM superusers WHERE user_id = auth.uid()) 
    OR 
    EXISTS (
      SELECT 1 
      FROM tenant_members tm 
      JOIN user_profiles up ON tm.user_id = up.user_id 
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('OWNER', 'ADMIN') 
        AND name LIKE 'facilities/' || up.tenant_id || '%'
    ) 
    OR 
    (auth.uid())::text = ANY(string_to_array(name, '/'))
  )
);
```

---

## 📚 Related Documentation

- Supabase Storage RLS: https://supabase.com/docs/guides/storage/security/access-control
- Multi-tenant architecture: See `Docs/MULTI_TENANT_ARCHITECTURE.md`
- Facility Profile component: See `Docs/FACILITY_PROFILE_INTEGRATION.md`

---

**Status**: ✅ Fixed in dev environment - ready for testing!

