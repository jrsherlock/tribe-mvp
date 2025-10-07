# Phase 1: Database Refactoring - Implementation Guide

**Goal**: Fix the foundation - enforce one-to-one relationships and eliminate profile duplication

**Timeline**: 1 week  
**Risk**: Medium (requires data migration)  
**Priority**: CRITICAL (fixes root cause of "Anonymous" bug and other issues)

---

## Problem Statement

### Current Issues

1. **Multiple Profiles Per User**
   - Users have 2+ `user_profiles` rows (one for solo mode, one per facility)
   - Causes "Anonymous" bug when wrong profile is fetched
   - Violates single source of truth principle

2. **No Group Membership Constraint**
   - Users can join multiple groups
   - Violates your business rule: "Users can only belong to ONE group"

3. **Incomplete Group Roles**
   - `group_memberships.role` only has 'MEMBER'
   - No 'ADMIN' role for Group Admins

---

## Step 1: Audit Current Data

### 1.1 Find Users with Multiple Profiles

```sql
-- Find users with multiple profiles
SELECT 
  user_id,
  COUNT(*) as profile_count,
  STRING_AGG(DISTINCT COALESCE(tenant_id::text, 'NULL'), ', ') as tenant_ids
FROM user_profiles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY profile_count DESC;
```

**Expected Result**: List of users with 2+ profiles

### 1.2 Find Users in Multiple Groups

```sql
-- Find users in multiple groups
SELECT 
  user_id,
  COUNT(*) as group_count,
  STRING_AGG(group_id::text, ', ') as group_ids
FROM group_memberships
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY group_count DESC;
```

**Expected Result**: Should be empty (good news: no users in multiple groups yet!)

### 1.3 Analyze Profile Distribution

```sql
-- See how profiles are distributed
SELECT 
  CASE 
    WHEN tenant_id IS NULL THEN 'Solo Profile'
    ELSE 'Facility Profile'
  END as profile_type,
  COUNT(*) as count
FROM user_profiles
GROUP BY profile_type;
```

---

## Step 2: Consolidate User Profiles

### Strategy

For each user with multiple profiles:
1. **Keep the facility profile** (if exists) - this is their "real" profile
2. **Delete the solo profile** - this was just a placeholder
3. **Update references** - ensure all data points to the kept profile

### 2.1 Identify Profiles to Keep vs Delete

```sql
-- For each user, identify which profile to keep
WITH profile_priority AS (
  SELECT 
    id,
    user_id,
    tenant_id,
    display_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE WHEN tenant_id IS NOT NULL THEN 0 ELSE 1 END,  -- Prefer facility profiles
        created_at ASC  -- If multiple facility profiles, keep oldest
    ) as priority
  FROM user_profiles
)
SELECT 
  user_id,
  id as profile_id_to_keep,
  tenant_id,
  display_name
FROM profile_priority
WHERE priority = 1
  AND user_id IN (
    SELECT user_id 
    FROM user_profiles 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
  )
ORDER BY user_id;
```

### 2.2 Create Backup

**CRITICAL**: Always backup before deleting data!

```sql
-- Create backup table
CREATE TABLE user_profiles_backup_20250107 AS 
SELECT * FROM user_profiles;

-- Verify backup
SELECT COUNT(*) FROM user_profiles_backup_20250107;
```

### 2.3 Delete Duplicate Profiles

```sql
-- Delete duplicate profiles (keep only the highest priority one)
WITH profile_priority AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE WHEN tenant_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as priority
  FROM user_profiles
)
DELETE FROM user_profiles
WHERE id IN (
  SELECT id 
  FROM profile_priority 
  WHERE priority > 1
);

-- Verify: Should have exactly one profile per user
SELECT user_id, COUNT(*) 
FROM user_profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### 2.4 Add Unique Constraint

```sql
-- Add unique constraint to prevent future duplicates
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Verify constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
  AND conname = 'user_profiles_user_id_unique';
```

---

## Step 3: Enforce One Group Per User

### 3.1 Verify No Users in Multiple Groups

```sql
-- Check for users in multiple groups
SELECT user_id, COUNT(*) as group_count
FROM group_memberships
GROUP BY user_id
HAVING COUNT(*) > 1;
```

**Expected**: 0 rows (good!)

### 3.2 Add Unique Constraint

```sql
-- Add unique constraint: one user can only be in one group
ALTER TABLE group_memberships 
ADD CONSTRAINT group_memberships_user_id_unique UNIQUE (user_id);

-- Verify constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'group_memberships'::regclass 
  AND conname = 'group_memberships_user_id_unique';
