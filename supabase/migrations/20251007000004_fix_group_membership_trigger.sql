-- Migration: Fix group membership tenant validation trigger
-- Description: Updates enforce_group_membership_tenant_match() function to reference
--              'tenant_members' instead of obsolete 'memberships' table.
--              This trigger ensures users can only join groups within their assigned facility.
-- Date: 2025-10-07
--
-- Root Cause: The trigger function was referencing the old 'memberships' table name
--             instead of 'tenant_members', causing it to fail silently and not enforce
--             the facility-first rule. This allowed users to be assigned to groups
--             without first being assigned to a facility.
--
-- Impact: CRITICAL - This is a data integrity issue that violates the multi-tenant
--         architecture rule: tenants → groups → users

-- ============================================================================
-- FIX THE TRIGGER FUNCTION
-- ============================================================================

-- Drop and recreate the function with correct table name
CREATE OR REPLACE FUNCTION enforce_group_membership_tenant_match()
RETURNS TRIGGER AS $$
DECLARE
  grp_tenant UUID;
  usr_tenant UUID;
BEGIN
  -- Get the tenant_id of the group
  SELECT tenant_id INTO grp_tenant FROM groups WHERE id = NEW.group_id;

  -- Get the tenant_id of the user from tenant_members (FIXED: was 'memberships')
  SELECT tenant_id INTO usr_tenant FROM tenant_members WHERE user_id = NEW.user_id;

  -- Validate group exists and has a tenant
  IF grp_tenant IS NULL THEN
    RAISE EXCEPTION 'Group % not found or has no tenant', NEW.group_id;
  END IF;

  -- Validate user is assigned to a facility
  IF usr_tenant IS NULL THEN
    -- Solo user trying to join a tenant group - NOT ALLOWED
    RAISE EXCEPTION 'User % is not assigned to a facility; cannot join facility groups. Please assign user to facility first.', NEW.user_id;
  END IF;

  -- Validate user's facility matches group's facility
  IF grp_tenant <> usr_tenant THEN
    RAISE EXCEPTION 'Facility mismatch: User belongs to facility % but group belongs to facility %', usr_tenant, grp_tenant;
  END IF;

  -- All validations passed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION enforce_group_membership_tenant_match() IS
'Validates that users can only join groups within their assigned facility.
Enforces the multi-tenant hierarchy: tenants → groups → users.
Raises exception if:
  1. Group does not exist or has no tenant
  2. User is not assigned to any facility (solo user)
  3. User''s facility does not match group''s facility';

-- ============================================================================
-- ALSO FIX THE DAILY CHECKIN TRIGGER (same issue)
-- ============================================================================

-- This trigger also references the old 'memberships' table
CREATE OR REPLACE FUNCTION set_daily_checkin_tenant()
RETURNS TRIGGER AS $$
DECLARE
  usr_tenant UUID;
BEGIN
  -- Get user's tenant from tenant_members (FIXED: was 'memberships')
  SELECT tenant_id INTO usr_tenant FROM tenant_members WHERE user_id = NEW.user_id;

  IF usr_tenant IS NULL THEN
    -- Solo user: ensure tenant_id is NULL
    NEW.tenant_id := NULL;
  ELSE
    -- Facility user: set tenant_id to user's facility
    NEW.tenant_id := usr_tenant;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION set_daily_checkin_tenant() IS
'Automatically sets the tenant_id on daily check-ins based on user''s facility membership.
Solo users (not in any facility) get NULL tenant_id.
Facility users get their facility''s tenant_id.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================
-- Run these queries in the Supabase SQL Editor to verify the fix:
--
-- -- Test 1: Verify trigger function was updated
-- SELECT prosrc FROM pg_proc WHERE proname = 'enforce_group_membership_tenant_match';
-- -- Expected: Should see 'tenant_members' not 'memberships'
--
-- -- Test 2: Try to add user to group without facility assignment (should fail)
-- INSERT INTO group_memberships (user_id, group_id, role)
-- VALUES ('<user-id-without-facility>', '<group-id>', 'MEMBER');
-- -- Expected: ERROR - User is not assigned to a facility
--
-- -- Test 3: Find orphaned group memberships (users in groups without facility)
-- SELECT 
--   gm.user_id,
--   gm.group_id,
--   g.name as group_name,
--   g.tenant_id as group_facility_id,
--   tm.tenant_id as user_facility_id
-- FROM group_memberships gm
-- JOIN groups g ON g.id = gm.group_id
-- LEFT JOIN tenant_members tm ON tm.user_id = gm.user_id
-- WHERE tm.tenant_id IS NULL OR tm.tenant_id <> g.tenant_id;
-- -- Expected: Shows data integrity violations that need to be fixed

