-- RLS Policies for Facility Photo Albums
-- Allows SuperUsers and Facility Admins to manage facility albums (user_id = NULL)

-- =============================================
-- DROP EXISTING POLICIES IF THEY EXIST
-- =============================================

DROP POLICY IF EXISTS "SuperUsers can view facility albums" ON photo_albums;
DROP POLICY IF EXISTS "Facility Admins can view facility albums" ON photo_albums;
DROP POLICY IF EXISTS "Tenant members can view public facility albums" ON photo_albums;
DROP POLICY IF EXISTS "SuperUsers can create facility albums" ON photo_albums;
DROP POLICY IF EXISTS "Facility Admins can create facility albums" ON photo_albums;
DROP POLICY IF EXISTS "SuperUsers can update facility albums" ON photo_albums;
DROP POLICY IF EXISTS "Facility Admins can update facility albums" ON photo_albums;
DROP POLICY IF EXISTS "SuperUsers can delete facility albums" ON photo_albums;
DROP POLICY IF EXISTS "Facility Admins can delete facility albums" ON photo_albums;

DROP POLICY IF EXISTS "SuperUsers can view facility photos" ON album_photos;
DROP POLICY IF EXISTS "Facility Admins can view facility photos" ON album_photos;
DROP POLICY IF EXISTS "Tenant members can view public facility photos" ON album_photos;
DROP POLICY IF EXISTS "SuperUsers can upload facility photos" ON album_photos;
DROP POLICY IF EXISTS "Facility Admins can upload facility photos" ON album_photos;
DROP POLICY IF EXISTS "SuperUsers can update facility photos" ON album_photos;
DROP POLICY IF EXISTS "Facility Admins can update facility photos" ON album_photos;
DROP POLICY IF EXISTS "SuperUsers can delete facility photos" ON album_photos;
DROP POLICY IF EXISTS "Facility Admins can delete facility photos" ON album_photos;

-- =============================================
-- PHOTO ALBUMS: FACILITY ALBUM POLICIES
-- =============================================

-- SuperUsers can view all facility albums
CREATE POLICY "SuperUsers can view facility albums" ON photo_albums
  FOR SELECT USING (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can view their facility's albums
CREATE POLICY "Facility Admins can view facility albums" ON photo_albums
  FOR SELECT USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = photo_albums.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- Tenant members can view public facility albums
CREATE POLICY "Tenant members can view public facility albums" ON photo_albums
  FOR SELECT USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND is_public = true
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = photo_albums.tenant_id
    )
  );

-- SuperUsers can create facility albums
CREATE POLICY "SuperUsers can create facility albums" ON photo_albums
  FOR INSERT WITH CHECK (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can create albums for their facility
CREATE POLICY "Facility Admins can create facility albums" ON photo_albums
  FOR INSERT WITH CHECK (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = photo_albums.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- SuperUsers can update facility albums
CREATE POLICY "SuperUsers can update facility albums" ON photo_albums
  FOR UPDATE USING (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can update their facility's albums
CREATE POLICY "Facility Admins can update facility albums" ON photo_albums
  FOR UPDATE USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = photo_albums.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- SuperUsers can delete facility albums
CREATE POLICY "SuperUsers can delete facility albums" ON photo_albums
  FOR DELETE USING (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can delete their facility's albums
CREATE POLICY "Facility Admins can delete facility albums" ON photo_albums
  FOR DELETE USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = photo_albums.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =============================================
-- ALBUM PHOTOS: FACILITY PHOTO POLICIES
-- =============================================

-- SuperUsers can view all facility photos
CREATE POLICY "SuperUsers can view facility photos" ON album_photos
  FOR SELECT USING (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can view their facility's photos
CREATE POLICY "Facility Admins can view facility photos" ON album_photos
  FOR SELECT USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = album_photos.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- Tenant members can view public facility photos
CREATE POLICY "Tenant members can view public facility photos" ON album_photos
  FOR SELECT USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND is_public = true
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = album_photos.tenant_id
    )
  );

-- SuperUsers can upload facility photos
CREATE POLICY "SuperUsers can upload facility photos" ON album_photos
  FOR INSERT WITH CHECK (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can upload photos to their facility's albums
CREATE POLICY "Facility Admins can upload facility photos" ON album_photos
  FOR INSERT WITH CHECK (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = album_photos.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- SuperUsers can update facility photos
CREATE POLICY "SuperUsers can update facility photos" ON album_photos
  FOR UPDATE USING (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can update their facility's photos
CREATE POLICY "Facility Admins can update facility photos" ON album_photos
  FOR UPDATE USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = album_photos.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- SuperUsers can delete facility photos
CREATE POLICY "SuperUsers can delete facility photos" ON album_photos
  FOR DELETE USING (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    )
  );

-- Facility Admins can delete their facility's photos
CREATE POLICY "Facility Admins can delete facility photos" ON album_photos
  FOR DELETE USING (
    user_id IS NULL 
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = album_photos.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "SuperUsers can view facility albums" ON photo_albums IS 
  'SuperUsers can view all facility albums (user_id = NULL)';

COMMENT ON POLICY "Facility Admins can view facility albums" ON photo_albums IS 
  'Facility Admins can view albums for their facility';

COMMENT ON POLICY "SuperUsers can create facility albums" ON photo_albums IS 
  'SuperUsers can create facility albums with user_id = NULL';

COMMENT ON POLICY "Facility Admins can create facility albums" ON photo_albums IS 
  'Facility Admins can create albums for their facility with user_id = NULL';

