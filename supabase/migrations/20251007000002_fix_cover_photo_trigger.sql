-- Fix auto_set_cover_photo function to avoid MIN(uuid) error
-- The original function tried to use MIN(id) on a UUID column, which is not supported
-- This migration replaces it with a proper query using ORDER BY created_at

-- Drop and recreate the auto_set_cover_photo function with the fix
CREATE OR REPLACE FUNCTION auto_set_cover_photo()
RETURNS TRIGGER AS $$
DECLARE
  photo_count INTEGER;
  first_photo_id UUID;
  first_photo_url TEXT;
BEGIN
  -- Count photos in the album
  SELECT COUNT(*) INTO photo_count
  FROM album_photos
  WHERE album_id = COALESCE(NEW.album_id, OLD.album_id);
  
  -- If this is the first photo in the album, set it as cover
  IF TG_OP = 'INSERT' AND photo_count = 1 THEN
    UPDATE album_photos
    SET is_cover_photo = true
    WHERE id = NEW.id;
    
    -- Update album's cover_photo_url
    UPDATE photo_albums
    SET cover_photo_url = NEW.photo_url
    WHERE id = NEW.album_id;
  END IF;
  
  -- If a cover photo was deleted, set the first remaining photo as cover
  IF TG_OP = 'DELETE' AND OLD.is_cover_photo = true AND photo_count > 0 THEN
    -- Get the first photo by created_at (not by MIN(id) which doesn't work on UUIDs)
    SELECT id, photo_url INTO first_photo_id, first_photo_url
    FROM album_photos
    WHERE album_id = OLD.album_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE album_photos
      SET is_cover_photo = true
      WHERE id = first_photo_id;
      
      -- Update album's cover_photo_url
      UPDATE photo_albums
      SET cover_photo_url = first_photo_url
      WHERE id = OLD.album_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND photo_count = 0 THEN
    -- No photos left, clear cover_photo_url
    UPDATE photo_albums
    SET cover_photo_url = ''
    WHERE id = OLD.album_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON FUNCTION auto_set_cover_photo() IS 
  'Automatically sets cover photo for albums. Uses ORDER BY created_at instead of MIN(id) to avoid UUID comparison errors.';

