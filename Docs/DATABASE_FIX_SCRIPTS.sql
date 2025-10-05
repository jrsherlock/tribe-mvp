-- ============================================================================
-- DATABASE FIX SCRIPTS - Sangha MVP Dev
-- ============================================================================
-- Database: sangha-mvp-dev (ID: ohlscdojhsifvnnkoiqi)
-- Date: October 3, 2025
-- Purpose: Fix critical issues identified in database report
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ISSUE #1: No groups exist in active tenant
-- ----------------------------------------------------------------------------
-- Problem: User 7c1051b5-3e92-4215-8623-763f7fb627c7 is in tenant 
--          a77d4b1b-7e8d-48e2-b509-b305c5615f4d but there are no groups
-- Solution: Create a default group

INSERT INTO groups (tenant_id, name, description)
VALUES (
  'a77d4b1b-7e8d-48e2-b509-b305c5615f4d',
  'Default Group',
  'Default group for all facility members'
);

-- Get the newly created group ID (you'll need this for the next step)
-- SELECT id FROM groups WHERE tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d' AND name = 'Default Group';

-- ----------------------------------------------------------------------------
-- ISSUE #2: User is not assigned to any groups
-- ----------------------------------------------------------------------------
-- Problem: User 7c1051b5-3e92-4215-8623-763f7fb627c7 has no group memberships
-- Solution: Assign user to the default group
-- NOTE: Replace <GROUP_ID> with the actual group ID from the previous query

INSERT INTO group_memberships (user_id, group_id, role)
VALUES (
  '7c1051b5-3e92-4215-8623-763f7fb627c7',
  '<GROUP_ID>',  -- Replace with actual group ID
  'ADMIN'
);

-- Alternative: If you want to use a subquery (PostgreSQL)
INSERT INTO group_memberships (user_id, group_id, role)
SELECT 
  '7c1051b5-3e92-4215-8623-763f7fb627c7',
  id,
  'ADMIN'
FROM groups
WHERE tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d'
AND name = 'Default Group'
LIMIT 1;

-- ----------------------------------------------------------------------------
-- ISSUE #3: Historical check-ins without tenant assignment
-- ----------------------------------------------------------------------------
-- Problem: User has 2 check-ins from before tenant assignment (tenant_id = NULL)
-- Solution: Migrate old check-ins to current tenant
-- NOTE: Only run this if you want to associate old check-ins with the tenant

UPDATE daily_checkins
SET tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d'
WHERE user_id = '7c1051b5-3e92-4215-8623-763f7fb627c7'
AND tenant_id IS NULL;

-- Verify the update
SELECT id, user_id, tenant_id, checkin_date, created_at
FROM daily_checkins
WHERE user_id = '7c1051b5-3e92-4215-8623-763f7fb627c7'
ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- ISSUE #4: Duplicate tenant names
-- ----------------------------------------------------------------------------
-- Problem: Two tenants named "Top of the World Ranch" with different slugs
-- Tenant 1: 3b2f18c9-761a-4d8c-b033-0b3afe1e3460 (totw-ranch) - 0 users, 2 groups
-- Tenant 2: a77d4b1b-7e8d-48e2-b509-b305c5615f4d (top-of-the-world-ranch) - 1 user, 0 groups
-- Solution: Delete the older duplicate tenant (totw-ranch) if not needed

-- OPTION A: Delete the duplicate tenant (totw-ranch)
-- WARNING: This will also delete associated groups (Matterdaddies, Summer 2022)
-- Only run this if you're sure you don't need this tenant

-- First, delete groups in the tenant (due to foreign key constraints)
DELETE FROM groups WHERE tenant_id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';

-- Then delete the tenant
DELETE FROM tenants WHERE id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';

-- OPTION B: Rename the duplicate tenant instead of deleting
UPDATE tenants
SET name = 'Top of the World Ranch (Old)',
    slug = 'totw-ranch-old'
WHERE id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';

-- ----------------------------------------------------------------------------
-- ISSUE #5: Orphaned tenant with no users (Demo Facility)
-- ----------------------------------------------------------------------------
-- Problem: Tenant be29951e-1afa-45cc-8b99-bfa95296c3a8 has 0 users
-- Solution: Delete if not needed

-- OPTION A: Delete the orphaned tenant
-- WARNING: This will also delete associated groups (Knuckleheads)

-- First, delete groups in the tenant
DELETE FROM groups WHERE tenant_id = 'be29951e-1afa-45cc-8b99-bfa95296c3a8';

-- Then delete the tenant
DELETE FROM tenants WHERE id = 'be29951e-1afa-45cc-8b99-bfa95296c3a8';

-- OPTION B: Keep the tenant for future use (no action needed)

-- ----------------------------------------------------------------------------
-- ISSUE #6: Solo user with no tenant assignment
-- ----------------------------------------------------------------------------
-- Problem: User ef8d2a46-a1d8-43d9-988e-501d43964c3f has no tenant
-- Solution: Assign to a tenant OR confirm solo mode is intentional

-- OPTION A: Assign user to the active tenant
INSERT INTO tenant_members (user_id, tenant_id, role)
VALUES (
  'ef8d2a46-a1d8-43d9-988e-501d43964c3f',
  'a77d4b1b-7e8d-48e2-b509-b305c5615f4d',
  'MEMBER'
);

-- Also update the user_profiles table to set tenant_id
UPDATE user_profiles
SET tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d'
WHERE user_id = 'ef8d2a46-a1d8-43d9-988e-501d43964c3f';

-- OPTION B: Keep user in solo mode (no action needed)

-- ----------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- ----------------------------------------------------------------------------

-- Verify tenant structure
SELECT 
  t.id,
  t.name,
  t.slug,
  COUNT(DISTINCT tm.user_id) as user_count,
  COUNT(DISTINCT g.id) as group_count
FROM tenants t
LEFT JOIN tenant_members tm ON t.id = tm.tenant_id
LEFT JOIN groups g ON t.id = g.tenant_id
GROUP BY t.id, t.name, t.slug
ORDER BY t.created_at;

-- Verify group memberships
SELECT 
  g.name as group_name,
  t.name as tenant_name,
  COUNT(gm.user_id) as member_count
FROM groups g
LEFT JOIN tenants t ON g.tenant_id = t.id
LEFT JOIN group_memberships gm ON g.id = gm.group_id
GROUP BY g.id, g.name, t.name
ORDER BY t.name, g.name;

-- Verify user assignments
SELECT 
  up.display_name,
  up.email,
  t.name as tenant_name,
  tm.role as tenant_role,
  CASE WHEN su.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as is_superuser,
  STRING_AGG(g.name, ', ') as groups
FROM user_profiles up
LEFT JOIN tenants t ON up.tenant_id = t.id
LEFT JOIN tenant_members tm ON up.user_id = tm.user_id AND tm.tenant_id = t.id
LEFT JOIN superusers su ON up.user_id = su.user_id
LEFT JOIN group_memberships gm ON up.user_id = gm.user_id
LEFT JOIN groups g ON gm.group_id = g.id
GROUP BY up.user_id, up.display_name, up.email, t.name, tm.role, su.user_id
ORDER BY up.created_at;

-- Verify check-ins are properly associated
SELECT 
  up.display_name,
  t.name as tenant_name,
  dc.checkin_date,
  dc.is_private,
  dc.created_at
FROM daily_checkins dc
LEFT JOIN user_profiles up ON dc.user_id = up.user_id
LEFT JOIN tenants t ON dc.tenant_id = t.id
ORDER BY dc.created_at DESC;

-- ----------------------------------------------------------------------------
-- RECOMMENDED EXECUTION ORDER
-- ----------------------------------------------------------------------------
-- 1. Create default group in active tenant (ISSUE #1)
-- 2. Assign user to default group (ISSUE #2)
-- 3. Migrate historical check-ins (ISSUE #3) - OPTIONAL
-- 4. Handle duplicate tenant (ISSUE #4) - Choose OPTION A or B
-- 5. Handle orphaned tenant (ISSUE #5) - Choose OPTION A or B
-- 6. Handle solo user (ISSUE #6) - Choose OPTION A or B
-- 7. Run verification queries to confirm fixes

-- ----------------------------------------------------------------------------
-- MINIMAL FIX (Just to make "Today's Check-ins" work)
-- ----------------------------------------------------------------------------
-- If you just want to fix the immediate issue with "Today's Check-ins",
-- run these two commands:

-- 1. Create a default group
INSERT INTO groups (tenant_id, name, description)
VALUES (
  'a77d4b1b-7e8d-48e2-b509-b305c5615f4d',
  'Default Group',
  'Default group for all facility members'
);

-- 2. Assign user to the group
INSERT INTO group_memberships (user_id, group_id, role)
SELECT 
  '7c1051b5-3e92-4215-8623-763f7fb627c7',
  id,
  'ADMIN'
FROM groups
WHERE tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d'
AND name = 'Default Group'
LIMIT 1;

-- That's it! Now the "Today's Check-ins" feature should work.
-- The user will see their own check-ins from other group members
-- (once other users are added to the same group).

-- ============================================================================
-- END OF FIX SCRIPTS
-- ============================================================================

