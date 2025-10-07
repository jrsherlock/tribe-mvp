# Group KPI Card Implementation

## Overview
Replaced the "Journey Status" KPI card on the My Profile page with a new Group KPI card that displays the user's group information.

## Changes Made

### 1. Created New Hook: `useUserGroup.ts`
**File**: `src/hooks/useUserGroup.ts`

A custom React hook that fetches the user's primary group membership from Supabase.

**Features**:
- Fetches user's group memberships with full group details
- Returns the first group the user belongs to
- Handles solo mode users (users not assigned to any group)
- Provides loading and error states
- Includes a `refetch` function for manual updates

**Return Type**:
```typescript
{
  group: UserGroup | null,      // Group data or null if solo mode
  isLoading: boolean,            // Loading state
  error: string | null,          // Error message if any
  refetch: () => Promise<void>   // Function to manually refetch
}
```

**Database Query**:
- Queries `group_memberships` table joined with `groups` table
- Filters by current user's ID
- Returns single result (first group)
- Handles PGRST116 error code (no rows found) gracefully for solo users

### 2. Updated UserProfile Component
**File**: `src/components/UserProfile.tsx`

**Import Changes**:
- Added `useUserGroup` hook import
- Replaced `TrendingUp` icon with `Users` icon from lucide-react

**Hook Integration**:
```typescript
const { group: userGroup, isLoading: groupLoading } = useUserGroup()
```

**Loading State Update**:
- Updated loading condition to include `groupLoading`
- Ensures all data is loaded before rendering the profile

**KPI Card Replacement**:
Replaced the third KPI card (previously "Journey Status") with a new Group KPI card:

**For Users in a Group**:
- Icon: Users icon in primary-600 background
- Title: Group name (e.g., "Default Group", "Recovery Warriors")
- Subtitle: "My Group"

**For Solo Mode Users**:
- Icon: Users icon in primary-600 background
- Title: "No Group"
- Subtitle: "Solo mode"

## Visual Design

The new Group KPI card maintains consistency with other KPI cards on the profile:
- Same rounded-3xl styling
- Same shadow and border treatment
- Same animation (fade in with 0.5s delay)
- Same icon container styling (16x16 with rounded-2xl)
- Responsive text sizing

## Multi-Tenant Architecture Support

The implementation respects the multi-tenant architecture:
- Users can belong to at most one tenant
- Users can be in multiple groups within their tenant
- Solo users (no tenant assignment) are properly handled
- The hook uses RLS policies to ensure users only see their own group memberships

## Edge Cases Handled

1. **Solo Mode Users**: Users not assigned to any group see "No Group" / "Solo mode"
2. **Loading States**: All data loading is coordinated before rendering
3. **Error Handling**: Database errors are caught and logged
4. **No Rows Found**: PGRST116 error (no group membership) is treated as valid solo mode state
5. **Multiple Groups**: If user is in multiple groups, displays the first one

## Database Schema Reference

**Tables Used**:
- `group_memberships`: Links users to groups
  - `user_id`: UUID reference to auth.users
  - `group_id`: UUID reference to groups
  - `role`: 'ADMIN' | 'MEMBER'

- `groups`: Group information
  - `id`: UUID primary key
  - `tenant_id`: UUID reference to tenants
  - `name`: Text (group name)
  - `description`: Text (optional)

## Future Enhancements

Potential improvements for future iterations:

1. **Group Profile Picture**: Add support for group avatars/profile pictures
2. **Group Details Link**: Make the card clickable to navigate to group details page
3. **Multiple Groups Display**: Show all groups if user belongs to multiple
4. **Group Stats**: Display member count, activity stats, etc.
5. **Group Role Badge**: Show if user is ADMIN or MEMBER of the group
6. **Join Group CTA**: For solo users, add a button to browse and join groups

## Testing Recommendations

1. **Test with Group Member**: Verify group name displays correctly
2. **Test with Solo User**: Verify "No Group" / "Solo mode" displays
3. **Test Loading States**: Verify smooth loading experience
4. **Test Multiple Groups**: Verify first group is displayed
5. **Test Error States**: Verify graceful error handling

## Related Files

- `src/hooks/useUserGroup.ts` - New hook for fetching user group data
- `src/components/UserProfile.tsx` - Updated profile component
- `src/lib/services/groups.ts` - Existing group service functions
- `supabase-schema.sql` - Database schema for groups and memberships

## Migration Notes

No database migrations required. This change only affects the frontend presentation layer.

## Rollback Plan

If issues arise, the changes can be easily reverted:
1. Remove the `useUserGroup` hook import
2. Remove the `groupLoading` from loading condition
3. Replace the Group KPI card with the original Journey Status card
4. Delete `src/hooks/useUserGroup.ts`