```

---

## Step 4: Add Group Admin Role Support

### 4.1 Verify Role Column Exists

```sql
-- Check current roles in group_memberships
SELECT DISTINCT role FROM group_memberships;
-- Should show: MEMBER
```

### 4.2 Add Helper Function to Promote Group Admin

```sql
-- Function to promote user to group admin
CREATE OR REPLACE FUNCTION promote_to_group_admin(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE group_memberships
  SET role = 'ADMIN'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote from group admin
CREATE OR REPLACE FUNCTION demote_from_group_admin(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE group_memberships
  SET role = 'MEMBER'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Step 5: Update RLS Policies (if needed)

### 5.1 Check Existing Policies

```sql
-- List all RLS policies on user_profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles';
```

### 5.2 Update Policies to Reflect One Profile Per User

Most policies should already work, but verify they don't assume multiple profiles per user.

---

## Step 6: Verification & Testing

### 6.1 Data Integrity Checks

```sql
-- 1. Every user has exactly one profile
SELECT 
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_profiles
FROM user_profiles;
-- Should be equal

-- 2. No user in multiple groups
SELECT COUNT(*) 
FROM (
  SELECT user_id 
  FROM group_memberships 
  GROUP BY user_id 
  HAVING COUNT(*) > 1
) as multi_group_users;
-- Should be 0

-- 3. All profiles have valid user_id
SELECT COUNT(*) 
FROM user_profiles 
WHERE user_id IS NULL;
-- Should be 0

-- 4. All facility members have profiles
SELECT COUNT(*)
FROM tenant_members tm
LEFT JOIN user_profiles up ON tm.user_id = up.user_id
WHERE up.id IS NULL;
-- Should be 0
```

### 6.2 Test Profile Lookups

```sql
-- Test: Fetch profiles for check-in users (the "Anonymous" bug scenario)
SELECT 
  dc.user_id,
  up.display_name,
  up.avatar_url,
  up.tenant_id
FROM daily_checkins dc
JOIN user_profiles up ON dc.user_id = up.user_id
WHERE dc.checkin_date = CURRENT_DATE
LIMIT 10;
-- Should show display names, not NULL
```

---

## Step 7: Create Migration File

### 7.1 Generate Migration

```sql
-- File: supabase/migrations/20250107_consolidate_user_profiles.sql

-- ============================================
-- Migration: Consolidate User Profiles
-- Date: 2025-01-07
-- Purpose: Enforce one profile per user
-- ============================================

BEGIN;

-- Step 1: Create backup
CREATE TABLE IF NOT EXISTS user_profiles_backup_20250107 AS 
SELECT * FROM user_profiles;

-- Step 2: Delete duplicate profiles (keep facility profiles over solo profiles)
WITH profile_priority AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE WHEN tenant_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as priority
  FROM user_profiles
)
DELETE FROM user_profiles
WHERE id IN (
  SELECT id 
  FROM profile_priority 
  WHERE priority > 1
);

-- Step 3: Add unique constraint on user_id
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Step 4: Add unique constraint on group_memberships.user_id
ALTER TABLE group_memberships 
ADD CONSTRAINT group_memberships_user_id_unique UNIQUE (user_id);

-- Step 5: Add helper functions for group admin management
CREATE OR REPLACE FUNCTION promote_to_group_admin(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE group_memberships
  SET role = 'ADMIN'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION demote_from_group_admin(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE group_memberships
  SET role = 'MEMBER'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

---

## Rollback Plan

If something goes wrong:

```sql
-- Restore from backup
BEGIN;

-- Drop constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_unique;
ALTER TABLE group_memberships DROP CONSTRAINT IF EXISTS group_memberships_user_id_unique;

-- Restore data
DELETE FROM user_profiles;
INSERT INTO user_profiles SELECT * FROM user_profiles_backup_20250107;

COMMIT;
```

---

## Success Criteria

✅ **One Profile Per User**
- `user_profiles` has unique constraint on `user_id`
- No users have multiple profiles
- Profile lookups always return exactly one result

✅ **One Group Per User**
- `group_memberships` has unique constraint on `user_id`
- No users belong to multiple groups

✅ **Group Admin Role**
- Helper functions exist to promote/demote group admins
- `group_memberships.role` can be 'ADMIN' or 'MEMBER'

✅ **No Data Loss**
- Backup table exists with all original data
- All users still have profiles
- All group memberships preserved

✅ **"Anonymous" Bug Fixed**
- Profile lookups work correctly
- Dashboard shows real user names
- No more fallback to 'Anonymous'

---

## Next Steps

After Phase 1 is complete:
1. **Update service layer** (Phase 2) - Remove tenant filtering from `listProfilesByUserIds`
2. **Create Facility components** (Phase 3) - Build Facility Profile page
3. **Add role-based UI** (Phase 4) - Show/hide features by role

**Ready to proceed?** Run the audit queries first to see the current state of your data.

