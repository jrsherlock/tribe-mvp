# Understanding auth.users vs user_profiles in Your Platform

**Date**: 2025-01-07  
**Database**: sangha-mvp-dev (Supabase)

---

## 🎯 Quick Answer: What's the Difference?

### `auth.users` (Supabase System Table)
- **Managed by**: Supabase Auth system (you don't control this directly)
- **Purpose**: Authentication credentials and session management
- **Contains**: Email, password hash, auth tokens, login timestamps
- **Think of it as**: The "login account" - handles WHO can access your app

### `user_profiles` (Your Application Table)
- **Managed by**: Your application code
- **Purpose**: User profile data and application-specific information
- **Contains**: Display name, bio, avatar, sobriety date, tenant membership
- **Think of it as**: The "user persona" - handles WHAT users do in your app

---

## 🔗 The Relationship: One-to-One with CASCADE Delete

### Foreign Key Configuration

```sql
user_profiles.user_id → auth.users.id
  ON DELETE CASCADE
  ON UPDATE NO ACTION
```

**What this means**:
- ✅ **One-to-One**: Each auth user has exactly ONE profile (enforced by unique constraint)
- ✅ **Automatic Cleanup**: When you delete a user from `auth.users`, their profile is automatically deleted
- ✅ **Data Integrity**: You can't create a profile without a valid auth user
- ✅ **Orphan Prevention**: Profiles can't exist without their auth user

### Current State of Your Database

```
Total auth.users: 12
Total user_profiles: 12
Users without profiles: 0 ✅
Orphaned profiles: 0 ✅
Users with multiple profiles: 0 ✅
```

**Status**: Perfect 1:1 relationship maintained!

---

## 📊 Why Are Display Names Empty in auth.users?

### The Answer: Supabase Doesn't Store Display Names in auth.users

Looking at your `auth.users` table structure:

```json
{
  "id": "1a2741bb-8dfb-470e-b1b4-f66b7b8c8088",
  "email": "shertechai@gmail.com",
  "phone": null,  // ← Only phone is stored here
  "raw_user_meta_data": {
    "sub": "...",
    "email": "...",
    "email_verified": true,
    "phone_verified": false
    // ❌ NO display_name here!
  },
  "raw_app_meta_data": {
    "provider": "email",
    "providers": ["email"]
  }
}
```

**Why?**
- `auth.users` is a **Supabase system table** for authentication only
- It stores: email, phone, password hash, OAuth tokens, session data
- It does NOT store: display names, bios, avatars, or any app-specific data
- **This is by design** - Supabase separates auth from profile data

**Where ARE the display names?**
- In `user_profiles.display_name` - YOUR application table
- This is the correct architecture!

### Your Display Names ARE Present (in user_profiles)

```sql
-- All 12 users have display names in user_profiles:
Abraham Lincoln
Kirk Ferentz
Alfred E Newman
Navin R Johnson
Higher Power Hank
Emily Rodriguez
David Thompson
Sarah Johnson
Lisa Martinez
Michael Chen
James Sherlock Cybercade
Jim Sherlock
```

---

## 🔄 How Users Are Created: The Trigger System

### The `handle_new_user()` Trigger

When a user signs up via Supabase Auth:

1. **User signs up** → Supabase creates record in `auth.users`
2. **Trigger fires** → `on_auth_user_created` trigger executes
3. **Profile created** → `handle_new_user()` function runs
4. **Display name set** → Uses email username as default (e.g., "shertechai" from "shertechai@gmail.com")

**Trigger Definition** (from your migration):
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Function Logic**:
```sql
INSERT INTO public.user_profiles (
  user_id, 
  display_name,  -- ← Defaults to email username
  tenant_id,     -- ← NULL (solo user)
  bio,
  avatar_url,
  location,
  is_public
)
VALUES (
  NEW.id,
  COALESCE(
    NEW.raw_user_meta_data->>'display_name',  -- From signup metadata
    SPLIT_PART(NEW.email, '@', 1),             -- Email username
    'User'                                      -- Final fallback
  ),
  NULL,  -- Solo user (no tenant)
  '',
  '',
  '',
  true
)
```

**This is why**:
- Every user automatically gets a profile
- Display names default to email username
- New users start as "solo" users (tenant_id = NULL)

---

## 🗑️ The 5 Test Users with "Garbage UIDs"

### Identified Test Data

These are the 5 users with repeating-digit UUIDs (test/seed data):

| UID | Email | Display Name | Last Sign In | Group Memberships |
|-----|-------|--------------|--------------|-------------------|
| `11111111-1111-1111-1111-111111111111` | sarah.johnson@example.com | Sarah Johnson | Never | 1 |
| `22222222-2222-2222-2222-222222222222` | michael.chen@example.com | Michael Chen | Never | 1 |
| `33333333-3333-3333-3333-333333333333` | emily.r@example.com | Emily Rodriguez | Never | 1 |
| `44444444-4444-4444-4444-444444444444` | david.t@example.com | David Thompson | Never | 1 |
| `55555555-5555-5555-5555-555555555555` | lisa.m@example.com | Lisa Martinez | Never | 0 |

### What Data Will Be Deleted?

**Direct deletions** (CASCADE from auth.users):
- ✅ 5 records from `auth.users`
- ✅ 5 records from `user_profiles` (CASCADE)

**Related data** (CASCADE from user_id):
- ✅ 4 records from `group_memberships` (4 users are in groups)
- ✅ 0 records from `daily_checkins` (no check-ins)
- ✅ 0 records from `tenant_members` (not in any tenants)
- ✅ 0 records from `feed_interactions` (no interactions)
- ✅ 0 records from `photo_albums` (no albums)

**Impact**: Minimal - these are test users with no real activity

---

## 📋 Data Architecture Summary

### Two-Table User System

```
┌─────────────────────────────────────────────────────────────┐
│                     auth.users (Supabase)                    │
│  - id (UUID)                                                 │
│  - email                                                     │
│  - encrypted_password                                        │
│  - email_confirmed_at                                        │
│  - last_sign_in_at                                          │
│  - raw_user_meta_data (JSON)                                │
│  - raw_app_meta_data (JSON)                                 │
│                                                              │
│  Purpose: Authentication & Session Management                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ user_id (FK, CASCADE)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  user_profiles (Your App)                    │
│  - id (UUID, PK)                                            │
│  - user_id (UUID, FK → auth.users.id, UNIQUE)              │
│  - display_name                                             │
│  - bio                                                       │
│  - avatar_url                                               │
│  - sobriety_date                                            │
│  - addiction_type                                           │
│  - tenant_id (FK → tenants.id, SET NULL)                   │
│  - is_public                                                │
│                                                              │
│  Purpose: User Profile & Application Data                   │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Relationships

```
user_profiles.tenant_id → tenants.id (SET NULL on delete)
  - NULL = Solo user (no facility)
  - UUID = Member of a facility
```

**Your current users**:
- **6 users** in "Top of the World Ranch" facility (tenant_id = a77d4b1b...)
- **6 users** are solo users (tenant_id = NULL)

---

## 🎯 Key Takeaways

### 1. **auth.users is NOT your user table**
- It's Supabase's authentication system
- You don't add custom fields here
- Display names, bios, etc. go in `user_profiles`

### 2. **user_profiles is your user table**
- This is where all user data lives
- This is what your app queries
- This is what users edit in their profile

### 3. **The relationship is automatic**
- Trigger creates profiles when users sign up
- CASCADE deletes profiles when users are deleted
- Unique constraint prevents duplicate profiles

### 4. **Display names ARE present**
- Just not in `auth.users` (by design)
- They're in `user_profiles.display_name`
- Your app correctly fetches them via `useAuth()` hook

### 5. **Test data is safe to delete**
- 5 users with repeating-digit UUIDs
- No real activity (never signed in)
- Only 4 group memberships will be removed

---

## 🚀 Next Steps

### Option 1: Delete Test Users via SQL

```sql
-- This will CASCADE delete from user_profiles and group_memberships
DELETE FROM auth.users 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
```

### Option 2: Delete via Supabase Dashboard

1. Go to Authentication → Users
2. Select the 5 test users
3. Click "Delete users"
4. Confirm deletion

**Both methods are safe** - CASCADE will clean up all related data automatically.

---

## 📚 Additional Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Row Level Security**: Your RLS policies protect user data
- **Trigger Functions**: Auto-create profiles on signup
- **Foreign Keys**: Maintain data integrity across tables

