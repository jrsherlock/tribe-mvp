-- Migration: Fix facility and group creation errors
-- Description:
--   1. Update create_tenant() function to provide clear error when user already has a tenant
--   2. Fix groups table RLS policies to reference 'tenant_members' instead of 'memberships'
-- Date: 2025-10-03
--
-- Root Causes:
--   Error 1 (23505): User already has tenant membership, but error message is unclear
--   Error 2 (42501): Groups RLS policies reference non-existent 'memberships' table

-- ============================================================================
-- PART 1: FIX FACILITY CREATION - UPDATE create_tenant() FUNCTION
-- ============================================================================
-- Problem: User gets cryptic "duplicate key" error when trying to create second facility
-- Solution: Check for existing membership and provide clear, user-friendly error message

CREATE OR REPLACE FUNCTION public.create_tenant(p_name text, p_slug text)
RETURNS tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant tenants;
  existing_membership tenant_members;
BEGIN
  -- Check if user already has a tenant membership
  SELECT * INTO existing_membership
  FROM tenant_members
  WHERE user_id = auth.uid();

  IF FOUND THEN
    RAISE EXCEPTION 'You already belong to a facility. Each user can only create or belong to one facility at a time.'
      USING
        HINT = 'If you need to switch facilities, please contact your administrator.',
        ERRCODE = 'P0001';  -- Custom error code for application to catch
  END IF;

  -- Insert new tenant record
  INSERT INTO tenants(name, slug)
  VALUES (p_name, p_slug)
  RETURNING * INTO new_tenant;

  -- Assign caller as OWNER in tenant_members
  INSERT INTO tenant_members(user_id, tenant_id, role)
  VALUES (auth.uid(), new_tenant.id, 'OWNER');

  RETURN new_tenant;
END $$;

-- Update function comment
COMMENT ON FUNCTION public.create_tenant(text, text) IS
'Creates a new tenant (facility) and assigns the calling user as OWNER.
Uses SECURITY DEFINER to bypass RLS policies on tenants table.
Enforces single-tenant-per-user constraint with clear error message.
Raises exception if user already has a tenant membership.';

-- ============================================================================
-- PART 2: FIX GROUP CREATION - UPDATE RLS POLICIES ON GROUPS TABLE
-- ============================================================================
-- Problem: RLS policies reference old 'memberships' table instead of 'tenant_members'
-- Solution: Drop old policies and recreate with correct table name

-- Drop old policies that reference 'memberships' table
DROP POLICY IF EXISTS "Tenant members can view groups" ON groups;
DROP POLICY IF EXISTS "Admins can manage groups in their tenant" ON groups;
DROP POLICY IF EXISTS "Admins can create groups" ON groups;

-- Policy 1: Allow tenant members to view groups in their tenant
CREATE POLICY groups_select_for_tenant_members ON groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = groups.tenant_id
    )
  );

-- Policy 2: Allow tenant OWNER/ADMIN to create groups in their tenant
CREATE POLICY groups_insert_for_admins ON groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = groups.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- Policy 3: Allow tenant OWNER/ADMIN to update groups in their tenant
CREATE POLICY groups_update_for_admins ON groups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = groups.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = groups.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- Policy 4: Allow tenant OWNER/ADMIN to delete groups in their tenant
CREATE POLICY groups_delete_for_admins ON groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = groups.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================
-- Run these queries in the Supabase SQL Editor to verify the fixes:
--
-- -- Test 1: Verify create_tenant() rejects duplicate creation
-- SELECT public.create_tenant('Test Facility', 'test-facility');
-- -- Expected: Error message "You already belong to a facility..."
--
-- -- Test 2: Verify groups RLS policies were recreated
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'groups' ORDER BY policyname;
-- -- Expected: 4 policies (select, insert, update, delete)
--
-- -- Test 3: Test group creation as tenant OWNER/ADMIN
-- INSERT INTO groups (tenant_id, name) VALUES ('<your-tenant-id>', 'Test Group');
-- -- Expected: Success (if you are OWNER/ADMIN of the tenant)
--
-- -- Test 4: Test group creation as non-admin
-- -- (Run as a user who is not OWNER/ADMIN)
-- INSERT INTO groups (tenant_id, name) VALUES ('<tenant-id>', 'Test Group');
-- -- Expected: RLS policy violation error
