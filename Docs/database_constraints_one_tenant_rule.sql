-- ============================================================================
-- ONE-TENANT-PER-USER RULE: DATABASE CONSTRAINTS
-- ============================================================================
-- Date: 2025-10-07
-- Purpose: Enforce strict one-tenant-per-user rule at database level
-- Target: sangha-mvp-dev database
--
-- CONSTRAINTS IMPLEMENTED:
-- 1. Unique constraint on tenant_members (user_id) - prevents multiple memberships
-- 2. Trigger to prevent orphaned user_profiles
-- 3. Trigger to cascade delete user_profiles when tenant_members is deleted
-- 4. Function to validate one-tenant rule before INSERT/UPDATE
-- ============================================================================

-- ============================================================================
-- CONSTRAINT 1: UNIQUE INDEX ON tenant_members.user_id
-- ============================================================================
-- Purpose: Ensure each user can be a member of at most ONE tenant
-- Exception: SuperUsers are exempt (they're not in tenant_members)

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_tenant_members_unique_user;

-- Create unique index on user_id
-- This prevents a user from being inserted into tenant_members more than once
CREATE UNIQUE INDEX idx_tenant_members_unique_user 
ON tenant_members(user_id);

-- Verify index created
SELECT 
  'UNIQUE INDEX CREATED' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tenant_members' 
  AND indexname = 'idx_tenant_members_unique_user';

-- ============================================================================
-- CONSTRAINT 2: FUNCTION TO VALIDATE ONE-TENANT RULE
-- ============================================================================
-- Purpose: Validate that user doesn't already have a tenant membership
-- Used by triggers on tenant_members and user_profiles

CREATE OR REPLACE FUNCTION validate_one_tenant_per_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_tenant_id UUID;
  existing_tenant_name TEXT;
  is_super_user BOOLEAN;
BEGIN
  -- Check if user is a SuperUser (exempt from one-tenant rule)
  SELECT EXISTS(
    SELECT 1 FROM superusers WHERE user_id = NEW.user_id
  ) INTO is_super_user;

  -- SuperUsers are exempt from one-tenant rule
  IF is_super_user THEN
    RETURN NEW;
  END IF;

  -- For INSERT operations on tenant_members
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'tenant_members' THEN
    -- Check if user already has a tenant membership
    SELECT tenant_id INTO existing_tenant_id
    FROM tenant_members
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF existing_tenant_id IS NOT NULL THEN
      -- Get tenant name for better error message
      SELECT name INTO existing_tenant_name
      FROM tenants
      WHERE id = existing_tenant_id;

      RAISE EXCEPTION 'User % is already a member of tenant "%" (%). Users can only belong to one tenant at a time. Remove them from their current tenant before adding to a new one.',
        NEW.user_id,
        existing_tenant_name,
        existing_tenant_id
        USING ERRCODE = '23505'; -- unique_violation error code
    END IF;
  END IF;

  -- For UPDATE operations on tenant_members (changing tenant_id)
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'tenant_members' THEN
    -- If tenant_id is being changed, ensure no other membership exists
    IF NEW.tenant_id != OLD.tenant_id THEN
      SELECT tenant_id INTO existing_tenant_id
      FROM tenant_members
      WHERE user_id = NEW.user_id
        AND tenant_id != OLD.tenant_id
      LIMIT 1;

      IF existing_tenant_id IS NOT NULL THEN
        SELECT name INTO existing_tenant_name
        FROM tenants
        WHERE id = existing_tenant_id;

        RAISE EXCEPTION 'User % already has a membership in tenant "%" (%). Cannot update to a different tenant while existing membership exists.',
          NEW.user_id,
          existing_tenant_name,
          existing_tenant_id
          USING ERRCODE = '23505';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINT 3: TRIGGER ON tenant_members (BEFORE INSERT/UPDATE)
-- ============================================================================
-- Purpose: Prevent users from being added to multiple tenants

DROP TRIGGER IF EXISTS trigger_validate_one_tenant_on_insert ON tenant_members;

CREATE TRIGGER trigger_validate_one_tenant_on_insert
  BEFORE INSERT OR UPDATE ON tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_one_tenant_per_user();

-- ============================================================================
-- CONSTRAINT 4: FUNCTION TO PREVENT ORPHANED user_profiles
-- ============================================================================
-- Purpose: Ensure user_profiles.tenant_id always has matching tenant_members record

CREATE OR REPLACE FUNCTION validate_profile_has_membership()
RETURNS TRIGGER AS $$
DECLARE
  has_membership BOOLEAN;
BEGIN
  -- Skip validation for solo mode profiles (tenant_id IS NULL)
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user has a matching tenant_members record
  SELECT EXISTS(
    SELECT 1 
    FROM tenant_members 
    WHERE user_id = NEW.user_id 
      AND tenant_id = NEW.tenant_id
  ) INTO has_membership;

  IF NOT has_membership THEN
    RAISE EXCEPTION 'Cannot create user_profile with tenant_id % for user %. User must be a member of the tenant first (add to tenant_members table).',
      NEW.tenant_id,
      NEW.user_id
      USING ERRCODE = '23503'; -- foreign_key_violation error code
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINT 5: TRIGGER ON user_profiles (BEFORE INSERT/UPDATE)
-- ============================================================================
-- Purpose: Prevent orphaned profiles (profiles without matching tenant membership)

DROP TRIGGER IF EXISTS trigger_validate_profile_membership ON user_profiles;

CREATE TRIGGER trigger_validate_profile_membership
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_has_membership();

-- ============================================================================
-- CONSTRAINT 6: FUNCTION TO CASCADE DELETE user_profiles
-- ============================================================================
-- Purpose: When tenant_members record is deleted, auto-delete matching user_profiles

CREATE OR REPLACE FUNCTION cascade_delete_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete matching user_profile when tenant membership is removed
  DELETE FROM user_profiles
  WHERE user_id = OLD.user_id
    AND tenant_id = OLD.tenant_id;

  -- Log the deletion
  RAISE NOTICE 'Deleted user_profile for user % in tenant % due to tenant_members deletion',
    OLD.user_id,
    OLD.tenant_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINT 7: TRIGGER ON tenant_members (AFTER DELETE)
-- ============================================================================
-- Purpose: Auto-delete user_profiles when tenant membership is removed

DROP TRIGGER IF EXISTS trigger_cascade_delete_profile ON tenant_members;

CREATE TRIGGER trigger_cascade_delete_profile
  AFTER DELETE ON tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_user_profile();

-- ============================================================================
-- CONSTRAINT 8: FUNCTION TO PREVENT MULTIPLE TENANT PROFILES
-- ============================================================================
-- Purpose: Ensure user doesn't have multiple tenant-specific profiles

CREATE OR REPLACE FUNCTION validate_single_tenant_profile()
RETURNS TRIGGER AS $$
DECLARE
  existing_profile_count INTEGER;
  existing_tenant_id UUID;
BEGIN
  -- Skip validation for solo mode profiles (tenant_id IS NULL)
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- For INSERT: Check if user already has a tenant-specific profile
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*), MAX(tenant_id) 
    INTO existing_profile_count, existing_tenant_id
    FROM user_profiles
    WHERE user_id = NEW.user_id
      AND tenant_id IS NOT NULL;

    IF existing_profile_count > 0 THEN
      RAISE EXCEPTION 'User % already has a tenant-specific profile for tenant %. Users can only have one tenant-specific profile. Delete the existing profile before creating a new one.',
        NEW.user_id,
        existing_tenant_id
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- For UPDATE: If changing tenant_id, ensure no other tenant profile exists
  IF TG_OP = 'UPDATE' AND NEW.tenant_id != OLD.tenant_id THEN
    SELECT COUNT(*), MAX(tenant_id)
    INTO existing_profile_count, existing_tenant_id
    FROM user_profiles
    WHERE user_id = NEW.user_id
      AND tenant_id IS NOT NULL
      AND id != NEW.id;

    IF existing_profile_count > 0 THEN
      RAISE EXCEPTION 'User % already has a tenant-specific profile for tenant %. Cannot change tenant_id while another tenant profile exists.',
        NEW.user_id,
        existing_tenant_id
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINT 9: TRIGGER ON user_profiles (BEFORE INSERT/UPDATE)
-- ============================================================================
-- Purpose: Prevent users from having multiple tenant-specific profiles

