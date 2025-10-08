-- Fix group feed visibility: allow group-shared check-ins regardless of is_private
-- This migration updates the RLS policy on public.daily_checkins to remove the
-- requirement that is_private = false when a check-in is shared with a group
-- the current user belongs to.

-- Safety: drop and recreate the SELECT policy. If the policy name differs in your
-- instance, the IF EXISTS ensures this is safe to run repeatedly.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_checkins'
      AND policyname = 'daily_checkins_select'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS daily_checkins_select ON public.daily_checkins';
  END IF;
END $$;

CREATE POLICY daily_checkins_select
  ON public.daily_checkins
  FOR SELECT
  USING (
    -- Superusers can read all
    app.is_superuser()
    OR
    -- Users can read their own check-ins
    (user_id = auth.uid())
    OR
    -- Facility admins can read within their tenant
    (
      tenant_id IS NOT NULL
      AND public.is_facility_admin(tenant_id)
    )
    OR
    -- Any check-in explicitly shared with a group the user is a member of
    EXISTS (
      SELECT 1
      FROM public.checkin_group_shares cgs
      JOIN public.group_memberships gm
        ON gm.group_id = cgs.group_id
      WHERE cgs.checkin_id = id
        AND gm.user_id = auth.uid()
    )
  );

