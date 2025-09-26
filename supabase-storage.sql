-- Storage setup for photos bucket
-- Run in SQL editor on your Supabase project

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (since app generates public URLs). Adjust later if needed.
CREATE POLICY IF NOT EXISTS "Public read access to photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Allow authenticated users to upload to paths scoped by their user id (and optional tenant prefix)
CREATE POLICY IF NOT EXISTS "Authenticated can upload to their folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos'
    AND (
      position(auth.uid()::text in name) > 0 -- path contains userId (we use tenantId/userId/...)
    )
  );

-- Allow owners to delete their files
CREATE POLICY IF NOT EXISTS "Owners can delete their files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos' AND (position(auth.uid()::text in name) > 0)
  );

