-- Migration: Implement 5-Tier RBAC System
-- Description:
--   Implements comprehensive role-based access control with five distinct roles:
--   1. SuperUser (Platform Administrator) - Global access across all tenants
--   2. Facility Admin (OWNER/ADMIN) - Manages single facility and its groups
--   3. Group Admin - Manages specific group within a facility
--   4. Facility Member - Participates in groups within their facility
--   5. Basic User - Solo mode with no tenant/group access
-- Date: 2025-10-03

-- ============================================================================
-- PART 1: HELPER FUNCTIONS FOR RBAC
-- ============================================================================

-- Function: Check if user is a SuperUser
-- Already exists in app schema, but let's ensure it's accessible
COMMENT ON FUNCTION app.is_superuser() IS
'Returns TRUE if the current user is a SuperUser (platform administrator).
SuperUsers have global access across all tenants and can create new facilities.';

-- Function: Check if user is a Facility Admin (OWNER or ADMIN) for a specific tenant
CREATE OR REPLACE FUNCTION public.is_facility_admin(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is OWNER or ADMIN of the specified tenant
  RETURN EXISTS (
    SELECT 1
    FROM public.tenant_members
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role IN ('OWNER', 'ADMIN')
  );
END $$;

COMMENT ON FUNCTION public.is_facility_admin(UUID) IS
'Returns TRUE if the current user is a Facility Admin (OWNER or ADMIN) of the specified tenant.
Facility Admins can manage their facility, create groups, and invite users.';

-- Function: Check if user is a Group Admin for a specific group
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is ADMIN of the specified group
  RETURN EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE user_id = auth.uid()
      AND group_id = p_group_id
      AND role = 'ADMIN'
  );
END $$;

COMMENT ON FUNCTION public.is_group_admin(UUID) IS
'Returns TRUE if the current user is a Group Admin of the specified group.
Group Admins can manage group memberships and group-specific settings.';

-- Function: Get user's role in a specific tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_role(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user is a SuperUser first
  IF app.is_superuser() THEN
    RETURN 'SUPERUSER';
  END IF;

  -- Get user's role in the specified tenant
  SELECT role INTO user_role
  FROM public.tenant_members
  WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id;

  -- Return role or 'BASIC_USER' if no tenant membership
  RETURN COALESCE(user_role, 'BASIC_USER');
END $$;

COMMENT ON FUNCTION public.get_user_tenant_role(UUID) IS
'Returns the user''s role in the specified tenant.
Possible values: SUPERUSER, OWNER, ADMIN, MEMBER, BASIC_USER';

-- Function: Get user's role in a specific group
CREATE OR REPLACE FUNCTION public.get_user_group_role(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  group_tenant_id UUID;
BEGIN
  -- Check if user is a SuperUser first
  IF app.is_superuser() THEN
    RETURN 'SUPERUSER';
  END IF;

  -- Get the tenant_id for this group
  SELECT tenant_id INTO group_tenant_id
  FROM public.groups
  WHERE id = p_group_id;

  -- Check if user is a Facility Admin of the group's tenant
  IF public.is_facility_admin(group_tenant_id) THEN
    RETURN 'FACILITY_ADMIN';
  END IF;

  -- Get user's role in the specified group
  SELECT role INTO user_role
  FROM public.group_memberships
  WHERE user_id = auth.uid()
    AND group_id = p_group_id;

  -- Return role or NULL if no group membership
  RETURN user_role;
END $$;

COMMENT ON FUNCTION public.get_user_group_role(UUID) IS
'Returns the user''s role in the specified group.
Possible values: SUPERUSER, FACILITY_ADMIN, ADMIN (group admin), MEMBER, or NULL';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_facility_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_group_role(UUID) TO authenticated;

-- ============================================================================
-- PART 2: UPDATE RLS POLICIES FOR TENANTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS tenants_read_for_members ON public.tenants;
DROP POLICY IF EXISTS tenants_admin_update ON public.tenants;
DROP POLICY IF EXISTS tenants_owner_delete ON public.tenants;

-- Policy 1: SELECT - SuperUsers can view all tenants, members can view their own tenant
CREATE POLICY tenants_select ON public.tenants
  FOR SELECT
  USING (
    -- SuperUsers can see all tenants
    app.is_superuser()
    OR
    -- Tenant members can see their own tenant
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenants.id
    )
  );

-- Policy 2: UPDATE - SuperUsers and Facility Admins can update tenant info
CREATE POLICY tenants_update ON public.tenants
  FOR UPDATE
  USING (
    -- SuperUsers can update any tenant
    app.is_superuser()
    OR
    -- Facility Admins (OWNER/ADMIN) can update their own tenant
    public.is_facility_admin(tenants.id)
  )
  WITH CHECK (
    app.is_superuser()
    OR
    public.is_facility_admin(tenants.id)
  );

