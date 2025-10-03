-- Invites table and policies for Facility Admin invitation flow
-- Target project: DEV (confirm before applying)

-- Table: public.invites
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER', -- Align with memberships.role
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN accepted_at IS NOT NULL THEN 'accepted'
      WHEN NOW() > expires_at THEN 'expired'
      ELSE 'pending'
    END
  ) STORED
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_invites_tenant ON public.invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);

-- RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Only tenant OWNER/ADMIN ("facility admin") or superusers can insert invites
DROP POLICY IF EXISTS "Tenant admins can insert invites" ON public.invites;
CREATE POLICY "Tenant admins can insert invites" ON public.invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = invites.tenant_id
        AND m.role IN ('OWNER','ADMIN')
    ) OR app.is_superuser()
  );

-- Inviter (or superuser) can view invites they created (for auditing/UX)
DROP POLICY IF EXISTS "Inviter can view their invites" ON public.invites;
CREATE POLICY "Inviter can view their invites" ON public.invites
  FOR SELECT
  USING (
    invited_by = auth.uid() OR app.is_superuser()
  );

-- Optionally allow tenant admins to list invites in their tenant (comment out if too broad)
DROP POLICY IF EXISTS "Tenant admins can view invites in tenant" ON public.invites;
CREATE POLICY "Tenant admins can view invites in tenant" ON public.invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = invites.tenant_id
        AND m.role IN ('OWNER','ADMIN')
    ) OR app.is_superuser()
  );

-- Future accept-invite flow typically handled via Edge Function using service role; thus no UPDATE policy needed yet.
-- If you later allow clients to accept invites directly, add a narrow UPDATE policy scoped by token and email.

-- Grants (optional; Supabase Studio usually manages)
GRANT ALL ON TABLE public.invites TO postgres;
GRANT SELECT, INSERT ON TABLE public.invites TO authenticated;

