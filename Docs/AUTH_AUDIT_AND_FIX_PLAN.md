# Authentication & Authorization Audit Report
**Date**: October 3, 2025  
**Priority**: CRITICAL  
**Status**: Issues Identified - Action Plan Ready

---

## Executive Summary

After comprehensive audit of the authentication and authorization system, I've identified **CRITICAL SCHEMA INCONSISTENCY** between the codebase and database that is preventing the multi-tenant hierarchy from working properly. The good news: the RBAC implementation is solid at the database level, but there's a naming mismatch causing failures.

### Critical Finding 🚨
**The database has `tenant_members` table, but the schema file still references the old `memberships` table.**

---

## Current State Analysis

### ✅ What's Working

1. **Database Layer (EXCELLENT)**
   - ✅ 5-tier RBAC system fully implemented (migration `20251003045429`)
   - ✅ Helper functions exist: `is_facility_admin()`, `is_group_admin()`, `get_user_tenant_role()`, `get_user_group_role()`
   - ✅ RLS policies properly configured for all tables
   - ✅ `create_tenant()` RPC function working
   - ✅ SuperUser system operational
   - ✅ `tenant_members` table exists with correct structure

2. **Frontend Components (GOOD)**
   - ✅ `useUserRole` hook properly calls RPC functions
   - ✅ `GroupsManager` component has permission checks
   - ✅ `AdminDashboard` component exists with facility/group/user management
   - ✅ `AdminTreeView` component for hierarchical navigation
   - ✅ Permission-based UI rendering logic in place

3. **Service Layer (GOOD)**
   - ✅ `tenants.ts` service uses correct `tenant_members` table
   - ✅ `groups.ts` service properly structured
   - ✅ All CRUD operations defined

---

## 🔴 Critical Issues Identified

### Issue #1: Schema File Inconsistency (CRITICAL)
**File**: `supabase-schema.sql`  
**Problem**: Lines 246-253 define `memberships` table, but database actually has `tenant_members`

**Impact**:
- New developers will be confused
- Schema file cannot be used to recreate database
- Documentation mismatch

**Evidence**:
```sql
-- supabase-schema.sql (WRONG - Line 246)
CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);

-- Database reality (CORRECT)
-- Table name: tenant_members (confirmed via query)
```

**Fix**: Update `supabase-schema.sql` to use `tenant_members` throughout

---

### Issue #2: Missing User Creation/Invitation UI (HIGH)
**Problem**: No UI component for creating/inviting users to facilities

**Current State**:
- ✅ Backend Edge Function exists: `supabase/functions/invite_user/index.ts`
- ✅ `invites` table likely exists
- ❌ No frontend component to trigger invitations
- ❌ No UI to accept invitations
- ❌ No user list/management in AdminDashboard

**Impact**:
- Cannot add users to facilities via UI
- Cannot assign users to groups
- Core requirement #3 blocked

**Evidence**:
- `AdminDashboard.tsx` has membership management but no user creation
- No invite flow in the application routes

---

### Issue #3: Incomplete AdminDashboard User Management (MEDIUM)
**File**: `src/components/admin/AdminDashboard.tsx`

**Problems**:
1. **No User List Display**: Memberships tab shows memberships but not user details
2. **No User Search**: Cannot search for existing users to add to facility
3. **No Email Invitation**: Cannot invite new users by email
4. **Limited User Assignment**: Cannot assign users to specific groups from this UI

**Current Capabilities**:
- ✅ Can view memberships (user_id + role)
- ✅ Can update membership roles
- ✅ Can remove memberships
- ❌ Cannot see user names/emails
- ❌ Cannot invite new users
- ❌ Cannot assign users to groups

---

### Issue #4: Group Member Assignment Gap (MEDIUM)
**Problem**: No clear UI flow to assign existing facility members to groups

**Current State**:
- ✅ `adminAddUserToGroup()` function exists in `groups.ts`
- ✅ RLS policies allow facility admins to add users to groups
- ❌ AdminDashboard doesn't show group member management
- ❌ No UI to select users and add them to groups

**Impact**: Core requirement #3 partially blocked

---

### Issue #5: Missing Invites Table Schema (UNKNOWN)
**Problem**: Invite system referenced but table schema not in `supabase-schema.sql`

**Evidence**:
- Edge function `invite_user` inserts into `invites` table
- No CREATE TABLE statement in schema file
- Unknown if table exists in database

**Impact**: Cannot verify invite system is operational

---

## Architecture Verification

