-- Add profile fields to tenants table for Facility Profile feature
-- This migration adds profile_picture_url and bio fields to support rich facility profiles

-- Add profile_picture_url column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT DEFAULT '';

-- Add bio column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Add constraint to limit bio length (similar to user_profiles)
ALTER TABLE public.tenants 
ADD CONSTRAINT IF NOT EXISTS tenants_bio_length 
CHECK (char_length(bio) <= 1000);

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.profile_picture_url IS 'URL to the facility profile picture stored in Supabase Storage';
COMMENT ON COLUMN public.tenants.bio IS 'Facility description/bio (max 1000 characters)';

