-- Migration: Tribe Community Hub Schema
-- Description: Adds tables and columns for group events, photo albums, and enhanced group features
-- Date: 2025-01-07

-- =============================================
-- STEP 1: Enhance groups table
-- =============================================

-- Add cover_image_url and created_by columns to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for created_by lookups
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- =============================================
-- STEP 2: Create ENUM types for events
-- =============================================

-- Create enum for event location types
DO $$ BEGIN
  CREATE TYPE event_location_type AS ENUM ('virtual', 'physical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for RSVP status
DO $$ BEGIN
  CREATE TYPE rsvp_status AS ENUM ('going', 'not_going');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- STEP 3: Create group_events table
-- =============================================

CREATE TABLE IF NOT EXISTS group_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location_type event_location_type NOT NULL DEFAULT 'virtual',
  location_details TEXT, -- URL for virtual, address for physical
  event_image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT group_events_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  CONSTRAINT group_events_end_after_start CHECK (end_time > start_time)
);

-- Create indexes for group_events
CREATE INDEX IF NOT EXISTS idx_group_events_group ON group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_created_by ON group_events(created_by);
CREATE INDEX IF NOT EXISTS idx_group_events_start_time ON group_events(start_time);

-- =============================================
-- STEP 4: Create event_rsvps table
-- =============================================

CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (event_id, user_id)
);

-- Create indexes for event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(status);

-- =============================================
-- STEP 5: Create group_photo_albums table
-- =============================================

CREATE TABLE IF NOT EXISTS group_photo_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT group_photo_albums_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 100)
);

-- Create indexes for group_photo_albums
CREATE INDEX IF NOT EXISTS idx_group_photo_albums_group ON group_photo_albums(group_id);
CREATE INDEX IF NOT EXISTS idx_group_photo_albums_created_by ON group_photo_albums(created_by);

-- =============================================
-- STEP 6: Create group_photos table
-- =============================================

CREATE TABLE IF NOT EXISTS group_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES group_photo_albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT group_photos_caption_length CHECK (caption IS NULL OR char_length(caption) <= 500)
);

-- Create indexes for group_photos
CREATE INDEX IF NOT EXISTS idx_group_photos_album ON group_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_group_photos_user ON group_photos(user_id);

-- =============================================
-- STEP 7: Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on new tables
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_photos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for group_events
-- =============================================

-- Group members can view events in their groups
CREATE POLICY "Group members can view events" ON group_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_events.group_id 
        AND gm.user_id = auth.uid()
    )
    OR app.is_superuser()
  );

-- Group admins can create events
CREATE POLICY "Group admins can create events" ON group_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_events.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

-- Group admins can update events
CREATE POLICY "Group admins can update events" ON group_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_events.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

-- Group admins can delete events
CREATE POLICY "Group admins can delete events" ON group_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_events.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

-- =============================================
-- RLS Policies for event_rsvps
-- =============================================

-- Group members can view RSVPs for events in their groups
CREATE POLICY "Group members can view event rsvps" ON event_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_events ge
      JOIN group_memberships gm ON gm.group_id = ge.group_id
      WHERE ge.id = event_rsvps.event_id 
        AND gm.user_id = auth.uid()
    )
    OR app.is_superuser()
  );

-- Group members can create their own RSVPs
CREATE POLICY "Group members can create own rsvps" ON event_rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_events ge
      JOIN group_memberships gm ON gm.group_id = ge.group_id
      WHERE ge.id = event_rsvps.event_id 
        AND gm.user_id = auth.uid()
    )
  );

-- Users can update their own RSVPs
CREATE POLICY "Users can update own rsvps" ON event_rsvps
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete own rsvps" ON event_rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RLS Policies for group_photo_albums
-- =============================================

-- Group members can view albums in their groups
CREATE POLICY "Group members can view albums" ON group_photo_albums
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_photo_albums.group_id 
        AND gm.user_id = auth.uid()
    )
    OR app.is_superuser()
  );

-- Group members can create albums
CREATE POLICY "Group members can create albums" ON group_photo_albums
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_photo_albums.group_id 
        AND gm.user_id = auth.uid()
    )
    OR app.is_superuser()
  );

-- Album creators and group admins can update albums
CREATE POLICY "Album creators and admins can update albums" ON group_photo_albums
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_photo_albums.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

-- Album creators and group admins can delete albums
CREATE POLICY "Album creators and admins can delete albums" ON group_photo_albums
  FOR DELETE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_photo_albums.group_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

-- =============================================
-- RLS Policies for group_photos
-- =============================================

-- Group members can view photos in albums from their groups
CREATE POLICY "Group members can view photos" ON group_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_photo_albums gpa
      JOIN group_memberships gm ON gm.group_id = gpa.group_id
      WHERE gpa.id = group_photos.album_id 
        AND gm.user_id = auth.uid()
    )
    OR app.is_superuser()
  );

-- Group members can upload photos to albums in their groups
CREATE POLICY "Group members can upload photos" ON group_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_photo_albums gpa
      JOIN group_memberships gm ON gm.group_id = gpa.group_id
      WHERE gpa.id = group_photos.album_id 
        AND gm.user_id = auth.uid()
    )
    OR app.is_superuser()
  );

-- Photo uploaders and group admins can delete photos
CREATE POLICY "Photo uploaders and admins can delete photos" ON group_photos
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM group_photo_albums gpa
      JOIN group_memberships gm ON gm.group_id = gpa.group_id
      WHERE gpa.id = group_photos.album_id 
        AND gm.user_id = auth.uid()
        AND gm.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

