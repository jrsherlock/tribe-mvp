# Anonymous Users in "Today's Check-ins" - Diagnostic Guide

## Problem

Users appearing as "Anonymous" in the Dashboard's "Today's Check-ins" section.

## Root Cause

The Dashboard code shows "Anonymous" when:
```typescript
user_name: profile?.display_name || 'Anonymous'
```

This happens in two scenarios:
1. **No profile exists** - User has no record in `user_profiles` table
2. **Empty display_name** - User profile exists but `display_name` is NULL or empty string

---

## Diagnostic Queries

Run these queries in your Supabase SQL Editor to identify the issue:

### 1. Find Users Without Profiles

```sql
-- Find users in auth.users who don't have a user_profiles record
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as user_created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL
ORDER BY au.created_at DESC;
```

**What this shows**: Users who signed up but never got a profile created.

---

### 2. Find Profiles with NULL or Empty Display Names

```sql
-- Find user profiles with missing display names
SELECT 
  up.id,
  up.user_id,
  au.email,
  up.display_name,
  up.created_at,
  up.updated_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.display_name IS NULL 
   OR up.display_name = ''
   OR TRIM(up.display_name) = ''
ORDER BY up.created_at DESC;
```

**What this shows**: Profiles that exist but have no display name set.

---

### 3. Find Users Who Checked In Today Without Proper Profiles

```sql
-- Find today's check-ins from users with missing/empty display names
SELECT 
  dc.id as checkin_id,
  dc.user_id,
  au.email,
  up.display_name,
  dc.created_at as checkin_time,
  CASE 
    WHEN up.id IS NULL THEN 'No profile exists'
    WHEN up.display_name IS NULL OR up.display_name = '' THEN 'Empty display_name'
    ELSE 'Has display_name'
  END as profile_status
FROM daily_checkins dc
JOIN auth.users au ON dc.user_id = au.id
LEFT JOIN user_profiles up ON dc.user_id = up.user_id
WHERE DATE(dc.created_at AT TIME ZONE 'America/Chicago') = CURRENT_DATE
  AND dc.is_private = false
  AND (up.id IS NULL OR up.display_name IS NULL OR up.display_name = '')
ORDER BY dc.created_at DESC;
```

**What this shows**: Today's check-ins that will appear as "Anonymous" on the dashboard.

---

## Fixes

### Fix 1: Create Missing Profiles

If users exist without profiles, create them:

```sql
-- Create profiles for users who don't have one
-- Uses email username as default display_name
INSERT INTO user_profiles (user_id, display_name, tenant_id)
SELECT 
  au.id,
  SPLIT_PART(au.email, '@', 1) as display_name,  -- Use email username
  NULL as tenant_id
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL
ON CONFLICT (user_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
DO NOTHING;
```

**Note**: Adjust the `ON CONFLICT` clause based on your `user_profiles` unique constraints.

---

### Fix 2: Update Empty Display Names

If profiles exist but display_name is empty:

```sql
-- Update empty display names with email username
UPDATE user_profiles up
SET 
  display_name = SPLIT_PART(au.email, '@', 1),
  updated_at = NOW()
FROM auth.users au
WHERE up.user_id = au.id
  AND (up.display_name IS NULL OR up.display_name = '' OR TRIM(up.display_name) = '');
```

---

### Fix 3: Set Default Display Name to "Anonymous" in Database

If you want "Anonymous" to be a proper value instead of a fallback:

```sql
-- Set display_name to 'Anonymous' for empty values
UPDATE user_profiles
SET 
  display_name = 'Anonymous',
  updated_at = NOW()
WHERE display_name IS NULL 
   OR display_name = '' 
   OR TRIM(display_name) = '';
```

---

## Prevention: Ensure Profile Creation on Signup

### Option A: Database Trigger (Recommended)

Create a trigger to automatically create a profile when a user signs up:

```sql
-- Function to create default profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1),
      'Anonymous'
    ),
    NULL
  )
  ON CONFLICT (user_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**What this does**: Automatically creates a `user_profiles` record whenever a new user signs up.

---

### Option B: Application-Level Fix

Ensure your signup flow creates a profile:

**In your signup/onboarding code:**

```typescript
// After user signs up
const { data: { user } } = await supabase.auth.signUp({
  email,
  password,
})

if (user) {
  // Create profile immediately
  await supabase.from('user_profiles').insert({
    user_id: user.id,
    display_name: email.split('@')[0], // Use email username as default
    tenant_id: null,
  })
}
```

---

## Verification

After applying fixes, verify with:

```sql
-- Should return 0 rows
SELECT COUNT(*) as anonymous_users
FROM user_profiles
WHERE display_name IS NULL 
   OR display_name = '' 
   OR TRIM(display_name) = '';

-- Should return 0 rows
SELECT COUNT(*) as users_without_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL;
```

---

## Recommended Approach

1. **Run diagnostic queries** to understand the scope
2. **Create missing profiles** (Fix 1)
3. **Update empty display names** (Fix 2)
4. **Add database trigger** (Prevention Option A) to prevent future issues
5. **Verify** no more anonymous users exist

---

## Alternative: Better Fallback Display

If you want to show email instead of "Anonymous" as fallback:

**Update Dashboard.tsx (lines 143-159):**

```typescript
const enrichedCheckins: RecentCheckin[] = (todayGroupCheckins as Checkin[]).map((checkin: Checkin) => {
  const profile = profileMap.get(checkin.user_id);
  const id = checkin.id as string | undefined;
  
  // Get user email for fallback
  const userEmail = checkin.user_email || ''; // You'd need to join this in the query
  const displayName = profile?.display_name || userEmail.split('@')[0] || 'Anonymous';
  
  return {
    _id: id ?? `${checkin.user_id}-${checkin.created_at}`,
    user_id: checkin.user_id,
    mental_rating: checkin.mental_rating,
    emotional_rating: checkin.emotional_rating,
    physical_rating: checkin.physical_rating,
    social_rating: checkin.social_rating,
    spiritual_rating: checkin.spiritual_rating,
    mood_emoji: checkin.mood_emoji,
    created_at: checkin.created_at as string,
    user_name: displayName,
    user_avatar_url: profile?.avatar_url || ''
  } as RecentCheckin;
});
```

**Note**: This requires fetching user emails along with check-ins.

---

## Summary

**Most likely cause**: Users signed up but profile creation failed or was skipped.

**Quick fix**: Run Fix 1 and Fix 2 SQL queries above.

**Long-term solution**: Add database trigger (Prevention Option A) to ensure all new users get profiles automatically.

**Verification**: Run verification queries to confirm no more anonymous users.

