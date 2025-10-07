-- Migration: Auto-migrate solo check-ins when user joins a facility
-- Date: 2025-10-07
-- Purpose: When a user joins a facility, migrate their solo mode check-ins to facility mode
--          This ensures users see their complete check-in history in the facility context

-- Function to migrate user's solo check-ins to a facility
CREATE OR REPLACE FUNCTION migrate_solo_checkins_to_facility()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new tenant membership is created (user joins a facility)
  -- Migrate all their solo mode check-ins to the facility
  UPDATE public.daily_checkins
  SET tenant_id = NEW.tenant_id
  WHERE user_id = NEW.user_id
    AND tenant_id IS NULL;  -- Only migrate solo mode check-ins
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after a new tenant membership is inserted
DROP TRIGGER IF EXISTS migrate_checkins_on_tenant_join ON public.tenant_members;
CREATE TRIGGER migrate_checkins_on_tenant_join
  AFTER INSERT ON public.tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION migrate_solo_checkins_to_facility();

-- Comment explaining the trigger
COMMENT ON TRIGGER migrate_checkins_on_tenant_join ON public.tenant_members IS 
  'Automatically migrates a user''s solo mode check-ins to facility mode when they join a facility. This ensures users see their complete check-in history in the facility context.';

COMMENT ON FUNCTION migrate_solo_checkins_to_facility() IS 
  'Migrates all solo mode check-ins (tenant_id = NULL) to the facility context when a user joins a facility. This is triggered automatically when a new tenant_members record is created.';

