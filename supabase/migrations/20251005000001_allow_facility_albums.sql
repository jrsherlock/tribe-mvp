-- Allow facility albums by making user_id nullable in photo_albums and album_photos
-- Facility albums will have user_id = NULL and be associated with tenant_id only

-- Make user_id nullable in photo_albums (for facility albums)
ALTER TABLE public.photo_albums 
ALTER COLUMN user_id DROP NOT NULL;

-- Make user_id nullable in album_photos (for facility album photos)
ALTER TABLE public.album_photos 
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.photo_albums.user_id IS 'User ID for personal albums, NULL for facility albums';
COMMENT ON COLUMN public.album_photos.user_id IS 'User ID for personal photos, NULL for facility photos';

