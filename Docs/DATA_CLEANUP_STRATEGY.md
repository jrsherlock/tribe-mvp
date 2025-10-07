# Data Cleanup Strategy: One-Tenant-Per-User Rule

**Date**: 2025-10-07  
**Target**: Fix orphaned profile for user ef8d2a46-a1d8-43d9-988e-501d43964c3f

---

## Problem Summary

User **James Sherlock Cybercade** (jsherlock@cybercade.com) has:
- ✅ 1 valid tenant membership: **Test Facility** (ADMIN role)
- ❌ 2 user_profiles records:
  1. **Valid Profile**: Test Facility - display_name: "Cybercade Man" (created 2025-10-07)
  2. **Orphaned Profile**: Top of the World Ranch - display_name: "James Sherlock Cybercade" (created 2025-10-03)

---

## Cleanup Decision Matrix

| Criterion | Test Facility Profile | Top of the World Ranch Profile | Winner |
|-----------|----------------------|-------------------------------|--------|
| **Has Tenant Membership?** | ✅ YES | ❌ NO | Test Facility |
| **Created Date** | 2025-10-07 (newer) | 2025-10-03 (older) | Test Facility |
| **Display Name Quality** | "Cybercade Man" | "James Sherlock Cybercade" | **Top of the World** |
| **Bio Quality** | "I'm a loner" | "I'm an entrepreneur in recovery" | **Top of the World** |
| **Avatar Quality** | Has avatar | Has avatar | Tie |
| **Data Completeness** | Partial | More complete | **Top of the World** |

### Recommendation

**Keep**: Test Facility profile (has valid membership)  
**Delete**: Top of the World Ranch profile (orphaned)  
**But First**: Copy the better display_name and bio from the orphaned profile to the valid profile

---

## Cleanup Strategy

### Step 1: Backup Current Data

Before making any changes, create a backup of the affected records:

```sql
-- Backup user_profiles records
CREATE TABLE IF NOT EXISTS user_profiles_backup_20251007 AS
SELECT * FROM user_profiles 
WHERE user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';

-- Verify backup
SELECT * FROM user_profiles_backup_20251007;
```

### Step 2: Update Valid Profile with Better Data

Copy the preferred display_name and bio to the current valid profile:

```sql
-- Update the Test Facility profile with better data from orphaned profile
UPDATE user_profiles 
SET 
  display_name = 'James Sherlock Cybercade',
  bio = 'I''m an entrepreneur in recovery',
  updated_at = NOW()
WHERE id = 'e04e4a6b-c740-4762-b786-3157226857e7'
  AND user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f'
  AND tenant_id = 'be29951e-1afa-45cc-8b99-bfa95296c3a8';

-- Verify update
SELECT id, user_id, tenant_id, display_name, bio, updated_at 
FROM user_profiles 
WHERE id = 'e04e4a6b-c740-4762-b786-3157226857e7';
```

### Step 3: Delete Orphaned Profile

Remove the orphaned profile that has no matching tenant membership:

```sql
-- Delete the orphaned profile
DELETE FROM user_profiles 
WHERE id = '9f9b60ad-2ec5-41f5-ad56-42af83404db4'
  AND user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f'
  AND tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d';

-- Verify deletion (should return 0 rows)
SELECT * FROM user_profiles 
WHERE id = '9f9b60ad-2ec5-41f5-ad56-42af83404db4';
```

### Step 4: Verify Final State

Confirm the user now has exactly 1 profile matching their 1 tenant membership:

```sql
-- Should return exactly 1 row
SELECT 
  up.id as profile_id,
  up.user_id,
  up.tenant_id,
  t.name as tenant_name,
  up.display_name,
  up.bio,
  tm.role,
  CASE WHEN tm.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_membership
FROM user_profiles up
LEFT JOIN tenants t ON up.tenant_id = t.id
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id
WHERE up.user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';
```

Expected result:
- 1 row
- tenant_name: "Test Facility"
- display_name: "James Sherlock Cybercade"
- bio: "I'm an entrepreneur in recovery"
- has_membership: "YES"

---

## Rollback Plan

If something goes wrong, restore from backup:

```sql
-- Delete current profiles
DELETE FROM user_profiles 
WHERE user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';

-- Restore from backup
INSERT INTO user_profiles 
SELECT * FROM user_profiles_backup_20251007;

-- Verify restoration
SELECT * FROM user_profiles 
WHERE user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';
```

---

## Future Prevention

After cleanup, implement these measures to prevent orphaned profiles:

### 1. Foreign Key Constraint

Add a foreign key from user_profiles to tenant_members to ensure referential integrity:

```sql
-- This will be implemented in the constraints phase
-- For now, documented as future work
```

### 2. Cascade Delete Trigger

When a tenant_members record is deleted, automatically delete the matching user_profiles record:

```sql
-- This will be implemented in the constraints phase
-- For now, documented as future work
```

### 3. Application-Level Validation

Update tenant assignment code to:
- Check for existing profiles before creating new ones
- Delete old profiles when moving users between tenants
- Validate data consistency before and after tenant operations

---

## Execution Checklist

- [ ] Review this strategy document
- [ ] Get user approval to proceed
- [ ] Execute Step 1: Create backup
- [ ] Execute Step 2: Update valid profile
- [ ] Execute Step 3: Delete orphaned profile
- [ ] Execute Step 4: Verify final state
- [ ] Document results
- [ ] Proceed to database constraints implementation

---

**Ready to Execute**: Yes, pending user approval

