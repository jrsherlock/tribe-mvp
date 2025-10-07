-- Add group_id column to invites table
-- This allows invitations to automatically assign users to a specific group

-- Add group_id column (nullable, as group assignment is optional)
ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_invites_group_id ON public.invites(group_id);

-- Add comment for documentation
COMMENT ON COLUMN public.invites.group_id IS 'Optional group to automatically assign user to upon accepting invitation';

