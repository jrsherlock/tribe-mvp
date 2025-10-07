# Role System Quick Reference Guide

**Last Updated**: January 7, 2025

---

## Role Hierarchy

```
SuperUser (Platform Admin)
  ↓
Facility Admin (OWNER/ADMIN in tenant_members)
  ↓
Group Admin (ADMIN in group_memberships)
  ↓
Facility Member (MEMBER in tenant_members + group_memberships)
  ↓
Solo User (no tenant_id, no group membership)
```

---

## Database Tables

### `superusers`
- **Purpose**: Platform administrators
- **Columns**: `user_id`
- **Who**: You (Jim Sherlock) and other platform admins

### `tenant_members` (Facility Memberships)
- **Purpose**: Links users to facilities with roles
- **Columns**: `user_id`, `tenant_id`, `role`
- **Roles**: `OWNER`, `ADMIN`, `MEMBER`
- **Constraint**: User can belong to ONE facility only (enforced by app logic, not DB)

### `group_memberships` (Group Memberships)
- **Purpose**: Links users to groups with roles
- **Columns**: `user_id`, `group_id`, `role`
- **Roles**: `ADMIN`, `MEMBER`
- **Constraint**: User can belong to ONE group only (enforced by unique constraint after migration)

### `user_profiles`
- **Purpose**: User profile data
- **Key Field**: `tenant_id` - NULL for solo users, UUID for facility users
- **Constraint**: ONE profile per user (enforced by unique constraint after migration)

---

## Role Permissions

### SuperUser
**Can Do**:
- ✅ Create facilities
- ✅ Manage ALL facilities and groups
- ✅ Promote users to Facility Admin
- ✅ Access all platform features
- ✅ View all data across all tenants

**Cannot Do**:
- Nothing - SuperUsers have full access

**How to Check**:
```typescript
const { isSuperUser } = useUserRole()
```

---

### Facility Admin (OWNER or ADMIN)
**Can Do**:
- ✅ Edit Facility Profile (name, cover, description, contact info)
- ✅ Create/delete Groups within facility
- ✅ Invite users to facility
- ✅ Promote users to Group Admin
- ✅ View all facility data (all groups, all check-ins)
- ✅ Create facility-level events and albums

**Cannot Do**:
- ❌ Create new facilities (only SuperUsers)
- ❌ Access other facilities' data
- ❌ Promote users to Facility Admin (only SuperUsers)

**How to Check**:
```typescript
const { isFacilityAdmin, isOwner, isAdmin } = useUserRole(currentTenantId)
```

**Difference between OWNER and ADMIN**:
- `OWNER`: Typically the facility creator, highest facility role
- `ADMIN`: Promoted by OWNER or SuperUser, same permissions as OWNER

---

### Group Admin
**Can Do**:
- ✅ Edit Group Profile (name, cover, description)
- ✅ Manage group members (invite, remove, change roles)
- ✅ Create/delete group events
- ✅ Create/delete group photo albums
- ✅ Moderate group content (delete inappropriate photos/comments)
- ✅ View all group data

**Cannot Do**:
- ❌ Edit Facility Profile (only Facility Admins)
- ❌ Create new groups (only Facility Admins)
- ❌ Access other groups' data
- ❌ Promote users to Facility Admin

**How to Check**:
```typescript
const { isGroupAdmin } = useGroupRole(groupId)
// OR
const { isAdmin } = useGroupMemberRole(groupId)
```

---

### Facility Member
**Can Do**:
- ✅ View Facility Profile (read-only)
- ✅ View Group Profile (read-only)
- ✅ Create daily check-ins
- ✅ Share check-ins with group
- ✅ Create goals and streaks
- ✅ Upload photos to group albums
- ✅ Comment on and react to check-ins
- ✅ RSVP to events
- ✅ View Tribe Feed (group check-ins)
- ✅ View Analytics

**Cannot Do**:
- ❌ Edit Facility or Group Profiles
- ❌ Create groups or events
- ❌ Manage members
- ❌ Delete others' content

**How to Check**:
```typescript
const { isMember } = useUserRole(currentTenantId)
const { isMember: isGroupMember } = useGroupRole(groupId)
```

---

### Solo User
**Can Do**:
- ✅ Create daily check-ins (private only)
- ✅ Create goals and streaks
- ✅ View own data and progress

**Cannot Do**:
- ❌ View Facility or Group Profiles
- ❌ Share check-ins with groups
- ❌ Upload photos to albums
- ❌ View Tribe Feed
- ❌ View Analytics
- ❌ RSVP to events
- ❌ See other users' check-ins

**How to Check**:
```typescript
const { currentTenantId } = useTenant()
const isSolo = !currentTenantId

// OR
const { isBasicUser } = useUserRole()
```

---

## Helper Functions (Database)

### `get_user_tenant_role(p_tenant_id UUID)`
**Returns**: `'SUPERUSER'`, `'OWNER'`, `'ADMIN'`, `'MEMBER'`, or `'BASIC_USER'`  
**Purpose**: Get user's role in a specific facility

### `get_user_group_role(p_group_id UUID)`
**Returns**: `'SUPERUSER'`, `'FACILITY_ADMIN'`, `'ADMIN'`, `'MEMBER'`, or `NULL`  
**Purpose**: Get user's role in a specific group