-- Policy 3: DELETE - Only SuperUsers and Facility OWNERs can delete tenants
CREATE POLICY tenants_delete ON public.tenants
  FOR DELETE
  USING (
    -- SuperUsers can delete any tenant
    app.is_superuser()
    OR
    -- Only OWNER role can delete (not ADMIN)
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenants.id
        AND tm.role = 'OWNER'
    )
  );

-- Note: INSERT is handled by create_tenant() RPC function (SuperUsers only)

-- ============================================================================
-- PART 3: UPDATE RLS POLICIES FOR GROUPS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS groups_select_for_tenant_members ON public.groups;
DROP POLICY IF EXISTS groups_insert_for_admins ON public.groups;
DROP POLICY IF EXISTS groups_update_for_admins ON public.groups;
DROP POLICY IF EXISTS groups_delete_for_admins ON public.groups;

-- Policy 1: SELECT - Tenant members can view groups in their tenant
CREATE POLICY groups_select ON public.groups
  FOR SELECT
  USING (
    -- SuperUsers can see all groups
    app.is_superuser()
    OR
    -- Tenant members can see groups in their tenant
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = groups.tenant_id
    )
  );

-- Policy 2: INSERT - SuperUsers and Facility Admins can create groups
CREATE POLICY groups_insert ON public.groups
  FOR INSERT
  WITH CHECK (
    -- SuperUsers can create groups in any tenant
    app.is_superuser()
    OR
    -- Facility Admins can create groups in their own tenant
    public.is_facility_admin(groups.tenant_id)
  );

-- Policy 3: UPDATE - SuperUsers, Facility Admins, and Group Admins can update groups
CREATE POLICY groups_update ON public.groups
  FOR UPDATE
  USING (
    -- SuperUsers can update any group
    app.is_superuser()
    OR
    -- Facility Admins can update groups in their tenant
    public.is_facility_admin(groups.tenant_id)
    OR
    -- Group Admins can update their own group
    public.is_group_admin(groups.id)
  )
  WITH CHECK (
    app.is_superuser()
    OR
    public.is_facility_admin(groups.tenant_id)
    OR
    public.is_group_admin(groups.id)
  );

-- Policy 4: DELETE - SuperUsers and Facility Admins can delete groups
CREATE POLICY groups_delete ON public.groups
  FOR DELETE
  USING (
    -- SuperUsers can delete any group
    app.is_superuser()
    OR
    -- Facility Admins can delete groups in their tenant
    public.is_facility_admin(groups.tenant_id)
  );

-- ============================================================================
-- PART 4: UPDATE RLS POLICIES FOR GROUP_MEMBERSHIPS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own group memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Admins can manage all group memberships in their tenant" ON public.group_memberships;

-- Policy 1: SELECT - Users can view memberships in their groups
CREATE POLICY group_memberships_select ON public.group_memberships
  FOR SELECT
  USING (
    -- SuperUsers can see all group memberships
    app.is_superuser()
    OR
    -- Users can see their own group memberships
    group_memberships.user_id = auth.uid()
    OR
    -- Facility Admins can see all group memberships in their tenant
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_facility_admin(g.tenant_id)
    )
    OR
    -- Group Admins can see memberships in their group
    public.is_group_admin(group_memberships.group_id)
    OR
    -- Group members can see other members in their group
    EXISTS (
      SELECT 1
      FROM public.group_memberships my_membership
      WHERE my_membership.user_id = auth.uid()
        AND my_membership.group_id = group_memberships.group_id
    )
  );

-- Policy 2: INSERT - SuperUsers, Facility Admins, and Group Admins can add members
CREATE POLICY group_memberships_insert ON public.group_memberships
  FOR INSERT
  WITH CHECK (
    -- SuperUsers can add anyone to any group
    app.is_superuser()
    OR
    -- Facility Admins can add members to groups in their tenant
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_facility_admin(g.tenant_id)
    )
    OR
    -- Group Admins can add members to their group
    public.is_group_admin(group_memberships.group_id)
    OR
    -- Users can join groups themselves (self-service)
    group_memberships.user_id = auth.uid()
  );

-- Policy 3: UPDATE - SuperUsers, Facility Admins, and Group Admins can update roles
CREATE POLICY group_memberships_update ON public.group_memberships
  FOR UPDATE
  USING (
    -- SuperUsers can update any membership
    app.is_superuser()
    OR
    -- Facility Admins can update memberships in their tenant
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_facility_admin(g.tenant_id)
    )
    OR
    -- Group Admins can update memberships in their group
    public.is_group_admin(group_memberships.group_id)
  )
  WITH CHECK (
    app.is_superuser()
    OR
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_facility_admin(g.tenant_id)
    )
    OR
    public.is_group_admin(group_memberships.group_id)
  );

