-- Row Level Security (RLS) Policies for Sangha
-- HIPAA-Compliant Security for Addiction Recovery Platform

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER PROFILES POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Users can view public profiles of others
CREATE POLICY "Users can view public profiles" ON user_profiles
    FOR SELECT USING (is_public = true AND auth.uid() IS NOT NULL);

-- =============================================
-- DAILY CHECK-INS POLICIES
-- =============================================

-- Users can view their own check-ins
CREATE POLICY "Users can view own checkins" ON daily_checkins
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own check-ins
CREATE POLICY "Users can insert own checkins" ON daily_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own check-ins
CREATE POLICY "Users can update own checkins" ON daily_checkins
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own check-ins
CREATE POLICY "Users can delete own checkins" ON daily_checkins
    FOR DELETE USING (auth.uid() = user_id);

-- Users can view public check-ins from others (for community feed)
CREATE POLICY "Users can view public checkins" ON daily_checkins
    FOR SELECT USING (
        is_private = false 
        AND auth.uid() IS NOT NULL 
        AND created_at >= NOW() - INTERVAL '30 days'
    );

-- =============================================
-- PHOTO ALBUMS POLICIES
-- =============================================

-- Users can view their own albums
CREATE POLICY "Users can view own albums" ON photo_albums
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own albums
CREATE POLICY "Users can insert own albums" ON photo_albums
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own albums
CREATE POLICY "Users can update own albums" ON photo_albums
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own albums
CREATE POLICY "Users can delete own albums" ON photo_albums
    FOR DELETE USING (auth.uid() = user_id);

-- Users can view public albums from others
CREATE POLICY "Users can view public albums" ON photo_albums
    FOR SELECT USING (
        is_public = true 
        AND auth.uid() IS NOT NULL
    );

-- =============================================
-- ALBUM PHOTOS POLICIES
-- =============================================

-- Users can view their own photos
CREATE POLICY "Users can view own photos" ON album_photos
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own photos
CREATE POLICY "Users can insert own photos" ON album_photos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos
CREATE POLICY "Users can update own photos" ON album_photos
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos" ON album_photos
    FOR DELETE USING (auth.uid() = user_id);

-- Users can view public photos from public albums
CREATE POLICY "Users can view public photos" ON album_photos
    FOR SELECT USING (
        is_public = true 
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM photo_albums 
            WHERE photo_albums.id = album_photos.album_id 
            AND photo_albums.is_public = true
        )
    );

-- =============================================
-- FEED INTERACTIONS POLICIES
-- =============================================

-- Users can view interactions on public check-ins
CREATE POLICY "Users can view interactions on public checkins" ON feed_interactions
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM daily_checkins 
            WHERE daily_checkins.id = feed_interactions.checkin_id 
            AND daily_checkins.is_private = false
        )
    );

-- Users can view their own interactions
CREATE POLICY "Users can view own interactions" ON feed_interactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert interactions on public check-ins
CREATE POLICY "Users can insert interactions on public checkins" ON feed_interactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM daily_checkins 
            WHERE daily_checkins.id = feed_interactions.checkin_id 
            AND daily_checkins.is_private = false
        )
    );

-- Users can update their own interactions
CREATE POLICY "Users can update own interactions" ON feed_interactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own interactions
CREATE POLICY "Users can delete own interactions" ON feed_interactions
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function to check if user can access another user's data
CREATE OR REPLACE FUNCTION can_access_user_data(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Users can always access their own data
    IF auth.uid() = target_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if target user has public profile
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = target_user_id 
        AND is_public = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's privacy settings
CREATE OR REPLACE FUNCTION get_user_privacy_settings(target_user_id UUID)
RETURNS TABLE(is_public BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT user_profiles.is_public
    FROM user_profiles
    WHERE user_profiles.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- AUDIT LOGGING (Optional for HIPAA compliance)
-- =============================================

-- Create audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    user_id UUID REFERENCES auth.users(id),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow viewing audit logs for own data
CREATE POLICY "Users can view own audit logs" ON audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_user_profiles
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_daily_checkins
    AFTER INSERT OR UPDATE OR DELETE ON daily_checkins
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- =============================================
-- ADDITIONAL SECURITY MEASURES
-- =============================================

-- Prevent users from creating profiles for other users
CREATE OR REPLACE FUNCTION prevent_profile_spoofing()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure user_id matches authenticated user
    IF NEW.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot create profile for another user';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_profile_spoofing_trigger
    BEFORE INSERT ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION prevent_profile_spoofing();

-- Rate limiting for check-ins (one per day per user)
CREATE OR REPLACE FUNCTION enforce_daily_checkin_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user already has a check-in for this date
    IF EXISTS (
        SELECT 1 FROM daily_checkins 
        WHERE user_id = NEW.user_id 
        AND checkin_date = NEW.checkin_date
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'Only one check-in allowed per day';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_daily_checkin_limit_trigger
    BEFORE INSERT OR UPDATE ON daily_checkins
    FOR EACH ROW EXECUTE FUNCTION enforce_daily_checkin_limit();