### `is_facility_admin(p_tenant_id UUID)`
**Returns**: `BOOLEAN`  
**Purpose**: Check if user is a Facility Admin (OWNER or ADMIN)

### `is_group_admin(p_group_id UUID)`
**Returns**: `BOOLEAN`  
**Purpose**: Check if user is a Group Admin

### `promote_to_group_admin(p_group_id UUID, p_user_id UUID)`
**Purpose**: Promote user to Group Admin role  
**Who Can Call**: Facility Admins and SuperUsers

### `demote_from_group_admin(p_group_id UUID, p_user_id UUID)`
**Purpose**: Demote user from Group Admin to Member  
**Who Can Call**: Facility Admins and SuperUsers

---

## React Hooks

### `useUserRole(tenantId?: string | null)`
**Purpose**: Get user's facility-level role  
**Returns**:
```typescript
{
  role: 'SUPERUSER' | 'OWNER' | 'ADMIN' | 'MEMBER' | 'BASIC_USER' | null
  loading: boolean
  error: Error | null
  isSuperUser: boolean
  isFacilityAdmin: boolean  // OWNER or ADMIN
  isOwner: boolean
  isAdmin: boolean
  isMember: boolean
  isBasicUser: boolean
  canCreateGroups: boolean
  canInviteUsers: boolean
  canEditFacility: boolean
  canDeleteFacility: boolean
  canCreateFacilities: boolean  // SuperUser only
}
```

### `useGroupRole(groupId?: string | null)`
**Purpose**: Get user's group-level role  
**Returns**:
```typescript
{
  groupRole: 'SUPERUSER' | 'FACILITY_ADMIN' | 'ADMIN' | 'MEMBER' | null
  loading: boolean
  error: Error | null
  isSuperUser: boolean
  isFacilityAdmin: boolean
  isGroupAdmin: boolean
  isGroupMember: boolean
  hasGroupMembership: boolean
  canManageMembers: boolean
  canUpdateGroup: boolean
  canCreateEvents: boolean
  canDeleteEvents: boolean
}
```

### `useGroupMemberRole(groupId?: string | null)`
**Purpose**: Simpler group role check (admin vs member)  
**Returns**:
```typescript
{
  role: 'admin' | 'member' | null
  loading: boolean
  error: Error | null
  isAdmin: boolean
  isMember: boolean
  canManageMembers: boolean
  canUpdateGroup: boolean
  canCreateEvents: boolean
  canDeleteEvents: boolean
  canCreateAlbums: boolean
  canUploadPhotos: boolean
}
```

---

## Common Patterns

### Show/Hide Admin Buttons

```typescript
const { isFacilityAdmin } = useUserRole(currentTenantId)

{isFacilityAdmin && (
  <Button onClick={editFacility}>Edit Facility</Button>
)}
```

### Restrict Solo Users

```typescript
const { currentTenantId } = useTenant()
const isSolo = !currentTenantId

if (isSolo) {
  return (
    <div>
      <p>This feature is only available to facility members.</p>
      <Button onClick={joinFacility}>Join a Facility</Button>
    </div>
  )
}
```

### Check Multiple Roles

```typescript
const { isSuperUser } = useUserRole()
const { isGroupAdmin } = useGroupRole(groupId)

const canManageGroup = isSuperUser || isGroupAdmin
```

---

## Role Assignment Flow

### New User Signs Up
1. User creates account → `auth.users` entry created
2. Profile created → `user_profiles` with `tenant_id: NULL` (solo user)
3. User is now a **Solo User**

### User Joins Facility
1. Facility Admin invites user (sends email)
2. User accepts invite
3. `tenant_members` entry created with `role: MEMBER`
4. `user_profiles.tenant_id` updated to facility ID
5. User is now a **Facility Member**

### User Joins Group
1. Facility Admin or Group Admin invites user to group
2. `group_memberships` entry created with `role: MEMBER`
3. User is now a **Facility Member** in a specific group

### User Promoted to Group Admin
1. Facility Admin calls `promote_to_group_admin(groupId, userId)`
2. `group_memberships.role` updated to `ADMIN`
3. User is now a **Group Admin**

### User Promoted to Facility Admin
1. SuperUser updates `tenant_members.role` to `ADMIN` or `OWNER`
2. User is now a **Facility Admin**

---

## Troubleshooting

### User shows as "Anonymous"
**Cause**: Profile lookup failing  
**Fix**: Ensure `listProfilesByUserIds` is called without tenant filtering

### User can't see facility features
**Cause**: User is solo (no `tenant_id`)  
**Fix**: User needs to join a facility

### Admin buttons not showing
**Cause**: Role hooks not being used  
**Fix**: Add `useUserRole` or `useGroupRole` to component

### User in wrong group
**Cause**: User was added to multiple groups (before constraint)  
**Fix**: Remove user from incorrect group, keep only one membership

---

## Summary

- **5 roles**: SuperUser, Facility Admin, Group Admin, Facility Member, Solo User
- **3 tables**: `superusers`, `tenant_members`, `group_memberships`
- **3 hooks**: `useUserRole`, `useGroupRole`, `useGroupMemberRole`
- **6 helper functions**: Role checking and management in database
- **1 profile per user**: Enforced by unique constraint (after migration)
- **1 group per user**: Enforced by unique constraint (after migration)

**Key Principle**: Roles are hierarchical - higher roles inherit lower role permissions.

