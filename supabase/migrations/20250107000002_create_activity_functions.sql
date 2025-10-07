-- Migration: Create RPC functions for activity tracking and streak calculation

-- Function 1: record_user_activity
-- Purpose: Mark user as active for the current day
-- This should be called when the user loads the app

CREATE OR REPLACE FUNCTION public.record_user_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update the activity record for today
  INSERT INTO public.daily_user_activity (user_id, activity_date, was_active, updated_at)
  VALUES (auth.uid(), CURRENT_DATE, TRUE, NOW())
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    was_active = TRUE,
    updated_at = NOW();
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.record_user_activity IS 'Records that the current user was active today. Called on app load.';


-- Function 2: record_check_in_activity
-- Purpose: Mark that user completed their MEPSS check-in for the current day
-- This should be called when a user successfully submits a check-in

CREATE OR REPLACE FUNCTION public.record_check_in_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update the activity record for today
  INSERT INTO public.daily_user_activity (user_id, activity_date, completed_check_in, updated_at)
  VALUES (auth.uid(), CURRENT_DATE, TRUE, NOW())
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    completed_check_in = TRUE,
    updated_at = NOW();
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.record_check_in_activity IS 'Records that the current user completed their MEPSS check-in today.';


-- Function 3: get_user_streaks
-- Purpose: Calculate both engagement and check-in streaks for the current user
-- Returns: JSON object with engagement_streak and check_in_streak counts

CREATE OR REPLACE FUNCTION public.get_user_streaks()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_engagement_streak INT := 0;
  v_check_in_streak INT := 0;
  v_current_date DATE;
  v_check_date DATE;
  v_was_active BOOLEAN;
  v_completed_check_in BOOLEAN;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'engagement_streak', 0,
      'check_in_streak', 0
    );
  END IF;
  
  -- Start from today
  v_current_date := CURRENT_DATE;
  v_check_date := v_current_date;
  
  -- Calculate engagement streak (consecutive days with was_active = true)
  LOOP
    -- Check if user was active on this date
    SELECT was_active INTO v_was_active
    FROM public.daily_user_activity
    WHERE user_id = v_user_id AND activity_date = v_check_date;
    
    -- If no record or not active, break the streak
    IF v_was_active IS NULL OR v_was_active = FALSE THEN
      EXIT;
    END IF;
    
    -- Increment streak and check previous day
    v_engagement_streak := v_engagement_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;
  
  -- Reset check date for check-in streak calculation
  v_check_date := v_current_date;
  
  -- Calculate check-in streak (consecutive days with completed_check_in = true)
  LOOP
    -- Check if user completed check-in on this date
    SELECT completed_check_in INTO v_completed_check_in
    FROM public.daily_user_activity
    WHERE user_id = v_user_id AND activity_date = v_check_date;
    
    -- If no record or check-in not completed, break the streak
    IF v_completed_check_in IS NULL OR v_completed_check_in = FALSE THEN
      EXIT;
    END IF;
    
    -- Increment streak and check previous day
    v_check_in_streak := v_check_in_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;
  
  -- Return both streaks as JSON
  RETURN json_build_object(
    'engagement_streak', v_engagement_streak,
    'check_in_streak', v_check_in_streak
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_user_streaks IS 'Calculates and returns the current users engagement and check-in streaks as JSON';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.record_user_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_check_in_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_streaks() TO authenticated;

