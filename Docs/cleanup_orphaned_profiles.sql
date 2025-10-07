-- ============================================================================
-- ONE-TENANT-PER-USER RULE: DATA CLEANUP SCRIPT
-- ============================================================================
-- Date: 2025-10-07
-- Purpose: Fix orphaned user_profiles for user ef8d2a46-a1d8-43d9-988e-501d43964c3f
-- Target: sangha-mvp-dev database
--
-- IMPORTANT: Review Docs/DATA_CLEANUP_STRATEGY.md before executing
-- ============================================================================

-- ============================================================================
-- STEP 1: BACKUP CURRENT DATA
-- ============================================================================

-- Create backup table for user_profiles
CREATE TABLE IF NOT EXISTS user_profiles_backup_20251007 AS
SELECT * FROM user_profiles 
WHERE user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';

-- Verify backup created
SELECT 
  'BACKUP CREATED' as status,
  COUNT(*) as records_backed_up,
  ARRAY_AGG(id) as profile_ids
FROM user_profiles_backup_20251007;

-- Show backup details
SELECT 
  id,
  user_id,
  tenant_id,
  display_name,
  bio,
  created_at
FROM user_profiles_backup_20251007
ORDER BY created_at;

-- ============================================================================
-- STEP 2: UPDATE VALID PROFILE WITH BETTER DATA
-- ============================================================================

-- Update the Test Facility profile (valid membership) with better data
-- from the orphaned Top of the World Ranch profile
UPDATE user_profiles 
SET 
  display_name = 'James Sherlock Cybercade',
  bio = 'I''m an entrepreneur in recovery',
  updated_at = NOW()
WHERE id = 'e04e4a6b-c740-4762-b786-3157226857e7'
  AND user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f'
  AND tenant_id = 'be29951e-1afa-45cc-8b99-bfa95296c3a8';

-- Verify update
SELECT 
  'PROFILE UPDATED' as status,
  id,
  user_id,
  tenant_id,
  display_name,
  bio,
  updated_at
FROM user_profiles 
WHERE id = 'e04e4a6b-c740-4762-b786-3157226857e7';

-- ============================================================================
-- STEP 3: DELETE ORPHANED PROFILE
-- ============================================================================

-- Delete the orphaned Top of the World Ranch profile
-- (no matching tenant_members record)
DELETE FROM user_profiles 
WHERE id = '9f9b60ad-2ec5-41f5-ad56-42af83404db4'
  AND user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f'
  AND tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d';

-- Verify deletion (should return 0 rows)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'ORPHANED PROFILE DELETED SUCCESSFULLY'
    ELSE 'ERROR: ORPHANED PROFILE STILL EXISTS'
  END as status,
  COUNT(*) as remaining_orphaned_profiles
FROM user_profiles 
WHERE id = '9f9b60ad-2ec5-41f5-ad56-42af83404db4';

-- ============================================================================
-- STEP 4: VERIFY FINAL STATE
-- ============================================================================

-- Verify user now has exactly 1 profile with matching tenant membership
SELECT 
  'FINAL STATE VERIFICATION' as check_type,
  up.id as profile_id,
  up.user_id,
  au.email,
  up.tenant_id,
  t.name as tenant_name,
  up.display_name,
  up.bio,
  tm.role as tenant_role,
  CASE 
    WHEN tm.user_id IS NOT NULL THEN 'YES' 
    ELSE 'NO' 
  END as has_tenant_membership,
  up.created_at as profile_created,
  tm.created_at as membership_created
FROM user_profiles up
LEFT JOIN tenants t ON up.tenant_id = t.id
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';

-- Expected result:
-- - Exactly 1 row
-- - tenant_name: "Test Facility"
-- - display_name: "James Sherlock Cybercade"
-- - bio: "I'm an entrepreneur in recovery"
-- - has_tenant_membership: "YES"
-- - tenant_role: "ADMIN"

-- ============================================================================
-- STEP 5: GLOBAL VERIFICATION - CHECK FOR ANY OTHER ORPHANED PROFILES
-- ============================================================================

-- Check if there are any other orphaned profiles in the system
SELECT 
  'GLOBAL ORPHAN CHECK' as check_type,
  COUNT(*) as total_orphaned_profiles,
  ARRAY_AGG(up.id) as orphaned_profile_ids
FROM user_profiles up
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id
WHERE up.tenant_id IS NOT NULL 
  AND tm.user_id IS NULL;

-- Expected result: total_orphaned_profiles = 0

-- If orphans found, show details
SELECT 
  'ORPHANED PROFILES DETAILS' as report_type,
  up.id as profile_id,
  up.user_id,
  au.email,
  up.tenant_id,
  t.name as tenant_name,
  up.display_name,
  up.created_at
FROM user_profiles up
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id
LEFT JOIN auth.users au ON up.user_id = au.id
LEFT JOIN tenants t ON up.tenant_id = t.id
WHERE up.tenant_id IS NOT NULL 
  AND tm.user_id IS NULL
ORDER BY up.created_at DESC;

-- ============================================================================
-- STEP 6: SUMMARY STATISTICS
-- ============================================================================

SELECT 
  'CLEANUP SUMMARY' as report_type,
  (SELECT COUNT(DISTINCT user_id) FROM user_profiles) as total_users,
  (SELECT COUNT(*) FROM tenant_members) as total_tenant_memberships,
  (SELECT COUNT(*) FROM user_profiles WHERE tenant_id IS NOT NULL) as tenant_profiles,
  (SELECT COUNT(*) FROM user_profiles WHERE tenant_id IS NULL) as solo_profiles,
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  (SELECT COUNT(*) FROM user_profiles up 
   LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND up.tenant_id = tm.tenant_id 
   WHERE up.tenant_id IS NOT NULL AND tm.user_id IS NULL) as orphaned_profiles;

-- Expected result:
-- - total_users: 7
-- - total_tenant_memberships: 7
-- - tenant_profiles: 7 (was 8 before cleanup)
-- - solo_profiles: 0
-- - total_tenants: 2
-- - orphaned_profiles: 0 (was 1 before cleanup)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- ============================================================================

-- If something goes wrong, run these commands to restore from backup:
/*
-- Delete current profiles for this user
DELETE FROM user_profiles 
WHERE user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';

-- Restore from backup
INSERT INTO user_profiles 
SELECT * FROM user_profiles_backup_20251007;

-- Verify restoration
SELECT * FROM user_profiles 
WHERE user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f'
ORDER BY created_at;
*/

-- ============================================================================
-- CLEANUP BACKUP TABLE (OPTIONAL - AFTER CONFIRMING SUCCESS)
-- ============================================================================

-- After confirming cleanup was successful, optionally drop the backup table:
-- DROP TABLE IF EXISTS user_profiles_backup_20251007;

-- ============================================================================
-- END OF CLEANUP SCRIPT
-- ============================================================================

