# Platform Refactoring Plan: Clear SaaS Hierarchy
## The Tribe - Addiction Recovery Platform

**Date**: January 7, 2025  
**Status**: 🚧 PLANNING PHASE  
**Priority**: CRITICAL - Foundation for scalable SaaS model

---

## Executive Summary

The current implementation has a solid database foundation but suffers from:
1. **Confusing terminology** - "Tenants" vs "Facilities" 
2. **Inconsistent role enforcement** - Roles exist in DB but UI doesn't respect them
3. **Profile duplication** - Users have multiple profiles (solo + facility)
4. **Missing Facility-level features** - No Facility Profile page, events, or albums
5. **Unclear user-to-group relationship** - Users can belong to multiple groups (should be one)

**Goal**: Create a crystal-clear, scalable SaaS hierarchy that matches your business model.

---

## Current State Analysis

### ✅ What's Working (Database Layer)

1. **Tables exist**:
   - `tenants` (this IS your Facilities table)
   - `tenant_members` (Facility memberships with roles: ADMIN, MEMBER)
   - `groups` (scoped to tenants via `tenant_id`)
   - `group_memberships` (currently only has MEMBER role)
   - `user_profiles` (has `tenant_id` field)
   - `superusers` (platform admins)

2. **RBAC helper functions exist**:
   - `get_user_tenant_role()` - Returns user's role in a facility
   - `get_user_group_role()` - Returns user's role in a group
   - `is_facility_admin()` - Checks if user is facility admin
   - `is_group_admin()` - Checks if user is group admin

3. **Hooks exist**:
   - `useUserRole(tenantId)` - Gets facility-level role
   - `useGroupRole(groupId)` - Gets group-level role
   - `useGroupMemberRole(groupId)` - Simpler group role check

### ❌ What's Broken

1. **Terminology confusion**:
   - Database says "tenant" but you want "facility"
   - Code mixes both terms inconsistently

2. **Profile duplication**:
   - Users have MULTIPLE `user_profiles` rows (one per tenant + one for solo)
   - This causes the "Anonymous" bug we just debugged
   - Should be: ONE profile per user, with `tenant_id` indicating their facility

3. **Missing Facility features**:
   - No Facility Profile page (like Group Profile)
   - No Facility-level events
   - No Facility-level photo albums
   - Facility admins can't manage facility details

4. **Group membership**:
   - Users can belong to MULTIPLE groups (no constraint)
   - Should be: ONE group per user (or zero for solo users)

5. **Group roles incomplete**:
   - `group_memberships.role` only has 'MEMBER'
   - Should have: 'ADMIN' and 'MEMBER'

6. **Solo user mode unclear**:
   - No clear distinction between solo users and facility users
   - Solo users can see facility features they shouldn't access

---

## Desired SaaS Hierarchy

```
Platform (SuperUsers manage)
  │
  ├─ Facility 1 (Facility Admins manage)
  │   ├─ Facility Profile (name, cover, description, events, albums)
  │   ├─ Group A (Group Admins manage)
  │   │   ├─ Group Profile (name, cover, description, events, albums)
  │   │   ├─ User 1 (Member)
  │   │   └─ User 2 (Member)
  │   └─ Group B
  │       └─ User 3 (Member)
  │
  ├─ Facility 2
  │   └─ Group C
  │       └─ User 4 (Member)
  │
  └─ Solo Users (no facility, no groups)
      ├─ User 5 (can do: goals, streaks, check-ins)
      └─ User 6 (cannot do: albums, tribe feed, analytics)
```

### Role Hierarchy

1. **SuperUser** (Platform Admin)
   - Can create Facilities
   - Can manage ALL facilities and groups
   - Can promote users to Facility Admin

2. **Facility Admin** (ADMIN role in `tenant_members`)
   - Can manage Facility Profile
   - Can create/delete Groups
   - Can invite users to Facility
   - Can promote users to Group Admin
   - Can view all facility data

3. **Group Admin** (ADMIN role in `group_memberships`)
   - Can manage Group Profile
   - Can manage group members
   - Can create group events and albums
   - Can view all group data

4. **Facility Member** (MEMBER role in `tenant_members`)
   - Can view Facility Profile (read-only)
   - Can view Group Profile (read-only)
   - Can participate in group activities
   - Can create check-ins, goals, streaks

