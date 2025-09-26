-- Sangha Database Schema for Supabase
-- Addiction Recovery Support Platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE addiction_type AS ENUM ('alcohol', 'drugs', 'gambling', 'smoking', 'other');
CREATE TYPE interaction_type AS ENUM ('comment', 'emoji_reaction');

-- =============================================
-- USER PROFILES TABLE
-- =============================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Anonymous',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    sobriety_date TIMESTAMPTZ,
    addiction_type addiction_type,
    location TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id),
    CONSTRAINT user_profiles_display_name_length CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 100),
    CONSTRAINT user_profiles_bio_length CHECK (char_length(bio) <= 1000),
    CONSTRAINT user_profiles_location_length CHECK (char_length(location) <= 200)
);

-- =============================================
-- DAILY CHECK-INS TABLE
-- =============================================
CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,

    -- MEPSS Ratings (1-10 scale)
    mental_rating INTEGER NOT NULL CHECK (mental_rating >= 1 AND mental_rating <= 10),
    emotional_rating INTEGER NOT NULL CHECK (emotional_rating >= 1 AND emotional_rating <= 10),
    physical_rating INTEGER NOT NULL CHECK (physical_rating >= 1 AND physical_rating <= 10),
    social_rating INTEGER NOT NULL CHECK (social_rating >= 1 AND social_rating <= 10),
    spiritual_rating INTEGER NOT NULL CHECK (spiritual_rating >= 1 AND spiritual_rating <= 10),

    -- Notes for each dimension
    mental_notes TEXT DEFAULT '',
    emotional_notes TEXT DEFAULT '',
    physical_notes TEXT DEFAULT '',
    social_notes TEXT DEFAULT '',
    spiritual_notes TEXT DEFAULT '',

    -- Emojis for each dimension (stored as JSON arrays)
    mental_emojis JSONB DEFAULT '[]',
    emotional_emojis JSONB DEFAULT '[]',
    physical_emojis JSONB DEFAULT '[]',
    social_emojis JSONB DEFAULT '[]',
    spiritual_emojis JSONB DEFAULT '[]',

    -- Gratitude entries
    gratitude JSONB DEFAULT '[]',

    -- Privacy and mood
    is_private BOOLEAN DEFAULT false,
    mood_emoji TEXT DEFAULT '😊',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT daily_checkins_user_date_unique UNIQUE (user_id, checkin_date),
    CONSTRAINT daily_checkins_notes_length CHECK (
        char_length(mental_notes) <= 1000 AND
        char_length(emotional_notes) <= 1000 AND
        char_length(physical_notes) <= 1000 AND
        char_length(social_notes) <= 1000 AND
        char_length(spiritual_notes) <= 1000
    )
);

-- =============================================
-- PHOTO ALBUMS TABLE
-- =============================================
CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_photo_url TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT false,
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT photo_albums_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 100),
    CONSTRAINT photo_albums_description_length CHECK (char_length(description) <= 500),
    CONSTRAINT photo_albums_photo_count_positive CHECK (photo_count >= 0)
);

-- =============================================
-- ALBUM PHOTOS TABLE
-- =============================================
CREATE TABLE album_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT false,
    file_size INTEGER,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT album_photos_caption_length CHECK (char_length(caption) <= 300),
    CONSTRAINT album_photos_file_size_positive CHECK (file_size > 0)
);

-- =============================================
-- FEED INTERACTIONS TABLE
-- =============================================
CREATE TABLE feed_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES daily_checkins(id) ON DELETE CASCADE,
    interaction_type interaction_type NOT NULL,
    content TEXT, -- For comments
    emoji TEXT,   -- For emoji reactions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT feed_interactions_content_or_emoji CHECK (
        (interaction_type = 'comment' AND content IS NOT NULL AND emoji IS NULL) OR
        (interaction_type = 'emoji_reaction' AND emoji IS NOT NULL AND content IS NULL)
    ),
    CONSTRAINT feed_interactions_content_length CHECK (char_length(content) <= 1000)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_is_public ON user_profiles(is_public) WHERE is_public = true;

