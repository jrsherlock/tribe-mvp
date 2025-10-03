-- Migration: Add RLS policies for tenant_members, tenants, and superusers tables
-- Description: Implements row-level security policies to control access to tenant membership,
--              tenant data, and superuser status based on user roles and authentication.
-- Date: 2025-10-02

-- ============================================================================
-- TENANT_MEMBERS TABLE POLICIES
-- ============================================================================
-- Purpose: Control access to tenant membership data
-- Rules:
--   - Users can read their own membership
--   - Tenant OWNER/ADMIN can read all members in their tenant
--   - Tenant OWNER/ADMIN can manage (insert/update/delete) members in their tenant

-- Policy: Allow users to read their own membership
CREATE POLICY tenant_members_read_own ON public.tenant_members
  FOR SELECT
  USING (tenant_members.user_id = auth.uid());

-- Policy: Allow tenant OWNER/ADMIN to read all members in their tenant
CREATE POLICY tenant_members_read_for_admins ON public.tenant_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members me
      WHERE me.user_id = auth.uid()
        AND me.tenant_id = tenant_members.tenant_id
        AND me.role IN ('OWNER', 'ADMIN')
    )
  );

-- Policy: Allow tenant OWNER/ADMIN to manage members in their tenant
CREATE POLICY tenant_members_admin_write ON public.tenant_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members me
      WHERE me.user_id = auth.uid()
        AND me.tenant_id = tenant_members.tenant_id
        AND me.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenant_members me
      WHERE me.user_id = auth.uid()
        AND me.tenant_id = tenant_members.tenant_id
        AND me.role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================
-- Purpose: Control access to tenant (facility) data
-- Rules:
--   - Members of a tenant can read that tenant's data
--   - Tenant OWNER/ADMIN can update/delete their tenant
--   - Superusers can create new tenants (via RPC, not direct INSERT)

-- Policy: Allow members to read their tenant
CREATE POLICY tenants_read_for_members ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenants.id
    )
  );

-- Policy: Allow tenant OWNER/ADMIN to update their tenant
CREATE POLICY tenants_admin_update ON public.tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenants.id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenants.id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- Policy: Allow tenant OWNER to delete their tenant
CREATE POLICY tenants_owner_delete ON public.tenants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenants.id
        AND tm.role = 'OWNER'
    )
  );

-- Note: Tenant creation is handled via the create_tenant() RPC function
-- which uses SECURITY DEFINER to bypass RLS and enforce superuser-only access

-- ============================================================================
-- SUPERUSERS TABLE POLICIES
-- ============================================================================
-- Purpose: Control access to superuser status data
-- Rules:
--   - Users can read their own superuser status (for client-side checks)
--   - Only superusers can manage superuser records (via service role or RPC)

-- Policy: Allow users to check if they are a superuser
CREATE POLICY superusers_self_select ON public.superusers
  FOR SELECT
  USING (superusers.user_id = auth.uid());

-- Note: INSERT/UPDATE/DELETE for superusers should be done via service role
-- or a SECURITY DEFINER function to prevent privilege escalation

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================
-- Run these queries in the Supabase SQL Editor to verify policies were created:
--
-- -- List all policies on tenant_members
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'tenant_members';
--
-- -- List all policies on tenants
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'tenants';
--
-- -- List all policies on superusers
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'superusers';
--
-- -- Verify RLS is enabled on all three tables
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('tenant_members', 'tenants', 'superusers')
--   AND schemaname = 'public';
