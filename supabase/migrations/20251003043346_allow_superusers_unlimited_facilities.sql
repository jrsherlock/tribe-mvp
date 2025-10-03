-- Migration: Allow SuperUsers to create unlimited facilities
-- Description:
--   Updates the create_tenant() function to allow SuperUsers to create multiple facilities
--   while maintaining the single-facility restriction for regular users.
--   This enables SuperUsers to onboard new customers without being blocked.
-- Date: 2025-10-03
--
-- Business Logic:
--   - Regular users: Limited to ONE facility (existing behavior)
--   - SuperUsers: Can create UNLIMITED facilities (new behavior for customer onboarding)

-- ============================================================================
-- UPDATE create_tenant() FUNCTION - ALLOW SUPERUSERS UNLIMITED FACILITIES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_tenant(p_name text, p_slug text)
RETURNS tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant tenants;
  existing_membership tenant_members;
  is_super_user boolean;
BEGIN
  -- Check if current user is a SuperUser
  -- SuperUsers can create unlimited facilities for customer onboarding
  SELECT app.is_superuser() INTO is_super_user;

  -- Only enforce single-facility restriction for regular users
  -- SuperUsers bypass this check
  IF NOT is_super_user THEN
    -- Check if regular user already has a tenant membership
    SELECT * INTO existing_membership
    FROM tenant_members
    WHERE user_id = auth.uid();

    IF FOUND THEN
      RAISE EXCEPTION 'You already belong to a facility. Each user can only create or belong to one facility at a time.'
        USING
          HINT = 'If you need to switch facilities, please contact your administrator.',
          ERRCODE = 'P0001';  -- Custom error code for application to catch
    END IF;
  END IF;

  -- Insert new tenant record
  -- Both SuperUsers and regular users can reach this point
  INSERT INTO tenants(name, slug)
  VALUES (p_name, p_slug)
  RETURNING * INTO new_tenant;

  -- Assign caller as OWNER in tenant_members
  -- SuperUsers will have multiple OWNER memberships (one per facility they create)
  -- Regular users will have exactly one OWNER membership
  INSERT INTO tenant_members(user_id, tenant_id, role)
  VALUES (auth.uid(), new_tenant.id, 'OWNER');

  RETURN new_tenant;
END $$;

-- Update function comment to reflect new behavior
COMMENT ON FUNCTION public.create_tenant(text, text) IS
'Creates a new tenant (facility) and assigns the calling user as OWNER.
Uses SECURITY DEFINER to bypass RLS policies on tenants table.

Access Control:
- SuperUsers: Can create unlimited facilities (for customer onboarding)
- Regular users: Limited to one facility (enforced via single-tenant-per-user check)

Raises exception if regular user already has a tenant membership.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================
-- Run these queries in the Supabase SQL Editor to verify the fix:
--
-- -- Test 1: Check if is_superuser() function is accessible
-- SELECT app.is_superuser();
-- -- Expected: TRUE if you are a SuperUser, FALSE otherwise
--
-- -- Test 2: Verify create_tenant() function was updated
-- SELECT prosrc FROM pg_proc WHERE proname = 'create_tenant';
-- -- Expected: Should show the updated function with SuperUser check
--
-- -- Test 3: Test facility creation as SuperUser (should succeed even with existing membership)
-- SELECT public.create_tenant('Test Facility 2', 'test-facility-2');
-- -- Expected: Success for SuperUsers, creates new facility
--
-- -- Test 4: Check SuperUser's tenant memberships (should show multiple)
-- SELECT tm.*, t.name as tenant_name
-- FROM tenant_members tm
-- JOIN tenants t ON tm.tenant_id = t.id
-- WHERE tm.user_id = auth.uid();
-- -- Expected: SuperUsers should see multiple tenant memberships
--
-- -- Test 5: Test facility creation as regular user with existing membership
-- -- (Run as a non-SuperUser who already has a facility)
-- SELECT public.create_tenant('Another Facility', 'another-facility');
-- -- Expected: Error "You already belong to a facility..."
