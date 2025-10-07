-- Migration: Create Personal Goals and Goal Progress tables
-- Description: Implements personal goal tracking with streak-based progress
-- Date: 2025-10-07

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Goal frequency types
CREATE TYPE goal_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- ============================================================================
-- USER_GOALS TABLE
-- ============================================================================
-- Purpose: Store user-defined personal goals
-- Multi-tenancy: Scoped by user_id and optional tenant_id
-- Privacy: is_public flag controls visibility

CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Goal identification and details
  goal_key TEXT NOT NULL, -- Unique key for programmatic access (e.g., 'daily_meditation')
  title TEXT NOT NULL,
  description TEXT,
  
  -- Goal configuration
  frequency goal_frequency NOT NULL DEFAULT 'daily',
  target_count INTEGER DEFAULT 1, -- How many times per frequency period
  is_public BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_goals_user_key_unique UNIQUE (user_id, goal_key),
  CONSTRAINT user_goals_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  CONSTRAINT user_goals_description_length CHECK (char_length(description) <= 1000),
  CONSTRAINT user_goals_target_count_positive CHECK (target_count > 0)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_tenant_id ON user_goals(tenant_id);

-- ============================================================================
-- GOAL_PROGRESS TABLE
-- ============================================================================
-- Purpose: Track when users log progress toward their goals
-- Used to calculate streaks

CREATE TABLE IF NOT EXISTS goal_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- When the progress was logged
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: One progress entry per goal per day
  CONSTRAINT goal_progress_goal_date_unique UNIQUE (goal_id, DATE(logged_at))
);

-- Indexes for faster streak calculations
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_user_id ON goal_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_logged_at ON goal_progress(logged_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;

-- USER_GOALS POLICIES
-- Users can only manage their own goals

-- Policy: Users can view their own goals
CREATE POLICY user_goals_select_own ON user_goals
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own goals
CREATE POLICY user_goals_insert_own ON user_goals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own goals
CREATE POLICY user_goals_update_own ON user_goals
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own goals
CREATE POLICY user_goals_delete_own ON user_goals
  FOR DELETE
  USING (user_id = auth.uid());

-- GOAL_PROGRESS POLICIES
-- Users can only manage their own progress

-- Policy: Users can view their own progress
CREATE POLICY goal_progress_select_own ON goal_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own progress
CREATE POLICY goal_progress_insert_own ON goal_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own progress (for corrections)
CREATE POLICY goal_progress_delete_own ON goal_progress
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RPC FUNCTION: log_goal_progress
-- ============================================================================
-- Purpose: Log progress for a goal by its unique key
-- Security: SECURITY DEFINER to ensure proper access control
-- Returns: The created goal_progress record

CREATE OR REPLACE FUNCTION log_goal_progress(p_goal_key TEXT)
RETURNS goal_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal user_goals;
  v_progress goal_progress;
  v_today DATE;
BEGIN
  -- Get today's date
  v_today := CURRENT_DATE;
  
  -- Find the goal for the current user
  SELECT * INTO v_goal
  FROM user_goals
  WHERE user_id = auth.uid()
    AND goal_key = p_goal_key;
  
  -- If goal doesn't exist, raise error
  IF v_goal IS NULL THEN
    RAISE EXCEPTION 'Goal with key % not found for current user', p_goal_key;
  END IF;
  
  -- Check if progress already logged today
  SELECT * INTO v_progress
  FROM goal_progress
  WHERE goal_id = v_goal.id
    AND DATE(logged_at) = v_today;
  
  -- If already logged today, return existing record
  IF v_progress IS NOT NULL THEN
    RETURN v_progress;
  END IF;
  
  -- Insert new progress record
  INSERT INTO goal_progress (goal_id, user_id, logged_at)
  VALUES (v_goal.id, auth.uid(), NOW())
  RETURNING * INTO v_progress;
  
  RETURN v_progress;
END;
$$;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to user_goals table
CREATE TRIGGER user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_goals_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for reference only)
-- ============================================================================
-- Run these queries in the Supabase SQL Editor to verify:
--
-- -- List all policies on user_goals
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'user_goals';
--
-- -- List all policies on goal_progress
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'goal_progress';
--
-- -- Verify RLS is enabled
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('user_goals', 'goal_progress')
--   AND schemaname = 'public';

