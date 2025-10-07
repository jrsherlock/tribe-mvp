-- Fix invites table schema to support invitation tracking
-- Adds invited_by, accepted_at, and status columns

-- Add invited_by column to track who sent the invitation
ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add accepted_at column to track when invitation was accepted
ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Update default role to match tenant_members table
-- Change from 'common_user' to 'MEMBER'
ALTER TABLE public.invites 
ALTER COLUMN role SET DEFAULT 'MEMBER';

-- Add status column (updated via trigger, not generated column)
-- Cannot use GENERATED ALWAYS with NOW() as it's not immutable
ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create function to compute invite status
CREATE OR REPLACE FUNCTION compute_invite_status(accepted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
RETURNS TEXT AS $$
BEGIN
  IF accepted_at IS NOT NULL THEN
    RETURN 'accepted';
  ELSIF expires_at < NOW() THEN
    RETURN 'expired';
  ELSE
    RETURN 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigger function to automatically update status
CREATE OR REPLACE FUNCTION update_invite_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := compute_invite_status(NEW.accepted_at, NEW.expires_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update status on insert/update
DROP TRIGGER IF EXISTS trigger_update_invite_status ON public.invites;
CREATE TRIGGER trigger_update_invite_status
  BEFORE INSERT OR UPDATE ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION update_invite_status();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON public.invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_accepted_at ON public.invites(accepted_at);

-- Update existing invites to have a default expiry if null
UPDATE public.invites 
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Make expires_at NOT NULL now that we've set defaults
ALTER TABLE public.invites 
ALTER COLUMN expires_at SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.invites.invited_by IS 'User ID of the admin who sent this invitation';
COMMENT ON COLUMN public.invites.accepted_at IS 'Timestamp when the invitation was accepted';
COMMENT ON COLUMN public.invites.status IS 'Computed status: pending, accepted, or expired';

-- Update RLS policies to use tenant_members instead of memberships
-- (The original supabase-invites.sql referenced 'memberships' table which doesn't exist)

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Tenant admins can insert invites" ON public.invites;
DROP POLICY IF EXISTS "Inviter can view their invites" ON public.invites;
DROP POLICY IF EXISTS "Tenant admins can view invites in tenant" ON public.invites;

-- Policy: Only tenant OWNER/ADMIN or superusers can insert invites
CREATE POLICY "Tenant admins can insert invites" ON public.invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invites.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    ) 
    OR EXISTS (
      SELECT 1 FROM public.superusers
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Inviter can view invites they created
CREATE POLICY "Inviter can view their invites" ON public.invites
  FOR SELECT
  USING (
    invited_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.superusers
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Tenant admins can view all invites in their tenant
CREATE POLICY "Tenant admins can view invites in tenant" ON public.invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invites.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    ) 
    OR EXISTS (
      SELECT 1 FROM public.superusers
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Tenant admins can delete invites in their tenant
CREATE POLICY "Tenant admins can delete invites" ON public.invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invites.tenant_id
        AND tm.role IN ('OWNER', 'ADMIN')
    ) 
    OR EXISTS (
      SELECT 1 FROM public.superusers
      WHERE user_id = auth.uid()
    )
  );

-- Enable RLS if not already enabled
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT ON TABLE public.invites TO authenticated;
GRANT ALL ON TABLE public.invites TO postgres;