-- Policy 4: DELETE - SuperUsers, Facility Admins, Group Admins, or users themselves
CREATE POLICY group_memberships_delete ON public.group_memberships
  FOR DELETE
  USING (
    -- SuperUsers can remove anyone from any group
    app.is_superuser()
    OR
    -- Facility Admins can remove members from groups in their tenant
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_facility_admin(g.tenant_id)
    )
    OR
    -- Group Admins can remove members from their group
    public.is_group_admin(group_memberships.group_id)
    OR
    -- Users can leave groups themselves
    group_memberships.user_id = auth.uid()
  );

-- ============================================================================
-- PART 5: UPDATE RLS POLICIES FOR TENANT_MEMBERS TABLE
-- ============================================================================

-- Drop existing policies (keep the ones that use is_tenant_admin helper)
DROP POLICY IF EXISTS tenant_members_read_own ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_read_for_admins ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_admin_write ON public.tenant_members;

-- Policy 1: SELECT - Users can view their own membership and admins can view all
CREATE POLICY tenant_members_select ON public.tenant_members
  FOR SELECT
  USING (
    -- SuperUsers can see all tenant memberships
    app.is_superuser()
    OR
    -- Users can see their own membership
    tenant_members.user_id = auth.uid()
    OR
    -- Facility Admins can see all members in their tenant
    public.is_facility_admin(tenant_members.tenant_id)
  );

-- Policy 2: INSERT - SuperUsers and Facility Admins can add members
CREATE POLICY tenant_members_insert ON public.tenant_members
  FOR INSERT
  WITH CHECK (
    -- SuperUsers can add anyone to any tenant
    app.is_superuser()
    OR
    -- Facility Admins can add members to their tenant
    public.is_facility_admin(tenant_members.tenant_id)
  );

-- Policy 3: UPDATE - SuperUsers and Facility Admins can update roles
CREATE POLICY tenant_members_update ON public.tenant_members
  FOR UPDATE
  USING (
    -- SuperUsers can update any membership
    app.is_superuser()
    OR
    -- Facility Admins can update memberships in their tenant
    public.is_facility_admin(tenant_members.tenant_id)
  )
  WITH CHECK (
    app.is_superuser()
    OR
    public.is_facility_admin(tenant_members.tenant_id)
  );

-- Policy 4: DELETE - SuperUsers and Facility Admins can remove members
CREATE POLICY tenant_members_delete ON public.tenant_members
  FOR DELETE
  USING (
    -- SuperUsers can remove anyone from any tenant
    app.is_superuser()
    OR
    -- Facility Admins can remove members from their tenant
    public.is_facility_admin(tenant_members.tenant_id)
    OR
    -- Users can remove themselves (leave facility)
    tenant_members.user_id = auth.uid()
  );

-- ============================================================================
-- PART 6: UPDATE RLS POLICIES FOR DAILY_CHECKINS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own check-ins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Tenant members can view shared check-ins" ON public.daily_checkins;

-- Policy 1: SELECT - Users can view their own check-ins and shared group check-ins
CREATE POLICY daily_checkins_select ON public.daily_checkins
  FOR SELECT
  USING (
    -- SuperUsers can see all check-ins
    app.is_superuser()
    OR
    -- Users can see their own check-ins
    daily_checkins.user_id = auth.uid()
    OR
    -- Users can see check-ins shared with their groups
    (
      daily_checkins.is_private = false
      AND EXISTS (
        SELECT 1
        FROM public.checkin_group_shares cgs
        JOIN public.group_memberships gm ON gm.group_id = cgs.group_id
        WHERE cgs.checkin_id = daily_checkins.id
          AND gm.user_id = auth.uid()
      )
    )
    OR
    -- Facility Admins can see all check-ins in their tenant
    (
      daily_checkins.tenant_id IS NOT NULL
      AND public.is_facility_admin(daily_checkins.tenant_id)
    )
  );

-- Policy 2: INSERT - All authenticated users can create check-ins
CREATE POLICY daily_checkins_insert ON public.daily_checkins
  FOR INSERT
  WITH CHECK (
    -- Users can only create their own check-ins
    daily_checkins.user_id = auth.uid()
  );

-- Policy 3: UPDATE - Users can update their own check-ins
CREATE POLICY daily_checkins_update ON public.daily_checkins
  FOR UPDATE
  USING (
    -- SuperUsers can update any check-in
    app.is_superuser()
    OR
    -- Users can update their own check-ins
    daily_checkins.user_id = auth.uid()
  )
  WITH CHECK (
    app.is_superuser()
    OR
    daily_checkins.user_id = auth.uid()
  );

