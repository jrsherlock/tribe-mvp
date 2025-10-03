-- Migration: Create tenant RPC function
-- Description: Creates the create_tenant() RPC function to handle facility creation
--              with proper RLS bypass and automatic OWNER membership assignment.
--              This function uses SECURITY DEFINER to bypass RLS policies and ensure
--              both tenant and tenant_members records are created atomically.
-- Date: 2025-10-03

-- ============================================================================
-- CREATE_TENANT() RPC FUNCTION
-- ============================================================================
-- Purpose: Create a new tenant (facility) and assign the caller as OWNER
-- Security: SECURITY DEFINER allows bypassing RLS to insert into tenants table
-- Access: Granted to authenticated users (any logged-in user can create a facility)

CREATE OR REPLACE FUNCTION public.create_tenant(p_name text, p_slug text)
RETURNS tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant tenants;
BEGIN
  -- Insert new tenant record
  INSERT INTO tenants(name, slug)
  VALUES (p_name, p_slug)
  RETURNING * INTO new_tenant;

  -- Assign caller as OWNER in tenant_members
  -- Note: The unique constraint on user_id ensures single-tenant-per-user
  -- If user already has a membership, this will fail with a unique constraint violation
  -- which is the desired behavior (users can only belong to one tenant)
  INSERT INTO tenant_members(user_id, tenant_id, role)
  VALUES (auth.uid(), new_tenant.id, 'OWNER');

  RETURN new_tenant;
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_tenant(text, text) TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.create_tenant(text, text) IS
'Creates a new tenant (facility) and assigns the calling user as OWNER.
Uses SECURITY DEFINER to bypass RLS policies on tenants table.
Enforces single-tenant-per-user constraint via unique index on tenant_members.user_id.';
