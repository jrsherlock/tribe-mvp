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

-- Users can view public profiles of others in their tenant
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
CREATE POLICY "Users can view tenant public profiles" ON user_profiles
    FOR SELECT USING (
        is_public = true AND auth.uid() IS NOT NULL AND tenant_id IS NOT NULL AND tenant_id = ANY (app.user_tenant_ids())
    );

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

-- Users can view check-ins shared with their groups (group-based visibility)
DROP POLICY IF EXISTS "Users can view public checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can view tenant public checkins" ON daily_checkins;
CREATE POLICY "Users can view group-shared checkins" ON daily_checkins
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND is_private = false
    AND tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM checkin_group_shares s
      JOIN group_memberships gm ON gm.group_id = s.group_id AND gm.user_id = auth.uid()
      WHERE s.checkin_id = daily_checkins.id
    )
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

-- =============================================
-- MULTI-TENANCY HELPERS AND POLICIES
-- =============================================

-- Superuser helper
CREATE OR REPLACE FUNCTION app.is_superuser()
RETURNS boolean AS $$
  SELECT EXISTS(SELECT 1 FROM superusers WHERE user_id = auth.uid());
$$ LANGUAGE sql STABLE;

-- RLS for superusers table
ALTER TABLE superusers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "User can view own superuser row" ON superusers
  FOR SELECT USING (user_id = auth.uid());

-- Helper schema and function to get current user's tenant ids
CREATE SCHEMA IF NOT EXISTS app;

-- Tenants: allow superusers full access
CREATE POLICY IF NOT EXISTS "Superusers can view tenants" ON tenants
  FOR SELECT USING (app.is_superuser());
CREATE POLICY IF NOT EXISTS "Superusers can insert tenants" ON tenants
  FOR INSERT WITH CHECK (app.is_superuser());
CREATE POLICY IF NOT EXISTS "Superusers can update tenants" ON tenants
  FOR UPDATE USING (app.is_superuser()) WITH CHECK (app.is_superuser());
CREATE POLICY IF NOT EXISTS "Superusers can delete tenants" ON tenants
  FOR DELETE USING (app.is_superuser());

-- Memberships: tenant admins or superusers can manage
CREATE POLICY IF NOT EXISTS "Tenant admins can view memberships" ON memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.user_id = auth.uid()
        AND m2.tenant_id = memberships.tenant_id
        AND m2.role IN ('OWNER','ADMIN')
    ) OR app.is_superuser()
  );

CREATE POLICY IF NOT EXISTS "Tenant admins can insert memberships" ON memberships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.user_id = auth.uid()
        AND m2.tenant_id = memberships.tenant_id
        AND m2.role IN ('OWNER','ADMIN')
    ) OR app.is_superuser()
  );

CREATE POLICY IF NOT EXISTS "Tenant admins can update memberships" ON memberships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.user_id = auth.uid()
        AND m2.tenant_id = memberships.tenant_id
        AND m2.role IN ('OWNER','ADMIN')
    ) OR app.is_superuser()
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.user_id = auth.uid()