-- Daily check-ins indexes
CREATE INDEX idx_daily_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX idx_daily_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX idx_daily_checkins_user_date ON daily_checkins(user_id, checkin_date);
CREATE INDEX idx_daily_checkins_public ON daily_checkins(is_private, created_at) WHERE is_private = false;

-- Photo albums indexes
CREATE INDEX idx_photo_albums_user_id ON photo_albums(user_id);
CREATE INDEX idx_photo_albums_public ON photo_albums(is_public) WHERE is_public = true;

-- Album photos indexes
CREATE INDEX idx_album_photos_user_id ON album_photos(user_id);
CREATE INDEX idx_album_photos_album_id ON album_photos(album_id);

-- Feed interactions indexes
CREATE INDEX idx_feed_interactions_checkin_id ON feed_interactions(checkin_id);
CREATE INDEX idx_feed_interactions_user_id ON feed_interactions(user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_checkins_updated_at BEFORE UPDATE ON daily_checkins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photo_albums_updated_at BEFORE UPDATE ON photo_albums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feed_interactions_updated_at BEFORE UPDATE ON feed_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRIGGER FOR PHOTO COUNT MANAGEMENT
-- =============================================

-- Function to update album photo count
CREATE OR REPLACE FUNCTION update_album_photo_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE photo_albums
        SET photo_count = photo_count + 1, updated_at = NOW()
        WHERE id = NEW.album_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE photo_albums
        SET photo_count = photo_count - 1, updated_at = NOW()
        WHERE id = OLD.album_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply photo count triggers
CREATE TRIGGER album_photos_count_trigger
    AFTER INSERT OR DELETE ON album_photos
    FOR EACH ROW EXECUTE FUNCTION update_album_photo_count();


-- =============================================
-- MULTI-TENANCY (tenants, memberships, tenant_id columns)
-- =============================================

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Superusers table for system-wide administrators
CREATE TABLE IF NOT EXISTS superusers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Seed a default SuperUser by email (idempotent). Safe to run multiple times.
INSERT INTO superusers(user_id)
SELECT id FROM auth.users WHERE email = 'jrsherlock@gmail.com'
ON CONFLICT (user_id) DO NOTHING;



-- Memberships table (a user can belong to many tenants)
CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);

-- Add tenant_id to existing tables (nullable indicates solo users)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE feed_interactions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- Adjust unique constraints for multi-tenancy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='user_profiles' AND constraint_name='user_profiles_user_id_unique'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_id_unique;
  END IF;
END $$;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_tenant_unique UNIQUE (user_id, tenant_id);

-- Indexes for tenant scoping
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_tenant ON daily_checkins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_photo_albums_tenant ON photo_albums(tenant_id);
CREATE INDEX IF NOT EXISTS idx_album_photos_tenant ON album_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feed_interactions_tenant ON feed_interactions(tenant_id);



-- =============================================
-- GROUPS AND SHARING STRUCTURE (within tenants)
-- =============================================

