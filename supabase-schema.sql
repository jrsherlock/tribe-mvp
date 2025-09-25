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
