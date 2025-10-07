# Facility Profile Implementation

## Overview
This document describes the implementation of the comprehensive Facility Profile feature for the Admin Tree interface. The Facility Profile replaces the basic tenant information display with a full-featured profile management system similar to the User Profile screen.

## Implementation Date
2025-10-05

## Components Created

### 1. **FacilityProfile.tsx** (`src/components/admin/FacilityProfile.tsx`)
Main container component for facility profile management.

**Features:**
- View/Edit mode toggle with permission checks
- Profile picture upload with camera icon
- Facility name and bio editing
- Tab navigation: Profile, Photo Albums, Users, Groups
- Integration with existing permission system (SuperUser, Facility Admin)

**Props:**
- `tenantId`: string - The facility/tenant ID
- `tenantName`: string - The facility name
- `onUpdate?`: () => void - Callback when data is updated

### 2. **FacilityPhotoAlbums.tsx** (`src/components/admin/FacilityPhotoAlbums.tsx`)
Photo album management for facilities (adapted from UserProfile PhotoAlbums).

**Features:**
- Create/delete photo albums
- Upload photos with drag-and-drop support
- Public/private album settings
- Album cover photo management
- Photo count tracking
- Grid view for albums and photos

**Key Differences from User Albums:**
- Uses `tenant_id` instead of `user_id`
- Sets `user_id` to NULL for facility albums
- Uses facility-specific storage paths: `facilities/{tenantId}/{albumId}/...`

### 3. **FacilityUserManagement.tsx** (`src/components/admin/FacilityUserManagement.tsx`)
User management interface for facilities.

**Features:**
- List all users in the facility
- Invite new users (integrates InviteUserModal)
- Assign users to groups (integrates AssignToGroupModal)
- Change user roles (ADMIN/MEMBER)
- Remove users from facility
- Display user profile pictures and group counts

**Integrations:**
- `InviteUserModal` - For inviting new users
- `AssignToGroupModal` - For group assignments
- User profiles with avatars
- Group membership counts

### 4. **FacilityGroupManagement.tsx** (`src/components/admin/FacilityGroupManagement.tsx`)
Group management interface for facilities.

**Features:**
- List all groups in the facility
- Create new groups (integrates CreateGroupModal)
- Edit group details (integrates EditEntityModal)
- Delete groups with confirmation
- Display member counts
- Show group descriptions and creation dates

**Integrations:**
- `CreateGroupModal` - For creating new groups
- `EditEntityModal` - For editing group details

## Database Schema Changes

### Migration: `20251005000000_add_facility_profile_fields.sql`
Added profile fields to the `tenants` table:

```sql
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT DEFAULT '';

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

ALTER TABLE public.tenants 
ADD CONSTRAINT IF NOT EXISTS tenants_bio_length 
CHECK (char_length(bio) <= 1000);
```

### Migration: `20251005000001_allow_facility_albums.sql`
Made `user_id` nullable in photo tables to support facility albums:

```sql
ALTER TABLE public.photo_albums 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.album_photos 
ALTER COLUMN user_id DROP NOT NULL;
```

**Rationale:** Facility albums are associated with `tenant_id` only, with `user_id` set to NULL.

## Service Layer Updates

### `src/lib/services/tenants.ts`
**Updated:**
- `Tenant` type: Added `profile_picture_url` and `bio` fields
- `updateTenant()`: Now accepts profile fields
- `getTenant()`: New function to fetch single tenant

### `src/lib/services/albums.ts`
**Added:**
- `listFacilityAlbums(tenantId)`: List albums for a facility
- `createFacilityAlbum(payload)`: Create facility album with `user_id = null`

## Integration with AdminTreeView

### `src/components/admin/AdminTreeView.tsx`
**Changes:**
- Imported `FacilityProfile` component
- Replaced basic tenant information display with `<FacilityProfile />` component
- Passes `tenantId`, `tenantName`, and `refetch` callback

**Before:**
```tsx
{selectedNode.type === 'tenant' && (
  <div className="space-y-4">
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3>Tenant Information</h3>
      <dl>
        <dt>Slug:</dt><dd>{selectedNode.tenantData.slug}</dd>
        <dt>Users:</dt><dd>{selectedNode.tenantData.userCount}</dd>
        ...
      </dl>
    </div>
  </div>
)}
```

