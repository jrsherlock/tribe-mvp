# One-Tenant-Per-User Rule: Complete Implementation Guide

**Date**: 2025-10-07  
**Status**: ✅ **IMPLEMENTED**  
**Database**: sangha-mvp-dev (ohlscdojhsifvnnkoiqi)

---

## Executive Summary

The **one-tenant-per-user rule** has been successfully implemented across the entire platform with multi-layered enforcement:

1. ✅ **Database Constraints** - Unique indexes and triggers prevent violations at the database level
2. ✅ **Application Validation** - TypeScript code validates before attempting database operations
3. ✅ **User-Friendly Errors** - Clear error messages guide users when violations are attempted
4. ✅ **Data Cleanup** - All existing violations have been resolved
5. ✅ **SuperUser Exemption** - SuperUsers are properly exempted from the rule

---

## Business Rule

### Core Principle

**Every user (except SuperUsers) can be associated with AT MOST ONE tenant at any given time.**

### States

A user can be in one of two states:

1. **Solo Mode**: `tenant_id = NULL` in both `user_profiles` and no record in `tenant_members`
2. **Tenant Member**: Exactly ONE record in `tenant_members` and ONE matching record in `user_profiles`

### Exception

**SuperUsers** are the ONLY exception:
- They have administrative access to ALL tenants
- They are NOT members of any tenant (no records in `tenant_members`)
- They are tracked separately in the `superusers` table

---

## Implementation Layers

### Layer 1: Database Constraints

#### 1.1 Unique Index on `tenant_members.user_id`

```sql
CREATE UNIQUE INDEX idx_tenant_members_unique_user 
ON tenant_members(user_id);
```

**Purpose**: Prevents a user from being inserted into `tenant_members` more than once  
**Effect**: Database will reject any attempt to add a user to a second tenant  
**Error Code**: `23505` (unique_violation)

#### 1.2 Trigger: Validate One-Tenant Rule

**Function**: `validate_one_tenant_per_user()`  
**Trigger**: `trigger_validate_one_tenant_on_insert` (BEFORE INSERT/UPDATE on `tenant_members`)

**Purpose**: 
- Checks if user already has a tenant membership before INSERT
- Prevents changing `tenant_id` on UPDATE if user has other memberships
- Exempts SuperUsers from the rule

**Error Message Example**:
```
User abc123 is already a member of tenant "Test Facility" (xyz789). 
Users can only belong to one tenant at a time. 
Remove them from their current tenant before adding to a new one.
```

#### 1.3 Trigger: Prevent Orphaned Profiles

**Function**: `validate_profile_has_membership()`  
**Trigger**: `trigger_validate_profile_membership` (BEFORE INSERT/UPDATE on `user_profiles`)

**Purpose**: Ensures every `user_profiles` record with `tenant_id` has a matching `tenant_members` record

**Error Message Example**:
```
Cannot create user_profile with tenant_id xyz789 for user abc123. 
User must be a member of the tenant first (add to tenant_members table).
```

#### 1.4 Trigger: Cascade Delete Profiles

**Function**: `cascade_delete_user_profile()`  
**Trigger**: `trigger_cascade_delete_profile` (AFTER DELETE on `tenant_members`)

**Purpose**: When a `tenant_members` record is deleted, automatically delete the matching `user_profiles` record

**Effect**: Prevents orphaned profiles when users leave tenants

#### 1.5 Trigger: Prevent Multiple Tenant Profiles

**Function**: `validate_single_tenant_profile()`  
**Trigger**: `trigger_validate_single_tenant_profile` (BEFORE INSERT/UPDATE on `user_profiles`)

**Purpose**: Ensures a user doesn't have multiple tenant-specific profiles

**Error Message Example**:
```
User abc123 already has a tenant-specific profile for tenant xyz789. 
Users can only have one tenant-specific profile. 
Delete the existing profile before creating a new one.
```

---

### Layer 2: Application Code Validation

#### 2.1 Invite Acceptance (`src/lib/services/invites.ts`)

**Function**: `acceptInvite(token: string)`

**Validation Logic**:
```typescript
// Check if user is already a member of a tenant
const { data: existingMembership } = await supabase
  .from('tenant_members')
  .select('tenant_id, tenants(name)')
  .eq('user_id', userId)
  .single()

if (existingMembership) {
  throw new Error(
    `You are already a member of "${currentTenantName}". ` +
    `Users can only belong to one facility at a time. ` +
    `Please contact your administrator if you need to switch facilities.`
  )
}
```

**User Experience**: 
- User clicks invitation link
- If already in a tenant, sees clear error message
- Must contact admin to switch facilities

#### 2.2 Admin Facility Assignment (`src/components/admin/AssignToFacilityModal.tsx`)

**Function**: `handleAssign()`

**Validation Logic**:
```typescript
// If user is currently in a different facility, remove them first
if (currentFacility && currentFacility.id !== selectedFacilityId) {
  // Remove from current facility (cascade deletes groups & profile)
  await adminClient
    .from('tenant_members')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', currentFacility.id);
}

// Then assign to new facility
await adminClient
  .from('tenant_members')
  .upsert({
    user_id: userId,
    tenant_id: selectedFacilityId,
    role: selectedRole
  });
```

**User Experience**:
- Admin selects user and new facility
- If user is in different facility, automatically moved (not added to second)
- Success message: "User moved to New Facility"

**Error Handling**:
```typescript
if (upsertError.code === '23505') {
  throw new Error(
    `${userName} is already a member of another facility. ` +
    `Users can only belong to one facility at a time. ` +
    `Please remove them from their current facility first.`
  );
}
```

---

## Data Cleanup Results

### Before Cleanup

