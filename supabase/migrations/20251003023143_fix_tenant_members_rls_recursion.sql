-- Migration: Fix infinite recursion in tenant_members RLS policies
-- Description: Replaces recursive policies with SECURITY DEFINER helper functions
--              to break the circular dependency when checking admin/owner status.
--              PostgreSQL error 42P17 occurs when a policy on tenant_members
--              queries tenant_members in its USING clause.
-- Date: 2025-10-03

-- ============================================================================
-- STEP 1: DROP EXISTING RECURSIVE POLICIES
-- ============================================================================

-- Drop the policies that cause infinite recursion
DROP POLICY IF EXISTS tenant_members_read_for_admins ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_admin_write ON public.tenant_members;

-- ============================================================================
-- STEP 2: CREATE SECURITY DEFINER HELPER FUNCTION
-- ============================================================================
-- Purpose: Check if the current user is an OWNER or ADMIN in a specific tenant
-- Security: SECURITY DEFINER bypasses RLS to query tenant_members without recursion
-- Returns: TRUE if user is OWNER/ADMIN in the tenant, FALSE otherwise

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user has OWNER or ADMIN role in the specified tenant
  RETURN EXISTS (
    SELECT 1
    FROM public.tenant_members
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role IN ('OWNER', 'ADMIN')
  );
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO authenticated;

-- ============================================================================
-- STEP 3: RECREATE POLICIES WITHOUT RECURSION
-- ============================================================================

-- Policy: Allow tenant OWNER/ADMIN to read all members in their tenant
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY tenant_members_read_for_admins ON public.tenant_members
  FOR SELECT
  USING (
    public.is_tenant_admin(tenant_members.tenant_id)
  );

-- Policy: Allow tenant OWNER/ADMIN to manage members in their tenant
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY tenant_members_admin_write ON public.tenant_members
  FOR ALL
  USING (
    public.is_tenant_admin(tenant_members.tenant_id)
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_members.tenant_id)
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.is_tenant_admin(UUID) IS
'Helper function to check if current user is OWNER or ADMIN in a tenant.
Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.
Called by tenant_members RLS policies to check admin status.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================
-- Run these queries in the Supabase SQL Editor to verify the fix:
--
-- -- Test 1: Check that function exists and works
-- SELECT public.is_tenant_admin('<your-tenant-id>');
-- -- Expected: TRUE if you are OWNER/ADMIN, FALSE otherwise
--
-- -- Test 2: Verify policies were recreated
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'tenant_members'
--   AND policyname IN ('tenant_members_read_for_admins', 'tenant_members_admin_write');
-- -- Expected: 2 rows showing the new policies
--
-- -- Test 3: Test SELECT query (should not cause recursion)
-- SELECT * FROM tenant_members;
-- -- Expected: Returns your own membership without error
