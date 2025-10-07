-- ============================================================================
-- ONE-TENANT-PER-USER RULE: TEST SCRIPT
-- ============================================================================
-- Date: 2025-10-07
-- Purpose: Validate that all constraints are working correctly
-- Target: sangha-mvp-dev database
--
-- IMPORTANT: This script contains tests that SHOULD FAIL
-- Run each test individually and verify the expected error messages
-- ============================================================================

-- ============================================================================
-- SETUP: Get Test Data
-- ============================================================================

-- Get a user who is currently in a tenant
SELECT 
  'TEST SETUP' as test_phase,
  tm.user_id,
  au.email,
  tm.tenant_id,
  t.name as tenant_name,
  tm.role
FROM tenant_members tm
JOIN auth.users au ON tm.user_id = au.id
JOIN tenants t ON tm.tenant_id = t.id
LIMIT 1;

-- Store these values for use in tests below:
-- user_id: <copy from above>
-- tenant_id: <copy from above>

-- Get a different tenant_id for testing
SELECT 
  'DIFFERENT TENANT' as test_phase,
  id as different_tenant_id,
  name as tenant_name
FROM tenants
WHERE id != '<tenant_id_from_above>'
LIMIT 1;

-- ============================================================================
-- TEST 1: Attempt to Add User to Second Tenant (SHOULD FAIL)
-- ============================================================================

-- Expected: ERROR - unique constraint violation
-- Error Code: 23505
-- Error Message: "User ... is already a member of tenant ..."

/*
INSERT INTO tenant_members (user_id, tenant_id, role)
VALUES (
  '<user_id_from_above>',
  '<different_tenant_id_from_above>',
  'MEMBER'
);
*/

-- Expected Result: ❌ ERROR
-- Actual Error Message: [Copy error message here after running]

-- ============================================================================
-- TEST 2: Attempt to Create Second Tenant Profile (SHOULD FAIL)
-- ============================================================================

-- Expected: ERROR - user already has a tenant-specific profile
-- Error Code: 23505
-- Error Message: "User ... already has a tenant-specific profile for tenant ..."

/*
INSERT INTO user_profiles (user_id, tenant_id, display_name)
VALUES (
  '<user_id_from_above>',
  '<different_tenant_id_from_above>',
  'Test Display Name'
);
*/

-- Expected Result: ❌ ERROR
-- Actual Error Message: [Copy error message here after running]

-- ============================================================================
-- TEST 3: Attempt to Create Profile Without Membership (SHOULD FAIL)
-- ============================================================================

-- First, get a user who is NOT in any tenant (solo mode)
SELECT 
  'SOLO MODE USER' as test_phase,
  au.id as user_id,
  au.email
FROM auth.users au
LEFT JOIN tenant_members tm ON au.id = tm.user_id
WHERE tm.user_id IS NULL
LIMIT 1;

-- Expected: ERROR - user must be a member of the tenant first
-- Error Code: 23503
-- Error Message: "Cannot create user_profile with tenant_id ... for user ..."

/*
INSERT INTO user_profiles (user_id, tenant_id, display_name)
VALUES (
  '<solo_user_id_from_above>',
  '<any_tenant_id>',
  'Test Display Name'
);
*/

-- Expected Result: ❌ ERROR
-- Actual Error Message: [Copy error message here after running]

-- ============================================================================
-- TEST 4: Cascade Delete - Delete Membership and Verify Profile Deleted
-- ============================================================================

-- This test requires creating a temporary user and tenant membership
-- DO NOT run this on production data

-- Step 1: Create a test user (or use an existing test user)
-- Step 2: Add them to a tenant
-- Step 3: Verify profile exists
-- Step 4: Delete tenant membership
-- Step 5: Verify profile was automatically deleted

/*
-- Step 1: Get or create test user
-- (Assuming test user already exists)

-- Step 2: Add to tenant
INSERT INTO tenant_members (user_id, tenant_id, role)
VALUES ('<test_user_id>', '<test_tenant_id>', 'MEMBER');

-- Step 3: Verify profile exists
SELECT * FROM user_profiles 
WHERE user_id = '<test_user_id>' 
  AND tenant_id = '<test_tenant_id>';

-- Expected: 1 row returned

-- Step 4: Delete tenant membership
DELETE FROM tenant_members 
WHERE user_id = '<test_user_id>' 
  AND tenant_id = '<test_tenant_id>';

-- Step 5: Verify profile was automatically deleted
SELECT * FROM user_profiles 
WHERE user_id = '<test_user_id>' 
  AND tenant_id = '<test_tenant_id>';

-- Expected: 0 rows returned (profile auto-deleted by trigger)
*/

-- ============================================================================
-- TEST 5: Verify Unique Index Exists
-- ============================================================================

SELECT 
  'UNIQUE INDEX CHECK' as test_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tenant_members'
  AND indexname = 'idx_tenant_members_unique_user';

-- Expected: 1 row with indexdef containing "UNIQUE INDEX ... ON tenant_members (user_id)"

-- ============================================================================
-- TEST 6: Verify All Triggers Exist
-- ============================================================================

-- Check tenant_members triggers
SELECT 
  'TENANT_MEMBERS TRIGGERS' as table_name,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'tenant_members'
  AND trigger_name IN (
    'trigger_validate_one_tenant_on_insert',
    'trigger_cascade_delete_profile'
  )