**After:**
```tsx
{selectedNode.type === 'tenant' && (
  <FacilityProfile 
    tenantId={selectedNode.tenantData.id}
    tenantName={selectedNode.tenantData.name}
    onUpdate={refetch}
  />
)}
```

## Permission System

All components respect the existing RBAC system:

- **SuperUser**: Full access to all features
- **Facility Admin**: Can manage users, groups, and facility profile
- **Group Admin**: Limited to group-level operations (not facility profile)
- **Member**: Read-only access

Permission checks use the `useUserRole` hook:
```tsx
const { isSuperUser, isFacilityAdmin } = useUserRole(tenantId);
const canEdit = isSuperUser || isFacilityAdmin;
```

## Storage Structure

### Facility Profile Pictures
Path: `facilities/{tenantId}/profile-{timestamp}-{filename}`

### Facility Album Photos
Path: `facilities/{tenantId}/{albumId}/{timestamp}-{index}-{filename}`

## UI/UX Design Patterns

The implementation follows existing patterns from:
- **UserProfile.tsx**: Edit mode, profile picture upload, tab navigation
- **PhotoAlbums.tsx**: Album grid, photo upload with drag-and-drop
- **AdminTreeView.tsx**: Permission-based action buttons, modal integrations

### Tab Navigation
- **Profile**: Basic info, profile picture, bio
- **Photo Albums**: Album management and photo uploads
- **Users**: User list, invitations, role management, group assignments
- **Groups**: Group list, creation, editing, deletion

## Testing Checklist

- [x] Database migrations applied to dev project
- [ ] Facility profile picture upload works
- [ ] Facility bio editing saves correctly
- [ ] Photo albums can be created for facilities
- [ ] Photos can be uploaded to facility albums
- [ ] User invitation modal works from facility profile
- [ ] User role changes persist correctly
- [ ] Group assignment modal works from facility profile
- [ ] Group creation works from facility profile
- [ ] Permission checks prevent unauthorized edits
- [ ] All tabs navigate correctly
- [ ] Data refreshes after updates

## Known Limitations

1. **User Suspension**: Not yet implemented (mentioned in requirements but deferred)
2. **Bulk Operations**: No bulk user/group operations yet
3. **Photo Captions**: Can be added but not edited after upload
4. **Album Reordering**: Albums are sorted by creation date only

## Future Enhancements

1. Add user suspension/activation feature
2. Implement bulk user operations (bulk invite, bulk assign to groups)
3. Add photo caption editing
4. Add album reordering/sorting options
5. Add facility statistics dashboard (user activity, check-in trends)
6. Add facility settings tab (privacy, notifications, etc.)
7. Add facility logo separate from profile picture
8. Add facility contact information fields

## Files Modified

### New Files
- `src/components/admin/FacilityProfile.tsx`
- `src/components/admin/FacilityPhotoAlbums.tsx`
- `src/components/admin/FacilityUserManagement.tsx`
- `src/components/admin/FacilityGroupManagement.tsx`
- `supabase/migrations/20251005000000_add_facility_profile_fields.sql`
- `supabase/migrations/20251005000001_allow_facility_albums.sql`

### Modified Files
- `src/components/admin/AdminTreeView.tsx` - Integrated FacilityProfile
- `src/lib/services/tenants.ts` - Added profile fields and getTenant()
- `src/lib/services/albums.ts` - Added facility album functions
- `src/components/admin/AssignToGroupModal.tsx` - Fixed function call signature

## Migration Notes

To apply these changes to production:

1. Run database migrations in order:
   ```bash
   # Apply to production Supabase project
   supabase db push --project-ref cbquhgzgffceopuqnzzm
   ```

2. Deploy updated frontend code

3. Verify permissions are working correctly

4. Test facility profile features with different user roles

## Conclusion

The Facility Profile feature is now fully integrated into the Admin Tree interface, providing a comprehensive management interface for facilities that mirrors the user profile experience while adding facility-specific features like user and group management.