-- Each group belongs to exactly one tenant
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users belong to multiple groups, but only within their (single) tenant
CREATE TABLE IF NOT EXISTS group_memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Check-ins can be shared to one or more groups within the same tenant
CREATE TABLE IF NOT EXISTS checkin_group_shares (
  checkin_id UUID NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (checkin_id, group_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_groups_tenant ON groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(role);
CREATE INDEX IF NOT EXISTS idx_checkin_group_shares_checkin ON checkin_group_shares(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_group_shares_group ON checkin_group_shares(group_id);

-- Enforce the business rule: users can only be tied to zero or one tenant
-- (previously allowed many; now enforce a single membership per user)
CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_single_tenant ON memberships(user_id);

-- Trigger: auto-create a "Default Group" when a new tenant is created
CREATE OR REPLACE FUNCTION create_default_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO groups (tenant_id, name)
  VALUES (NEW.id, 'Default Group');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tenants_auto_default_group'
  ) THEN
    CREATE TRIGGER tenants_auto_default_group
      AFTER INSERT ON tenants
      FOR EACH ROW EXECUTE FUNCTION create_default_group();
  END IF;
END $$;

-- Trigger to ensure group_memberships are within the same tenant
CREATE OR REPLACE FUNCTION enforce_group_membership_tenant_match()
RETURNS TRIGGER AS $$
DECLARE
  grp_tenant UUID;
  usr_tenant UUID;
BEGIN
  SELECT tenant_id INTO grp_tenant FROM groups WHERE id = NEW.group_id;
  SELECT tenant_id INTO usr_tenant FROM memberships WHERE user_id = NEW.user_id;

  IF grp_tenant IS NULL THEN
    RAISE EXCEPTION 'Group % not found or has no tenant', NEW.group_id;
  END IF;

  IF usr_tenant IS NULL THEN
    -- solo user trying to join a tenant group
    RAISE EXCEPTION 'User % is not assigned to a tenant; cannot join tenant groups', NEW.user_id;
  END IF;

  IF grp_tenant <> usr_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch between user and group';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'group_memberships_tenant_guard'
  ) THEN
    CREATE TRIGGER group_memberships_tenant_guard
      BEFORE INSERT ON group_memberships
      FOR EACH ROW EXECUTE FUNCTION enforce_group_membership_tenant_match();
  END IF;
END $$;

-- Trigger to ensure check-in shares are consistent (same tenant and owner is member of the group)
CREATE OR REPLACE FUNCTION enforce_checkin_share_integrity()
RETURNS TRIGGER AS $$
DECLARE
  chk_user UUID;
  chk_tenant UUID;
  grp_tenant UUID;
  has_membership BOOLEAN;
BEGIN
  SELECT user_id, tenant_id INTO chk_user, chk_tenant FROM daily_checkins WHERE id = NEW.checkin_id;
  IF chk_user IS NULL THEN
    RAISE EXCEPTION 'Check-in % not found', NEW.checkin_id;
  END IF;

  SELECT tenant_id INTO grp_tenant FROM groups WHERE id = NEW.group_id;
  IF grp_tenant IS NULL THEN
    RAISE EXCEPTION 'Group % not found', NEW.group_id;
  END IF;

  IF chk_tenant IS NULL OR grp_tenant IS NULL OR chk_tenant <> grp_tenant THEN
    RAISE EXCEPTION 'Check-in and group must belong to the same tenant';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM group_memberships gm WHERE gm.user_id = chk_user AND gm.group_id = NEW.group_id
  ) INTO has_membership;
  IF NOT has_membership THEN
    RAISE EXCEPTION 'Owner of the check-in must be a member of the target group';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'checkin_group_shares_guard'
  ) THEN
    CREATE TRIGGER checkin_group_shares_guard
      BEFORE INSERT ON checkin_group_shares
      FOR EACH ROW EXECUTE FUNCTION enforce_checkin_share_integrity();
  END IF;
END $$;

-- Trigger to set/validate tenant_id on daily_checkins based on the user's membership
CREATE OR REPLACE FUNCTION set_daily_checkin_tenant()
RETURNS TRIGGER AS $$
DECLARE
  usr_tenant UUID;
BEGIN
  SELECT tenant_id INTO usr_tenant FROM memberships WHERE user_id = NEW.user_id;

  IF usr_tenant IS NULL THEN
    -- solo user: ensure tenant_id is NULL
    NEW.tenant_id := NULL;
  ELSE
    -- assigned user: enforce tenant_id equals membership tenant
    NEW.tenant_id := usr_tenant;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'daily_checkins_set_tenant'
  ) THEN
    CREATE TRIGGER daily_checkins_set_tenant
      BEFORE INSERT OR UPDATE OF user_id ON daily_checkins
      FOR EACH ROW EXECUTE FUNCTION set_daily_checkin_tenant();
  END IF;
END $$;
