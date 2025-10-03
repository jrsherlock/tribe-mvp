-- Verify RLS policies were created successfully

-- List all policies on tenant_members
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd as command
FROM pg_policies
WHERE tablename = 'tenant_members'
ORDER BY policyname;

-- List all policies on tenants
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd as command
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;

-- List all policies on superusers
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd as command
FROM pg_policies
WHERE tablename = 'superusers'
ORDER BY policyname;

-- Verify RLS is enabled on all three tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('tenant_members', 'tenants', 'superusers')
  AND schemaname = 'public'
ORDER BY tablename;