- **Total Users**: 7
- **Tenant Memberships**: 7
- **Tenant Profiles**: 8 ❌ (1 orphan)
- **Orphaned Profiles**: 1

### After Cleanup

- **Total Users**: 7
- **Tenant Memberships**: 7
- **Tenant Profiles**: 7 ✅
- **Orphaned Profiles**: 0 ✅

### Specific Fix

**User**: James Sherlock Cybercade (jsherlock@cybercade.com)

**Issue**: Had 2 profiles (Test Facility + Top of the World Ranch) but only 1 membership (Test Facility)

**Resolution**:
1. Updated Test Facility profile with better display_name and bio from orphaned profile
2. Deleted orphaned Top of the World Ranch profile
3. User now has 1 profile matching 1 membership ✅

---

## Testing & Validation

### Test Case 1: Attempt to Add User to Second Tenant

**Setup**: User is already a member of "Test Facility"

**Action**: Try to add them to "Top of the World Ranch"

**Expected Result**: ❌ Database rejects with error:
```
User abc123 is already a member of tenant "Test Facility" (xyz789). 
Users can only belong to one tenant at a time.
```

**Status**: ✅ **PASS** (enforced by unique index + trigger)

### Test Case 2: Accept Invitation While Already in Tenant

**Setup**: User is already a member of "Test Facility"

**Action**: User clicks invitation link for "Top of the World Ranch"

**Expected Result**: ❌ Application shows error:
```
You are already a member of "Test Facility". 
Users can only belong to one facility at a time. 
Please contact your administrator if you need to switch facilities.
```

**Status**: ✅ **PASS** (enforced by application validation)

### Test Case 3: Admin Moves User Between Facilities

**Setup**: User is a member of "Test Facility"

**Action**: Admin assigns user to "Top of the World Ranch"

**Expected Result**: ✅ User is removed from Test Facility, then added to Top of the World Ranch

**Status**: ✅ **PASS** (handled by AssignToFacilityModal logic)

### Test Case 4: Delete Tenant Membership

**Setup**: User has membership in "Test Facility" with matching profile

**Action**: Delete `tenant_members` record

**Expected Result**: ✅ Matching `user_profiles` record is automatically deleted

**Status**: ✅ **PASS** (enforced by cascade delete trigger)

### Test Case 5: SuperUser Access

**Setup**: User is a SuperUser

**Action**: SuperUser accesses multiple tenant admin panels

**Expected Result**: ✅ SuperUser can access all tenants without being a member

**Status**: ✅ **PASS** (SuperUsers exempt from rule, not in tenant_members)

---

## Edge Cases & Future Considerations

### Tenant Switching Workflow

**Current State**: Implemented at database and application level, but no dedicated UI

**How It Works**:
1. Admin opens AssignToFacilityModal for user
2. Selects new facility
3. System automatically removes from old facility, adds to new
4. User's profile, groups, and check-ins are migrated/deleted as appropriate

**Future Enhancement** (Out of Scope for MVP):
- User-initiated tenant switch request
- Approval workflow for tenant switches
- Data migration options (keep vs. delete old data)

### Solo Mode to Tenant Transition

**Current State**: ✅ Fully supported

**How It Works**:
1. User starts in solo mode (`tenant_id = NULL`)
2. Receives invitation or admin assigns to facility
3. Solo profile is preserved, new tenant-specific profile is created
4. User can switch back to solo mode by leaving tenant

### Multiple Profiles Per User

**Current State**: ❌ Prevented by triggers

**Rationale**: 
- One-tenant-per-user rule requires one profile per user
- Solo mode profile (`tenant_id = NULL`) is separate from tenant profile
- User can have at most 2 profiles total: 1 solo + 1 tenant

---

## Monitoring & Maintenance

### Regular Audits

Run these queries periodically to ensure data integrity:

```sql
-- Check for users with multiple tenant memberships (should return 0)
SELECT user_id, COUNT(*) as membership_count
FROM tenant_members
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Check for orphaned profiles (should return 0)
SELECT up.id, up.user_id, up.tenant_id
FROM user_profiles up
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id
WHERE up.tenant_id IS NOT NULL AND tm.user_id IS NULL;

-- Check for users with multiple tenant profiles (should return 0)
SELECT user_id, COUNT(*) as profile_count
FROM user_profiles
WHERE tenant_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### Constraint Verification

```sql
-- List all triggers
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('tenant_members', 'user_profiles')
ORDER BY event_object_table, trigger_name;

-- List all unique indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tenant_members'
  AND indexname LIKE '%unique%';
```

---

## Files Modified

### Database Scripts

- `Docs/database_constraints_one_tenant_rule.sql` - All database constraints
- `Docs/cleanup_orphaned_profiles.sql` - Data cleanup script

### Application Code

- `src/lib/services/invites.ts` - Added validation to `acceptInvite()`
- `src/components/admin/AssignToFacilityModal.tsx` - Enhanced error handling

### Documentation

- `Docs/ONE_TENANT_RULE_AUDIT.md` - Initial audit report
- `Docs/DATA_CLEANUP_STRATEGY.md` - Cleanup strategy and execution plan
- `Docs/ONE_TENANT_RULE_IMPLEMENTATION.md` - This document

---

## Success Criteria

- [x] Database constraints prevent inserting a user into a second tenant
- [x] Application code validates one-tenant rule before any tenant assignment
- [x] Clear error messages when attempting to violate the rule
- [x] All existing multi-tenant users are cleaned up to comply with the rule
- [x] SuperUsers are properly exempted from the rule
- [x] Cascade delete prevents orphaned profiles
- [x] Comprehensive documentation and testing

---

**Implementation Status**: ✅ **COMPLETE**  
**Last Updated**: 2025-10-07