-- Group membership admin policies (tenant admins or group admins)
CREATE POLICY IF NOT EXISTS "Admins can add users to groups" ON group_memberships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN memberships m ON m.user_id = auth.uid() AND m.tenant_id = g.tenant_id AND m.role IN ('OWNER','ADMIN')
      WHERE g.id = group_memberships.group_id
    )
    OR EXISTS (
      SELECT 1 FROM group_memberships gm_admin
      WHERE gm_admin.group_id = group_memberships.group_id
        AND gm_admin.user_id = auth.uid()
        AND gm_admin.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

CREATE POLICY IF NOT EXISTS "Admins can update group memberships" ON group_memberships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN memberships m ON m.user_id = auth.uid() AND m.tenant_id = g.tenant_id AND m.role IN ('OWNER','ADMIN')
      WHERE g.id = group_memberships.group_id
    )
    OR EXISTS (
      SELECT 1 FROM group_memberships gm_admin
      WHERE gm_admin.group_id = group_memberships.group_id
        AND gm_admin.user_id = auth.uid()
        AND gm_admin.role = 'ADMIN'
    )
    OR app.is_superuser()
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN memberships m ON m.user_id = auth.uid() AND m.tenant_id = g.tenant_id AND m.role IN ('OWNER','ADMIN')
      WHERE g.id = group_memberships.group_id
    )
    OR EXISTS (
      SELECT 1 FROM group_memberships gm_admin
      WHERE gm_admin.group_id = group_memberships.group_id
        AND gm_admin.user_id = auth.uid()
        AND gm_admin.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

-- Extend delete to allow group admins and superusers
DROP POLICY IF EXISTS "Admins can manage group memberships in tenant" ON group_memberships;
CREATE POLICY "Admins can remove group memberships" ON group_memberships
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM groups g
      JOIN memberships m ON m.tenant_id = g.tenant_id AND m.user_id = auth.uid() AND m.role IN ('OWNER','ADMIN')
      WHERE g.id = group_memberships.group_id
    )
    OR EXISTS (
      SELECT 1 FROM group_memberships gm_admin
      WHERE gm_admin.group_id = group_memberships.group_id
        AND gm_admin.user_id = auth.uid()
        AND gm_admin.role = 'ADMIN'
    )
    OR app.is_superuser()
  );

        AND m2.tenant_id = memberships.tenant_id
        AND m2.role IN ('OWNER','ADMIN')
    ) OR app.is_superuser()
  );

CREATE POLICY IF NOT EXISTS "Tenant admins can delete memberships" ON memberships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.user_id = auth.uid()
        AND m2.tenant_id = memberships.tenant_id
        AND m2.role IN ('OWNER','ADMIN')
    ) OR app.is_superuser()
  );

CREATE OR REPLACE FUNCTION app.user_tenant_ids()
RETURNS uuid[] AS $$
  SELECT COALESCE(array_agg(m.tenant_id), ARRAY[]::uuid[])
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Enable RLS for tenants and memberships
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Tenants: members can select their tenant metadata
CREATE POLICY "Members can view their tenants" ON tenants
  FOR SELECT USING (id = ANY (app.user_tenant_ids()));

-- Memberships: users can see their own memberships
CREATE POLICY "Users can view own memberships" ON memberships
  FOR SELECT USING (user_id = auth.uid());

-- Tie existing tables to tenant scope in addition to own-record policies above
-- user_profiles: already has own-record policies; allow selecting tenant public profiles (updated above)

-- photo_albums: allow tenant members to view public albums
CREATE POLICY IF NOT EXISTS "Tenant members can view public albums" ON photo_albums
  FOR SELECT USING (
    is_public = true AND auth.uid() IS NOT NULL AND tenant_id IS NOT NULL AND tenant_id = ANY (app.user_tenant_ids())
  );

-- album_photos: allow tenant members to view public photos in public albums
CREATE POLICY IF NOT EXISTS "Tenant members can view public photos" ON album_photos
  FOR SELECT USING (
    is_public = true AND auth.uid() IS NOT NULL AND tenant_id IS NOT NULL AND tenant_id = ANY (app.user_tenant_ids())
  );

-- feed_interactions: restrict by tenant
CREATE POLICY IF NOT EXISTS "Tenant members can view interactions" ON feed_interactions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND tenant_id IS NOT NULL AND tenant_id = ANY (app.user_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can insert interactions on public checkins" ON feed_interactions;
CREATE POLICY "Users can insert interactions on tenant public checkins" ON feed_interactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND tenant_id IS NOT NULL AND tenant_id = ANY (app.user_tenant_ids())
    AND EXISTS (
      SELECT 1 FROM daily_checkins
      WHERE daily_checkins.id = feed_interactions.checkin_id
      AND daily_checkins.is_private = false
      AND daily_checkins.tenant_id = feed_interactions.tenant_id
    )
  );

-- =============================================
-- GROUPS / MEMBERSHIPS / SHARES: RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_group_shares ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY IF NOT EXISTS "Tenant members can view groups" ON groups
  FOR SELECT USING (tenant_id = ANY (app.user_tenant_ids()));

