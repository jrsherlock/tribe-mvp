-- ============================================
-- Delete Test Users with Repeating-Digit UIDs
-- Date: 2025-01-07
-- Database: sangha-mvp-dev
-- ============================================

-- SAFETY CHECK: Verify these are the correct users before deletion
-- Run this query first to confirm:

SELECT 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  up.display_name,
  up.tenant_id,
  (SELECT COUNT(*) FROM group_memberships WHERE user_id = au.id) as group_count,
  (SELECT COUNT(*) FROM daily_checkins WHERE user_id = au.id) as checkin_count,
  (SELECT COUNT(*) FROM tenant_members WHERE user_id = au.id) as tenant_member_count
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE au.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
)
ORDER BY au.email;

-- Expected output:
-- 5 users with @example.com emails
-- All created on 2025-10-03
-- None have ever signed in (last_sign_in_at = NULL)
-- 4 have 1 group membership each
-- 0 check-ins, 0 tenant memberships

-- ============================================
-- DELETION SCRIPT
-- ============================================

-- This will CASCADE delete:
-- - 5 records from auth.users
-- - 5 records from user_profiles (CASCADE via user_id FK)
-- - 4 records from group_memberships (CASCADE via user_id FK)
-- - 0 records from daily_checkins (none exist)
-- - 0 records from tenant_members (none exist)

BEGIN;

-- Delete the 5 test users
-- CASCADE will automatically delete related records
DELETE FROM auth.users 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',  -- sarah.johnson@example.com
  '22222222-2222-2222-2222-222222222222',  -- michael.chen@example.com
  '33333333-3333-3333-3333-333333333333',  -- emily.r@example.com
  '44444444-4444-4444-4444-444444444444',  -- david.t@example.com
  '55555555-5555-5555-5555-555555555555'   -- lisa.m@example.com
);

-- Verify deletion
SELECT 
  'Deleted ' || COUNT(*) || ' test users' as result
FROM auth.users
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
-- Expected: "Deleted 0 test users" (because they were just deleted)

-- Verify remaining users
SELECT 
  COUNT(*) as remaining_users,
  COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as active_users,
  COUNT(CASE WHEN last_sign_in_at IS NULL THEN 1 END) as never_signed_in
FROM auth.users;
-- Expected: 7 remaining users (12 - 5 = 7)

COMMIT;

-- ============================================
-- POST-DELETION VERIFICATION
-- ============================================

-- Check that all test users are gone
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All test users deleted successfully'
    ELSE '❌ ERROR: ' || COUNT(*) || ' test users still exist'
  END as status
FROM auth.users
WHERE id::text ~ '^(1{8}-1{4}-1{4}-1{4}-1{12}|2{8}-2{4}-2{4}-2{4}-2{12}|3{8}-3{4}-3{4}-3{4}-3{12}|4{8}-4{4}-4{4}-4{4}-4{12}|5{8}-5{4}-5{4}-5{4}-5{12})$';

-- Check that profiles were CASCADE deleted
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All test user profiles deleted successfully'
    ELSE '❌ ERROR: ' || COUNT(*) || ' orphaned profiles still exist'
  END as status
FROM user_profiles
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- Check that group memberships were CASCADE deleted
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All test user group memberships deleted successfully'
    ELSE '❌ ERROR: ' || COUNT(*) || ' orphaned group memberships still exist'
  END as status
FROM group_memberships
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- Final summary
SELECT 
  'Remaining users: ' || COUNT(*) as summary
FROM auth.users;
-- Expected: "Remaining users: 7"

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- If you need to undo the deletion, run:
-- ROLLBACK;

-- Note: You can only rollback if you haven't committed yet.
-- Once committed, the deletion is permanent.

-- ============================================
-- NOTES
-- ============================================

-- 1. This script uses a transaction (BEGIN/COMMIT) for safety
-- 2. You can review all changes before committing
-- 3. If anything looks wrong, run ROLLBACK instead of COMMIT
-- 4. CASCADE deletes are automatic - you don't need to manually delete from other tables
-- 5. The foreign key constraints ensure data integrity

-- ============================================
-- ALTERNATIVE: Delete via Supabase Dashboard
-- ============================================

-- If you prefer a GUI approach:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Search for "@example.com"
-- 3. Select the 5 users:
--    - sarah.johnson@example.com
--    - michael.chen@example.com
--    - emily.r@example.com
--    - david.t@example.com
--    - lisa.m@example.com
-- 4. Click "Delete users" button
-- 5. Confirm deletion
-- 
-- The dashboard will handle the CASCADE deletes automatically.

