-- Add cover photo support to album_photos table
-- This migration adds is_cover_photo field and auto-selection logic

-- Add is_cover_photo boolean field to album_photos
ALTER TABLE public.album_photos 
ADD COLUMN IF NOT EXISTS is_cover_photo BOOLEAN DEFAULT false;

-- Add index for faster cover photo queries
CREATE INDEX IF NOT EXISTS idx_album_photos_cover 
ON public.album_photos(album_id, is_cover_photo) 
WHERE is_cover_photo = true;

-- Add comment for documentation
COMMENT ON COLUMN public.album_photos.is_cover_photo IS 'Indicates if this photo is the cover photo for the album';

-- Function to ensure only one cover photo per album
CREATE OR REPLACE FUNCTION ensure_single_cover_photo()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a photo as cover, unset all other cover photos in the same album
  IF NEW.is_cover_photo = true THEN
    UPDATE album_photos
    SET is_cover_photo = false
    WHERE album_id = NEW.album_id 
      AND id != NEW.id 
      AND is_cover_photo = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one cover photo per album
DROP TRIGGER IF EXISTS ensure_single_cover_photo_trigger ON album_photos;
CREATE TRIGGER ensure_single_cover_photo_trigger
  BEFORE INSERT OR UPDATE ON album_photos
  FOR EACH ROW
  WHEN (NEW.is_cover_photo = true)
  EXECUTE FUNCTION ensure_single_cover_photo();

-- Function to auto-set cover photo for single-photo albums
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

-- Trigger to auto-set cover photo
DROP TRIGGER IF EXISTS auto_set_cover_photo_trigger ON album_photos;
CREATE TRIGGER auto_set_cover_photo_trigger
  AFTER INSERT OR DELETE ON album_photos
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_cover_photo();

-- Function to update album cover_photo_url when cover photo changes
CREATE OR REPLACE FUNCTION update_album_cover_url()
RETURNS TRIGGER AS $$
BEGIN
  -- If a photo is set as cover, update the album's cover_photo_url
  IF NEW.is_cover_photo = true THEN
    UPDATE photo_albums
    SET cover_photo_url = NEW.photo_url,
        updated_at = NOW()
    WHERE id = NEW.album_id;
  END IF;
  
  -- If a photo is unset as cover and no other cover exists, clear the album's cover_photo_url
  IF OLD.is_cover_photo = true AND NEW.is_cover_photo = false THEN
    -- Check if there's another cover photo
    IF NOT EXISTS (
      SELECT 1 FROM album_photos 
      WHERE album_id = NEW.album_id 
        AND is_cover_photo = true 
        AND id != NEW.id
    ) THEN
      UPDATE photo_albums
      SET cover_photo_url = '',
          updated_at = NOW()
      WHERE id = NEW.album_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update album cover URL
DROP TRIGGER IF EXISTS update_album_cover_url_trigger ON album_photos;
CREATE TRIGGER update_album_cover_url_trigger
  AFTER UPDATE ON album_photos
  FOR EACH ROW
  WHEN (OLD.is_cover_photo IS DISTINCT FROM NEW.is_cover_photo)
  EXECUTE FUNCTION update_album_cover_url();

-- Migrate existing albums: set first photo as cover if no cover exists
DO $$
DECLARE
  album_record RECORD;
  first_photo RECORD;
BEGIN
  FOR album_record IN 
    SELECT id FROM photo_albums 
    WHERE (cover_photo_url IS NULL OR cover_photo_url = '')
      AND photo_count > 0
  LOOP
    -- Get the first photo in the album
    SELECT id, photo_url INTO first_photo
    FROM album_photos
    WHERE album_id = album_record.id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      -- Set it as cover photo
      UPDATE album_photos
      SET is_cover_photo = true
      WHERE id = first_photo.id;
      
      -- Update album's cover_photo_url
      UPDATE photo_albums
      SET cover_photo_url = first_photo.photo_url
      WHERE id = album_record.id;
    END IF;
  END LOOP;
END $$;