DROP TRIGGER IF EXISTS trigger_validate_single_tenant_profile ON user_profiles;

CREATE TRIGGER trigger_validate_single_tenant_profile
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_single_tenant_profile();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all triggers on tenant_members
SELECT 
  'TENANT_MEMBERS TRIGGERS' as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tenant_members'
ORDER BY trigger_name;

-- List all triggers on user_profiles
SELECT 
  'USER_PROFILES TRIGGERS' as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles'
ORDER BY trigger_name;

-- List all indexes on tenant_members
SELECT 
  'TENANT_MEMBERS INDEXES' as table_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tenant_members'
ORDER BY indexname;

-- ============================================================================
-- TEST CASES (COMMENTED OUT - FOR MANUAL TESTING)
-- ============================================================================

/*
-- TEST 1: Try to add a user to a second tenant (should FAIL)
-- First, find a user who is already in a tenant
SELECT user_id, tenant_id FROM tenant_members LIMIT 1;

-- Try to add them to a different tenant (should raise exception)
INSERT INTO tenant_members (user_id, tenant_id, role)
VALUES ('<user_id_from_above>', '<different_tenant_id>', 'MEMBER');
-- Expected: ERROR - User is already a member of tenant

-- TEST 2: Try to create a second tenant-specific profile (should FAIL)
SELECT user_id, tenant_id FROM user_profiles WHERE tenant_id IS NOT NULL LIMIT 1;

-- Try to create another profile for same user with different tenant_id
INSERT INTO user_profiles (user_id, tenant_id, display_name)
VALUES ('<user_id_from_above>', '<different_tenant_id>', 'Test Name');
-- Expected: ERROR - User already has a tenant-specific profile

-- TEST 3: Delete tenant membership and verify profile is auto-deleted
SELECT * FROM user_profiles WHERE user_id = '<some_user_id>' AND tenant_id = '<some_tenant_id>';
DELETE FROM tenant_members WHERE user_id = '<some_user_id>' AND tenant_id = '<some_tenant_id>';
SELECT * FROM user_profiles WHERE user_id = '<some_user_id>' AND tenant_id = '<some_tenant_id>';
-- Expected: Profile should be automatically deleted

-- TEST 4: SuperUser should be exempt from one-tenant rule
-- (SuperUsers don't go in tenant_members, so this is N/A)
*/

-- ============================================================================
-- END OF CONSTRAINTS SCRIPT
-- ============================================================================