5. **Solo User** (no `tenant_id`, no group membership)
   - Can create check-ins, goals, streaks
   - CANNOT access: Facility/Group profiles, albums, tribe feed, analytics

---

## Refactoring Strategy

### Phase 1: Database Schema Fixes (CRITICAL)

**Goal**: Enforce one-to-one relationships and clean up profile duplication

#### 1.1 Fix User Profiles (ONE profile per user)

**Problem**: Users have multiple `user_profiles` rows
**Solution**: Consolidate to ONE profile per user

```sql
-- Step 1: Identify users with multiple profiles
SELECT user_id, COUNT(*) as profile_count 
FROM user_profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Step 2: For each user, keep the facility profile (if exists), delete solo profile
-- Step 3: Add UNIQUE constraint on user_id
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Step 4: Update user_profiles to have tenant_id = NULL for solo users
-- This becomes the SINGLE source of truth for "is this user solo or facility?"
```

#### 1.2 Enforce One Group Per User

**Problem**: No constraint preventing users from joining multiple groups
**Solution**: Add unique constraint

```sql
-- Add unique constraint: one user can only be in one group
ALTER TABLE group_memberships ADD CONSTRAINT group_memberships_user_id_unique UNIQUE (user_id);
```

#### 1.3 Add Group Admin Role

**Problem**: `group_memberships.role` only has 'MEMBER'
**Solution**: Add 'ADMIN' role

```sql
-- Update group_memberships to support ADMIN role
-- (Already has role column, just need to use it)
```

#### 1.4 Rename "Tenants" to "Facilities" (Optional but Recommended)

**Problem**: Confusing terminology
**Solution**: Rename table and columns for clarity

```sql
-- Option A: Rename table (breaking change)
ALTER TABLE tenants RENAME TO facilities;
ALTER TABLE tenant_members RENAME TO facility_members;
-- Update all foreign keys and references

-- Option B: Keep table names, update UI terminology only
-- (Easier, less risky)
```

### Phase 2: Service Layer Refactoring

**Goal**: Create clear, consistent service functions

#### 2.1 Profile Service (`src/lib/services/profiles.ts`)

```typescript
// REMOVE tenant filtering from listProfilesByUserIds
// Profiles are now 1:1 with users, no need to filter by tenant
export async function listProfilesByUserIds(userIds: string[]) {
  return supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', userIds)
}

// Add helper to check if user is solo
export async function isSoloUser(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', userId)
    .single()
  
  return data?.tenant_id === null
}
```

#### 2.2 Facility Service (`src/lib/services/facilities.ts` - NEW)

```typescript
// Get facility profile
export async function getFacilityProfile(facilityId: string)

// Update facility profile (admin only)
export async function updateFacilityProfile(facilityId: string, updates: FacilityUpdate)

// Get facility members
export async function getFacilityMembers(facilityId: string)

// Invite user to facility
export async function inviteUserToFacility(facilityId: string, email: string, role: 'ADMIN' | 'MEMBER')

// Get facility events
export async function getFacilityEvents(facilityId: string)

// Create facility event (admin only)
export async function createFacilityEvent(facilityId: string, event: EventCreate)

// Get facility albums
export async function getFacilityAlbums(facilityId: string)

// Create facility album (admin only)
export async function createFacilityAlbum(facilityId: string, album: AlbumCreate)
```

#### 2.3 Group Service (`src/lib/services/groups.ts`)

```typescript
// Add group admin role management
export async function promoteToGroupAdmin(groupId: string, userId: string)
export async function demoteFromGroupAdmin(groupId: string, userId: string)
```

### Phase 3: Component Refactoring

**Goal**: Create Facility-level components matching Group-level components

#### 3.1 Create Facility Profile Page

**New file**: `src/components/facility/FacilityPage.tsx`

Similar structure to `TribePage.tsx` but for Facilities:
- **Profile Tab**: View/edit facility details (name, cover, description, contact info)
- **Members Tab**: View all facility members, manage roles (admin only)
- **Groups Tab**: View all groups in facility, create new groups (admin only)
- **Events Tab**: Facility-wide events (admin can create, all can view/RSVP)
- **Albums Tab**: Facility-wide photo albums (admin can create, all can upload)

#### 3.2 Update Navigation

Add "My Facility" link to sidebar (only for facility users, not solo users)

