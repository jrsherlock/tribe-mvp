# One-Tenant-Per-User Rule: Database Audit Report

**Date**: 2025-10-07  
**Auditor**: Augment Agent  
**Target Database**: sangha-mvp-dev (ohlscdojhsifvnnkoiqi)

---

## Executive Summary

✅ **Good News**: The `tenant_members` table is clean - no users are members of multiple tenants  
❌ **Issue Found**: 1 orphaned profile in `user_profiles` table (profile with tenant_id but no matching tenant membership)

### Key Findings

- **Total Users**: 7
- **Total Tenant Memberships**: 7 (one-to-one, compliant ✅)
- **Tenant-Specific Profiles**: 8 (should be 7 - **1 orphan detected** ❌)
- **Solo Mode Profiles**: 0
- **Total Tenants**: 2

---

## Detailed Findings

### 1. Tenant Membership Audit (`tenant_members` table)

**Status**: ✅ **COMPLIANT**

- **Query**: Check for users with multiple tenant memberships
- **Result**: **0 violations found**
- **Conclusion**: All users are members of at most one tenant

### 2. User Profiles Audit (`user_profiles` table)

**Status**: ❌ **1 ORPHANED PROFILE FOUND**

#### Orphaned Profile Details

**User**: James Sherlock Cybercade (jsherlock@cybercade.com)  
**User ID**: `ef8d2a46-a1d8-43d9-988e-501d43964c3f`

This user has **2 profiles** but only **1 tenant membership**:

| Profile ID | Tenant ID | Tenant Name | Display Name | Has Membership? | Created At | Status |
|------------|-----------|-------------|--------------|-----------------|------------|--------|
| `9f9b60ad-2ec5-41f5-ad56-42af83404db4` | `a77d4b1b-7e8d-48e2-b509-b305c5615f4d` | Top of the World Ranch | James Sherlock Cybercade | ❌ **NO** | 2025-10-03 | **ORPHAN** |
| `e04e4a6b-c740-4762-b786-3157226857e7` | `be29951e-1afa-45cc-8b99-bfa95296c3a8` | Test Facility | Cybercade Man | ✅ YES | 2025-10-07 | **VALID** |

**Current Tenant Membership**:
- Tenant: Test Facility (`be29951e-1afa-45cc-8b99-bfa95296c3a8`)
- Role: ADMIN
- Joined: 2025-10-07

**Orphaned Profile**:
- Tenant: Top of the World Ranch (`a77d4b1b-7e8d-48e2-b509-b305c5615f4d`)
- Display Name: "James Sherlock Cybercade"
- Bio: "I'm an entrepreneur in recovery"
- Avatar: Has profile picture
- Created: 2025-10-03 (4 days before current membership)
- **Issue**: Profile exists but user is NOT a member of this tenant

### 3. Data Integrity Check

**Missing Profiles**: ✅ **NONE**
- All users with `tenant_members` records have matching `user_profiles` records

**Orphaned Profiles**: ❌ **1 FOUND**
- 1 user has a `user_profiles` record with `tenant_id` but no matching `tenant_members` record

---

## Root Cause Analysis

### How Did This Happen?

The orphaned profile suggests one of these scenarios:

1. **Tenant Switch Without Cleanup**: User was moved from "Top of the World Ranch" to "Test Facility" but the old profile was not deleted
2. **Manual Profile Creation**: Profile was created manually without corresponding tenant membership
3. **Failed Transaction**: Tenant membership was deleted but profile deletion failed
4. **Testing/Development**: Profile created during testing and not cleaned up

### Why Is This a Problem?

1. **Data Inconsistency**: `user_profiles.tenant_id` should always match an active `tenant_members` record
2. **Confusing User Experience**: User sees wrong display name ("Cybercade Man" instead of "James Sherlock Cybercade")
3. **Storage Waste**: Orphaned profile with avatar_url consumes storage
4. **Query Complexity**: Application code must handle multiple profiles per user

---

## Recommended Actions

### Immediate Cleanup (Manual)

**Option A: Delete Orphaned Profile** (Recommended)
```sql
-- Delete the orphaned profile for "Top of the World Ranch"
DELETE FROM user_profiles 
WHERE id = '9f9b60ad-2ec5-41f5-ad56-42af83404db4';
```

**Option B: Update Current Profile with Better Data**
```sql
-- Copy the better display name and bio to the current profile
UPDATE user_profiles 
SET 
  display_name = 'James Sherlock Cybercade',
  bio = 'I''m an entrepreneur in recovery'
WHERE id = 'e04e4a6b-c740-4762-b786-3157226857e7';

-- Then delete the orphaned profile
DELETE FROM user_profiles 
WHERE id = '9f9b60ad-2ec5-41f5-ad56-42af83404db4';
```

**Recommendation**: Use **Option B** to preserve the user's preferred display name and bio.

### Preventive Measures (Database Constraints)

1. **Unique Constraint on tenant_members**
   - Prevent users from being added to multiple tenants
   - Already implicitly enforced by primary key, but make explicit

2. **Foreign Key Constraint on user_profiles.tenant_id**
   - Ensure every tenant_id in user_profiles has a matching tenant_members record
   - Use ON DELETE CASCADE to auto-delete profiles when membership is removed

3. **Trigger to Prevent Multiple Profiles**
   - Before INSERT on user_profiles, check if user already has a tenant-specific profile
   - Raise exception if attempting to create second tenant profile

4. **Trigger to Sync Profile Deletion**
   - When tenant_members record is deleted, automatically delete matching user_profiles record
   - Prevents orphaned profiles

### Application Code Updates

1. **Tenant Assignment Functions**
   - Check if user already has a tenant before assignment
   - Return clear error message if user is already in a tenant

2. **Invitation Acceptance**
   - Validate user is not already in a tenant before accepting invitation
   - Provide option to "switch tenants" (remove from current, add to new)

3. **Profile Management**
   - Ensure getOwnProfile() handles edge cases gracefully
   - Prefer tenant-specific profile over orphaned profiles

---

## Next Steps

1. ✅ **Audit Complete** - This document
2. ⏳ **Data Cleanup** - Execute Option B SQL to fix orphaned profile
3. ⏳ **Database Constraints** - Implement triggers and foreign keys
4. ⏳ **Application Code** - Update tenant assignment logic
5. ⏳ **Testing** - Verify constraints work and error messages are clear

---

## SQL Queries Used for Audit

### Find Users with Multiple Tenant Memberships
```sql
SELECT user_id, COUNT(DISTINCT tenant_id) as tenant_count, 
       ARRAY_AGG(DISTINCT tenant_id) as tenant_ids, 
       ARRAY_AGG(role) as roles 
FROM tenant_members 
GROUP BY user_id 
HAVING COUNT(DISTINCT tenant_id) > 1;
```

### Find Users with Multiple Profiles
```sql
SELECT user_id, COUNT(*) as profile_count, 
       ARRAY_AGG(tenant_id) as tenant_ids, 
       ARRAY_AGG(display_name) as display_names 
FROM user_profiles 
WHERE tenant_id IS NOT NULL 
GROUP BY user_id 
HAVING COUNT(*) > 1;
```

### Find Orphaned Profiles
```sql
SELECT up.id, up.user_id, au.email, up.tenant_id, t.name as tenant_name, 
       up.display_name, up.created_at 
FROM user_profiles up 
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id 
LEFT JOIN auth.users au ON up.user_id = au.id 
LEFT JOIN tenants t ON up.tenant_id = t.id 
WHERE up.tenant_id IS NOT NULL AND tm.user_id IS NULL;
```

---

**End of Audit Report**

