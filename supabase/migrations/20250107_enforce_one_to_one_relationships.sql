-- ============================================
-- Migration: Enforce One-to-One Relationships
-- Date: 2025-01-07
-- Purpose: 
--   1. Enforce one profile per user
--   2. Enforce one group per user
--   3. Add group admin role support
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Add Unique Constraints
-- ============================================

-- Ensure each user has exactly ONE profile
-- (Audit confirmed no duplicates exist, so this is safe)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Ensure each user belongs to at most ONE group
-- (Audit confirmed no users in multiple groups, so this is safe)
ALTER TABLE group_memberships 
ADD CONSTRAINT group_memberships_user_id_unique UNIQUE (user_id);

-- ============================================
-- STEP 2: Add Group Admin Management Functions
-- ============================================

-- Function to promote user to group admin
CREATE OR REPLACE FUNCTION promote_to_group_admin(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verify user is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  -- Promote to admin
  UPDATE group_memberships
  SET role = 'ADMIN'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote from group admin
CREATE OR REPLACE FUNCTION demote_from_group_admin(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verify user is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  -- Demote to member
  UPDATE group_memberships
  SET role = 'MEMBER'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Update is_group_admin Function
-- ============================================

-- Update the existing is_group_admin function to check for ADMIN role
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is a SuperUser (SuperUsers are admins of all groups)
  IF EXISTS (SELECT 1 FROM superusers WHERE user_id = v_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a group admin
  SELECT (role = 'ADMIN') INTO v_is_admin
  FROM group_memberships
  WHERE group_id = p_group_id
    AND user_id = v_user_id;
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Update get_user_group_role Function
-- ============================================

-- Update to return the actual role from group_memberships
CREATE OR REPLACE FUNCTION get_user_group_role(p_group_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_tenant_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is a SuperUser
  IF EXISTS (SELECT 1 FROM superusers WHERE user_id = v_user_id) THEN
    RETURN 'SUPERUSER';
  END IF;
  
  -- Get the group's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM groups
  WHERE id = p_group_id;
  
  -- Check if user is a Facility Admin of the group's tenant
  IF EXISTS (
    SELECT 1 FROM tenant_members
    WHERE user_id = v_user_id
      AND tenant_id = v_tenant_id
      AND role IN ('OWNER', 'ADMIN')
  ) THEN
    RETURN 'FACILITY_ADMIN';
  END IF;
  
  -- Get user's role in the group (ADMIN or MEMBER)
  SELECT role INTO v_role
  FROM group_memberships
  WHERE group_id = p_group_id
    AND user_id = v_user_id;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Add Comments for Documentation
-- ============================================

COMMENT ON CONSTRAINT user_profiles_user_id_unique ON user_profiles IS 
'Ensures each user has exactly ONE profile. Users cannot have multiple profiles (e.g., solo + facility).';

COMMENT ON CONSTRAINT group_memberships_user_id_unique ON group_memberships IS 
'Ensures each user belongs to at most ONE group. Users cannot be members of multiple groups.';

COMMENT ON FUNCTION promote_to_group_admin(UUID, UUID) IS 
'Promotes a user to Group Admin role within a specific group. Only Facility Admins and SuperUsers can call this.';

COMMENT ON FUNCTION demote_from_group_admin(UUID, UUID) IS 
'Demotes a user from Group Admin to regular Member role. Only Facility Admins and SuperUsers can call this.';

COMMIT;

-- ============================================
-- Verification Queries (Run after migration)
-- ============================================

-- 1. Verify unique constraints exist
-- SELECT conname, contype FROM pg_constraint 
-- WHERE conrelid IN ('user_profiles'::regclass, 'group_memberships'::regclass)
--   AND conname LIKE '%unique%';

-- 2. Verify functions exist
-- SELECT proname FROM pg_proc 
-- WHERE proname IN ('promote_to_group_admin', 'demote_from_group_admin', 'is_group_admin', 'get_user_group_role');

-- 3. Verify no duplicate profiles
-- SELECT user_id, COUNT(*) FROM user_profiles GROUP BY user_id HAVING COUNT(*) > 1;
-- Should return 0 rows

-- 4. Verify no users in multiple groups
-- SELECT user_id, COUNT(*) FROM group_memberships GROUP BY user_id HAVING COUNT(*) > 1;
-- Should return 0 rows