-- Policy 4: DELETE - Users can delete their own check-ins
CREATE POLICY daily_checkins_delete ON public.daily_checkins
  FOR DELETE
  USING (
    -- SuperUsers can delete any check-in
    app.is_superuser()
    OR
    -- Users can delete their own check-ins
    daily_checkins.user_id = auth.uid()
  );

-- ============================================================================
-- PART 7: ADD RLS POLICIES FOR CHECKIN_GROUP_SHARES TABLE
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.checkin_group_shares ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Users can view shares for check-ins they can see
CREATE POLICY checkin_group_shares_select ON public.checkin_group_shares
  FOR SELECT
  USING (
    -- SuperUsers can see all shares
    app.is_superuser()
    OR
    -- Users can see shares for their own check-ins
    EXISTS (
      SELECT 1
      FROM public.daily_checkins dc
      WHERE dc.id = checkin_group_shares.checkin_id
        AND dc.user_id = auth.uid()
    )
    OR
    -- Users can see shares for groups they're in
    EXISTS (
      SELECT 1
      FROM public.group_memberships gm
      WHERE gm.group_id = checkin_group_shares.group_id
        AND gm.user_id = auth.uid()
    )
    OR
    -- Facility Admins can see shares in their tenant's groups
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = checkin_group_shares.group_id
        AND public.is_facility_admin(g.tenant_id)
    )
  );

-- Policy 2: INSERT - Users can share their own check-ins with groups they're in
CREATE POLICY checkin_group_shares_insert ON public.checkin_group_shares
  FOR INSERT
  WITH CHECK (
    -- SuperUsers can share any check-in with any group
    app.is_superuser()
    OR
    -- Users can share their own check-ins with groups they're in
    (
      EXISTS (
        SELECT 1
        FROM public.daily_checkins dc
        WHERE dc.id = checkin_group_shares.checkin_id
          AND dc.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.group_memberships gm
        WHERE gm.group_id = checkin_group_shares.group_id
          AND gm.user_id = auth.uid()
      )
    )
  );

-- Policy 3: DELETE - Users can unshare their own check-ins
CREATE POLICY checkin_group_shares_delete ON public.checkin_group_shares
  FOR DELETE
  USING (
    -- SuperUsers can delete any share
    app.is_superuser()
    OR
    -- Users can unshare their own check-ins
    EXISTS (
      SELECT 1
      FROM public.daily_checkins dc
      WHERE dc.id = checkin_group_shares.checkin_id
        AND dc.user_id = auth.uid()
    )
    OR
    -- Facility Admins can remove shares in their tenant
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = checkin_group_shares.group_id
        AND public.is_facility_admin(g.tenant_id)
    )
  );

-- ============================================================================
-- PART 8: VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================
-- Run these queries in the Supabase SQL Editor to verify the RBAC implementation:
--
-- -- Test 1: Check helper functions exist
-- SELECT proname FROM pg_proc WHERE proname IN ('is_facility_admin', 'is_group_admin', 'get_user_tenant_role', 'get_user_group_role');
-- -- Expected: 4 rows
--
-- -- Test 2: Test is_facility_admin function
-- SELECT public.is_facility_admin('<your-tenant-id>');
-- -- Expected: TRUE if you are OWNER/ADMIN, FALSE otherwise
--
-- -- Test 3: Test get_user_tenant_role function
-- SELECT public.get_user_tenant_role('<your-tenant-id>');
-- -- Expected: SUPERUSER, OWNER, ADMIN, MEMBER, or BASIC_USER
--
-- -- Test 4: Verify all RLS policies were created
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE tablename IN ('tenants', 'groups', 'group_memberships', 'tenant_members', 'daily_checkins', 'checkin_group_shares')
-- GROUP BY tablename
-- ORDER BY tablename;
-- -- Expected: Each table should have 3-4 policies
--
-- -- Test 5: Test group creation as Facility Admin
-- INSERT INTO groups (tenant_id, name) VALUES ('<your-tenant-id>', 'Test Group');
-- -- Expected: Success if you are Facility Admin or SuperUser
--
-- -- Test 6: Test group creation as Facility Member
-- -- (Run as a user with role='MEMBER')
-- INSERT INTO groups (tenant_id, name) VALUES ('<tenant-id>', 'Test Group');
-- -- Expected: RLS policy violation error
--
-- -- Test 7: Test check-in visibility for Basic User
-- -- (Run as a user with no tenant membership)
-- SELECT * FROM daily_checkins;
-- -- Expected: Only see your own check-ins
--
-- -- Test 8: Test check-in visibility for Facility Member in a group
-- -- (Run as a user in a group)
-- SELECT * FROM daily_checkins;
-- -- Expected: See your own check-ins + check-ins shared with your group