ORDER BY trigger_name;

-- Expected: 2 triggers
-- 1. trigger_validate_one_tenant_on_insert (BEFORE INSERT/UPDATE)
-- 2. trigger_cascade_delete_profile (AFTER DELETE)

-- Check user_profiles triggers
SELECT 
  'USER_PROFILES TRIGGERS' as table_name,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles'
  AND trigger_name IN (
    'trigger_validate_profile_membership',
    'trigger_validate_single_tenant_profile'
  )
ORDER BY trigger_name;

-- Expected: 2 triggers
-- 1. trigger_validate_profile_membership (BEFORE INSERT/UPDATE)
-- 2. trigger_validate_single_tenant_profile (BEFORE INSERT/UPDATE)

-- ============================================================================
-- TEST 7: Verify No Multi-Tenant Users Exist
-- ============================================================================

-- Check for users with multiple tenant memberships
SELECT 
  'MULTI-TENANT USERS CHECK' as test_type,
  user_id,
  COUNT(*) as membership_count,
  ARRAY_AGG(tenant_id) as tenant_ids
FROM tenant_members
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no users with multiple memberships)

-- ============================================================================
-- TEST 8: Verify No Orphaned Profiles Exist
-- ============================================================================

-- Check for profiles without matching tenant membership
SELECT 
  'ORPHANED PROFILES CHECK' as test_type,
  up.id as profile_id,
  up.user_id,
  up.tenant_id,
  t.name as tenant_name
FROM user_profiles up
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id
LEFT JOIN tenants t ON up.tenant_id = t.id
WHERE up.tenant_id IS NOT NULL 
  AND tm.user_id IS NULL;

-- Expected: 0 rows (no orphaned profiles)

-- ============================================================================
-- TEST 9: Verify No Users with Multiple Tenant Profiles
-- ============================================================================

-- Check for users with multiple tenant-specific profiles
SELECT 
  'MULTIPLE PROFILES CHECK' as test_type,
  user_id,
  COUNT(*) as profile_count,
  ARRAY_AGG(tenant_id) as tenant_ids,
  ARRAY_AGG(display_name) as display_names
FROM user_profiles
WHERE tenant_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no users with multiple tenant profiles)

-- ============================================================================
-- TEST 10: Verify Data Integrity Summary
-- ============================================================================

SELECT 
  'DATA INTEGRITY SUMMARY' as report_type,
  (SELECT COUNT(DISTINCT user_id) FROM user_profiles) as total_users,
  (SELECT COUNT(*) FROM tenant_members) as total_memberships,
  (SELECT COUNT(*) FROM user_profiles WHERE tenant_id IS NOT NULL) as tenant_profiles,
  (SELECT COUNT(*) FROM user_profiles WHERE tenant_id IS NULL) as solo_profiles,
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  -- These should all be 0:
  (SELECT COUNT(*) FROM (
    SELECT user_id FROM tenant_members GROUP BY user_id HAVING COUNT(*) > 1
  ) multi_tenant_users) as users_with_multiple_tenants,
  (SELECT COUNT(*) FROM user_profiles up 
   LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id 
   WHERE up.tenant_id IS NOT NULL AND tm.user_id IS NULL) as orphaned_profiles,
  (SELECT COUNT(*) FROM (
    SELECT user_id FROM user_profiles WHERE tenant_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1
  ) multi_profile_users) as users_with_multiple_profiles;

-- Expected:
-- - total_users: 7
-- - total_memberships: 7
-- - tenant_profiles: 7
-- - solo_profiles: 0
-- - total_tenants: 2
-- - users_with_multiple_tenants: 0 ✅
-- - orphaned_profiles: 0 ✅
-- - users_with_multiple_profiles: 0 ✅

-- ============================================================================
-- TEST RESULTS SUMMARY
-- ============================================================================

/*
TEST RESULTS:

[ ] TEST 1: Attempt to add user to second tenant
    Expected: ❌ ERROR with code 23505
    Actual: [Fill in after running]

[ ] TEST 2: Attempt to create second tenant profile
    Expected: ❌ ERROR with code 23505
    Actual: [Fill in after running]

[ ] TEST 3: Attempt to create profile without membership
    Expected: ❌ ERROR with code 23503
    Actual: [Fill in after running]

[ ] TEST 4: Cascade delete verification
    Expected: ✅ Profile auto-deleted when membership deleted
    Actual: [Fill in after running]

[ ] TEST 5: Unique index exists
    Expected: ✅ idx_tenant_members_unique_user found
    Actual: [Fill in after running]

[ ] TEST 6: All triggers exist
    Expected: ✅ 4 triggers found (2 on tenant_members, 2 on user_profiles)
    Actual: [Fill in after running]

[ ] TEST 7: No multi-tenant users
    Expected: ✅ 0 rows
    Actual: [Fill in after running]

[ ] TEST 8: No orphaned profiles
    Expected: ✅ 0 rows
    Actual: [Fill in after running]

[ ] TEST 9: No users with multiple profiles
    Expected: ✅ 0 rows
    Actual: [Fill in after running]

[ ] TEST 10: Data integrity summary
    Expected: ✅ All violation counts = 0
    Actual: [Fill in after running]

OVERALL STATUS: [PASS / FAIL]
*/

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================

