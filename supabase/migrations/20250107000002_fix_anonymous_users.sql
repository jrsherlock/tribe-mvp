-- =============================================
-- Fix Anonymous Users in Dashboard
-- =============================================
-- This migration addresses users appearing as "Anonymous" in the Dashboard
-- by ensuring all users have proper profiles with display names.
--
-- Date: 2025-01-07
-- =============================================

-- Step 1: Create profiles for users who don't have one
-- Uses email username as default display_name
INSERT INTO user_profiles (user_id, display_name, tenant_id, bio, avatar_url, location, is_public)
SELECT 
  au.id as user_id,
  COALESCE(
    SPLIT_PART(au.email, '@', 1),  -- Use email username
    'User'
  ) as display_name,
  NULL as tenant_id,
  '' as bio,
  '' as avatar_url,
  '' as location,
  true as is_public
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL
ON CONFLICT DO NOTHING;

-- Step 2: Update existing profiles with empty display names
-- Uses email username as default
UPDATE user_profiles up
SET 
  display_name = COALESCE(
    NULLIF(TRIM(up.display_name), ''),  -- Keep existing if not empty
    SPLIT_PART(au.email, '@', 1),        -- Use email username
    'User'                                -- Final fallback
  ),
  updated_at = NOW()
FROM auth.users au
WHERE up.user_id = au.id
  AND (up.display_name IS NULL OR TRIM(up.display_name) = '');

-- Step 3: Create trigger function to auto-create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id, 
    display_name, 
    tenant_id,
    bio,
    avatar_url,
    location,
    is_public
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',  -- From signup metadata
      SPLIT_PART(NEW.email, '@', 1),             -- Email username
      'User'                                      -- Final fallback
    ),
    NULL,
    '',
    '',
    '',
    true
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a user_profiles record when a new user signs up. 
   Uses display_name from signup metadata, email username, or "User" as fallback.';

-- =============================================
-- Verification Queries (Run these after migration)
-- =============================================

-- Query 1: Count users without profiles (should be 0)
-- SELECT COUNT(*) as users_without_profiles
-- FROM auth.users au
-- LEFT JOIN user_profiles up ON au.id = up.user_id
-- WHERE up.id IS NULL;

-- Query 2: Count profiles with empty display names (should be 0)
-- SELECT COUNT(*) as empty_display_names
-- FROM user_profiles
-- WHERE display_name IS NULL OR TRIM(display_name) = '';

-- Query 3: Show all user profiles with their display names
-- SELECT 
--   up.user_id,
--   au.email,
--   up.display_name,
--   up.created_at
-- FROM user_profiles up
-- JOIN auth.users au ON up.user_id = au.id
-- ORDER BY up.created_at DESC
-- LIMIT 20;