```typescript
// In Layout.tsx or Sidebar component
const { user } = useAuth()
const { currentTenantId } = useTenant()
const isSolo = !currentTenantId

{!isSolo && (
  <NavLink to={`/facility/${currentTenantId}`}>
    <Building2 /> My Facility
  </NavLink>
)}
```

#### 3.3 Restrict Solo User Access

Update components to check if user is solo:

```typescript
// In Dashboard.tsx, SanghaFeed.tsx, PhotoAlbums.tsx, Analytics.tsx
const { currentTenantId } = useTenant()
const isSolo = !currentTenantId

if (isSolo) {
  return <SoloUserMessage feature="Tribe Feed" />
}
```

### Phase 4: Role-Based UI Updates

**Goal**: Show/hide features based on user role

#### 4.1 Facility Admin Features

```typescript
const { isFacilityAdmin } = useUserRole(currentTenantId)

{isFacilityAdmin && (
  <>
    <Button onClick={editFacilityProfile}>Edit Facility</Button>
    <Button onClick={createGroup}>Create Group</Button>
    <Button onClick={inviteUser}>Invite User</Button>
  </>
)}
```

#### 4.2 Group Admin Features

```typescript
const { isGroupAdmin } = useGroupRole(groupId)

{isGroupAdmin && (
  <>
    <Button onClick={editGroupProfile}>Edit Group</Button>
    <Button onClick={manageMembers}>Manage Members</Button>
    <Button onClick={createEvent}>Create Event</Button>
  </>
)}
```

---

## Implementation Checklist

### Phase 1: Database (Week 1)
- [ ] Audit users with multiple profiles
- [ ] Consolidate profiles (keep facility profile, delete solo duplicates)
- [ ] Add UNIQUE constraint on `user_profiles.user_id`
- [ ] Add UNIQUE constraint on `group_memberships.user_id`
- [ ] Test: Verify no duplicate profiles
- [ ] Test: Verify users can only join one group

### Phase 2: Services (Week 1-2)
- [ ] Remove tenant filtering from `listProfilesByUserIds`
- [ ] Create `facilities.ts` service with all facility functions
- [ ] Add group admin role functions to `groups.ts`
- [ ] Test: All service functions work correctly

### Phase 3: Components (Week 2-3)
- [ ] Create `FacilityPage.tsx` with all tabs
- [ ] Create `FacilityProfile.tsx` component
- [ ] Create `FacilityMembers.tsx` component
- [ ] Create `FacilityGroups.tsx` component
- [ ] Create `FacilityEvents.tsx` component
- [ ] Create `FacilityAlbums.tsx` component
- [ ] Add "My Facility" to navigation
- [ ] Restrict solo users from facility features
- [ ] Test: Facility page works for all roles

### Phase 4: Role UI (Week 3-4)
- [ ] Update all components to use role hooks
- [ ] Show/hide admin buttons based on role
- [ ] Add role badges to user profiles
- [ ] Test: Each role sees appropriate UI

### Phase 5: Testing & Polish (Week 4)
- [ ] Test as SuperUser
- [ ] Test as Facility Admin
- [ ] Test as Group Admin
- [ ] Test as Facility Member
- [ ] Test as Solo User
- [ ] Fix bugs and polish UI

---

## Success Criteria

✅ **Clear Hierarchy**
- Users understand: Platform → Facility → Group → User
- Solo users clearly separated from facility users

✅ **One-to-One Relationships**
- Each user has ONE profile
- Each user belongs to ONE facility (or none)
- Each user belongs to ONE group (or none)

✅ **Role-Based Access**
- SuperUsers can create facilities
- Facility Admins can manage facility and create groups
- Group Admins can manage their group
- Members can view but not edit
- Solo users cannot access facility features

✅ **Feature Parity**
- Facilities have same features as Groups (profile, events, albums)
- Clear distinction between facility-level and group-level content

✅ **No More "Anonymous" Bugs**
- Profile lookups work correctly
- No duplicate profiles causing confusion

---

## Next Steps

**DECISION REQUIRED**: Do you want to proceed with this refactoring plan?

If yes, I recommend starting with **Phase 1 (Database)** immediately, as it fixes the root cause of many issues including the "Anonymous" bug.

**Estimated Timeline**: 4 weeks for complete refactoring
**Risk Level**: Medium (database changes require careful migration)
**Benefit**: Crystal-clear, scalable SaaS platform that matches your business model

