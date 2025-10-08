-- Storage RLS Policy for Group Photos
-- Allows group members to upload photos to their group's folders

-- =============================================
-- DROP EXISTING UPLOAD POLICY
-- =============================================

DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;

-- =============================================
-- CREATE NEW UPLOAD POLICY WITH GROUP SUPPORT
-- =============================================

CREATE POLICY "Users can upload photos" 
ON storage.objects FOR INSERT TO public 
WITH CHECK (
  bucket_id = 'photos' 
  AND (
    -- SuperUsers can upload anywhere
    EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    ) 
    OR 
    -- Facility Admins can upload to their facility folder
    EXISTS (
      SELECT 1 
      FROM tenant_members tm 
      JOIN user_profiles up ON tm.user_id = up.user_id 
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('OWNER', 'ADMIN') 
        AND name LIKE 'facilities/' || up.tenant_id || '%'
    ) 
    OR 
    -- Group members can upload to their group's folders
    EXISTS (
      SELECT 1 
      FROM group_memberships gm
      WHERE gm.user_id = auth.uid()
        AND name LIKE 'groups/' || gm.group_id || '%'
    )
    OR 
    -- Users can upload to their own folder
    (auth.uid())::text = ANY(string_to_array(name, '/'))
  )
);

-- =============================================
-- UPDATE DELETE POLICY WITH GROUP SUPPORT
-- =============================================

DROP POLICY IF EXISTS "Users can delete photos" ON storage.objects;

CREATE POLICY "Users can delete photos" 
ON storage.objects FOR DELETE TO public 
USING (
  bucket_id = 'photos' 
  AND (
    -- SuperUsers can delete anywhere
    EXISTS (
      SELECT 1 FROM superusers 
      WHERE user_id = auth.uid()
    ) 
    OR 
    -- Facility Admins can delete from their facility folder
    EXISTS (
      SELECT 1 
      FROM tenant_members tm 
      JOIN user_profiles up ON tm.user_id = up.user_id 
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('OWNER', 'ADMIN') 
        AND name LIKE 'facilities/' || up.tenant_id || '%'
    ) 
    OR 
    -- Group admins can delete from their group's folders
    EXISTS (
      SELECT 1 
      FROM group_memberships gm
      WHERE gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
        AND name LIKE 'groups/' || gm.group_id || '%'
    )
    OR 
    -- Users can delete from their own folder
    (auth.uid())::text = ANY(string_to_array(name, '/'))
  )
);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname IN ('Users can upload photos', 'Users can delete photos')
ORDER BY policyname, cmd;