CREATE POLICY IF NOT EXISTS "Admins can create groups" ON groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = groups.tenant_id
        AND m.role IN ('OWNER','ADMIN')
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can update groups" ON groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN groups g ON g.id = groups.id
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = g.tenant_id
        AND m.role IN ('OWNER','ADMIN')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN groups g ON g.id = groups.id
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = g.tenant_id
        AND m.role IN ('OWNER','ADMIN')
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can delete groups" ON groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN groups g ON g.id = groups.id
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = g.tenant_id
        AND m.role IN ('OWNER','ADMIN')
    )
  );

-- Group memberships policies
CREATE POLICY IF NOT EXISTS "Users can view own group memberships" ON group_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admins can view group memberships in tenant" ON group_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN memberships m ON m.tenant_id = g.tenant_id
      WHERE g.id = group_memberships.group_id AND m.user_id = auth.uid() AND m.role IN ('OWNER','ADMIN')
    )
  );

CREATE POLICY IF NOT EXISTS "Users can join groups in their tenant" ON group_memberships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM groups g
      JOIN memberships m ON m.user_id = auth.uid()
      WHERE g.id = group_memberships.group_id AND m.tenant_id = g.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Users can leave own group memberships" ON group_memberships
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can manage group memberships in tenant" ON group_memberships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM groups g JOIN memberships m ON m.tenant_id = g.tenant_id
      WHERE g.id = group_memberships.group_id AND m.user_id = auth.uid() AND m.role IN ('OWNER','ADMIN')
    )
  );

-- Check-in group shares policies
CREATE POLICY IF NOT EXISTS "Group members can view shares for their groups" ON checkin_group_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = checkin_group_shares.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Check-in owner can share to own groups" ON checkin_group_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_checkins dc
      WHERE dc.id = checkin_group_shares.checkin_id
        AND dc.user_id = auth.uid()
        AND dc.is_private = false
    )
    AND EXISTS (
      SELECT 1 FROM group_memberships gm
      JOIN groups g ON g.id = gm.group_id
      JOIN daily_checkins dc ON dc.id = checkin_group_shares.checkin_id
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = checkin_group_shares.group_id
        AND g.tenant_id = dc.tenant_id
    )
  );

CREATE POLICY IF NOT EXISTS "Check-in owner or admins can remove shares" ON checkin_group_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM daily_checkins dc
      WHERE dc.id = checkin_group_shares.checkin_id AND dc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM daily_checkins dc
      JOIN memberships m ON m.user_id = auth.uid() AND m.tenant_id = dc.tenant_id
      WHERE dc.id = checkin_group_shares.checkin_id AND m.role IN ('OWNER','ADMIN')
    )
  );

-- Tenants: owners can update/delete tenant metadata
CREATE POLICY IF NOT EXISTS "Tenant owners can update tenant" ON tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.tenant_id = tenants.id AND m.role = 'OWNER'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.tenant_id = tenants.id AND m.role = 'OWNER'
    )
  );

CREATE POLICY IF NOT EXISTS "Tenant owners can delete tenant" ON tenants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.tenant_id = tenants.id AND m.role = 'OWNER'
    )
  );

-- RPC to create a tenant, assign caller as OWNER, and auto-create Default Group via trigger
CREATE OR REPLACE FUNCTION public.create_tenant(p_name text, p_slug text)
RETURNS tenants
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE new_tenant tenants;
BEGIN
  INSERT INTO tenants(name, slug) VALUES (p_name, p_slug) RETURNING * INTO new_tenant;
  -- Ensure single-tenant constraint: set/overwrite caller's membership to this tenant as OWNER
  INSERT INTO memberships(user_id, tenant_id, role)
  VALUES (auth.uid(), new_tenant.id, 'OWNER')
  ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, role = 'OWNER';
  RETURN new_tenant;
END $$;

GRANT EXECUTE ON FUNCTION public.create_tenant(text, text) TO authenticated;


CREATE TRIGGER enforce_daily_checkin_limit_trigger
    BEFORE INSERT OR UPDATE ON daily_checkins
    FOR EACH ROW EXECUTE FUNCTION enforce_daily_checkin_limit();