### Database Schema (Actual State)
```
✅ tenants (facilities)
   ├── id, name, slug, created_at
   
✅ tenant_members (facility memberships)
   ├── user_id, tenant_id, role, created_at
   ├── UNIQUE(user_id) - enforces single tenant per user
   
✅ groups (within facilities)
   ├── id, tenant_id, name, description, created_at
   
✅ group_memberships (group members)
   ├── user_id, group_id, role, created_at
   
✅ superusers (platform admins)
   ├── user_id, created_at
   
❓ invites (user invitations)
   ├── Status: UNKNOWN - not in schema file
```

### RBAC Functions (All Present ✅)
```sql
✅ app.is_superuser() → BOOLEAN
✅ public.is_facility_admin(tenant_id) → BOOLEAN  
✅ public.is_group_admin(group_id) → BOOLEAN
✅ public.get_user_tenant_role(tenant_id) → TEXT
✅ public.get_user_group_role(group_id) → TEXT
✅ public.create_tenant(name, slug) → tenants
```

---

## Action Plan

### Phase 1: Fix Schema Inconsistency (IMMEDIATE)
**Priority**: CRITICAL  
**Effort**: 15 minutes

1. ✅ Update `supabase-schema.sql`:
   - Rename `memberships` table to `tenant_members`
   - Update all references throughout file
   - Update index name from `uq_memberships_single_tenant` to `uq_tenant_members_single_tenant`

2. ✅ Verify no code references old `memberships` table name
   - Already confirmed: all TypeScript code uses `tenant_members`

---

### Phase 2: Add User Management UI (HIGH PRIORITY)
**Priority**: HIGH  
**Effort**: 2-3 hours

**Task 2.1**: Enhance AdminDashboard Memberships Tab
- Display user details (email, name) alongside membership
- Add "Invite User" button
- Add user search/filter
- Show user's group memberships

**Task 2.2**: Create User Invitation Modal
- Email input field
- Role selector (ADMIN, MEMBER)
- Facility selector (for SuperUsers)
- Call invite_user Edge Function
- Display invitation link if email not configured

**Task 2.3**: Create Invite Acceptance Page
- Route: `/accept-invite?token=xxx`
- Verify token validity
- Create user account if needed
- Add user to tenant_members
- Redirect to dashboard

---

### Phase 3: Add Group Member Assignment (MEDIUM PRIORITY)
**Priority**: MEDIUM  
**Effort**: 1-2 hours

**Task 3.1**: Add Group Members Section to AdminDashboard
- Show members of selected group
- Add "Add Member" button
- User selector (from facility members)
- Role selector (ADMIN, MEMBER)
- Remove member button

**Task 3.2**: Enhance GroupsManager Component
- Show member count per group
- Add "Manage Members" button for admins
- Link to AdminDashboard group view

---

### Phase 4: Verify Invites Table (IMMEDIATE)
**Priority**: HIGH  
**Effort**: 10 minutes

1. Query database to check if `invites` table exists
2. If missing, create migration for invites table
3. Add schema to `supabase-schema.sql`

---

## Testing Checklist

### ✅ Database Layer (Already Tested)
- [x] Helper functions exist
- [x] RLS policies applied
- [x] create_tenant() works
- [x] tenant_members table exists

### 🚧 UI Layer (Needs Testing)
- [ ] SuperUser can create facilities
- [ ] Facility Admin can create groups
- [ ] Facility Admin can invite users
- [ ] Users can accept invitations
- [ ] Facility Admin can assign users to groups
- [ ] Group Admin can manage group members
- [ ] Permission checks prevent unauthorized actions

---

## Risk Assessment

### Low Risk ✅
- Database layer is solid
- RLS policies are comprehensive
- Helper functions work correctly

### Medium Risk ⚠️
- User invitation flow untested
- Group member assignment UI missing
- No end-to-end user journey tested

### High Risk 🔴
- Schema file mismatch could cause confusion
- Missing UI blocks core requirements
- Unknown state of invites table

---

## Recommended Immediate Actions

1. **NOW**: Fix schema file (15 min)
2. **NOW**: Verify invites table exists (10 min)
3. **TODAY**: Add user invitation UI (2-3 hours)
4. **TODAY**: Add group member assignment UI (1-2 hours)
5. **TODAY**: End-to-end testing of user journey (1 hour)

---

## Success Criteria

### Must Work Immediately:
- [x] ✅ Facility creation (WORKING)
- [x] ✅ Group creation within facilities (WORKING)
- [ ] ❌ User creation and invitation (UI MISSING)
- [ ] ❌ User assignment to groups (UI INCOMPLETE)

### Hierarchy Enforcement:
- [x] ✅ Groups belong to facilities (ENFORCED)
- [x] ✅ Users can be assigned to groups (BACKEND READY)
- [ ] ⚠️ UI supports full workflow (PARTIAL)

---

## Next Steps

See detailed implementation tasks in the task list.

