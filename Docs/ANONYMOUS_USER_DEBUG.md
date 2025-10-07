# Anonymous User Display Issue - Debugging Guide

## Problem
Users are showing as "Anonymous" in the Tribe Feed and Dashboard instead of displaying their actual display names and avatars.

## Root Cause Analysis

### 1. Data Flow
```
listGroupFeed() 
  → Fetches check-ins from checkin_group_shares
  → Fetches user_profiles for all check-in authors
  → Attaches user_profile to each checkin
  → Returns checkinsWithProfiles

SanghaFeed.tsx
  → Receives checkinsWithProfiles
  → Builds profileMap from checkin.user_profile
  → Passes profile to CheckInCard

CheckInCard.tsx
  → Displays profile?.display_name || 'Anonymous'
```

### 2. Potential Issues

#### Issue A: RLS Policy Blocking Profile Access
The `user_profiles` table has RLS enabled with this policy:
```sql
-- Users can view profiles if:
(auth.uid() = user_id)  -- Own profile
OR (get_my_role_in_tenant(tenant_id) = 'facility_admin')  -- Facility admin
OR ((is_public = true) AND (NOT (tenant_id IS DISTINCT FROM get_my_tenant_id())))  -- Public profiles in same tenant
OR (EXISTS (  -- Share a group
  SELECT 1 FROM group_memberships gm1
  JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = auth.uid() 
    AND gm2.user_id = user_profiles.user_id
))
```

**This policy should work** - users in the same group should be able to see each other's profiles.

#### Issue B: Profile Data Not Being Fetched
Check if the query in `listGroupFeed()` is actually returning profile data.

#### Issue C: Profile Map Not Being Built Correctly
Check if `SanghaFeed.tsx` is correctly building the profile map from the returned data.

## Debugging Steps

### Step 1: Add Console Logging
The code already has console.log statements in `SanghaFeed.tsx` (lines 167, 173-176, 186).

Check browser console for:
```
[SanghaFeed] Received check-ins: [...]
[SanghaFeed] Processing checkin: { user_id: '...', user_profile: {...} }
[SanghaFeed] Profile map: Map(...)
```

### Step 2: Check if Profiles Are Being Returned
If `user_profile` is `undefined` or has empty `display_name`, the RLS policy might be blocking access.

### Step 3: Test RLS Policy Directly
Run this query as an authenticated user to see if they can access other users' profiles:
```sql
SELECT user_id, display_name, avatar_url, is_public
FROM user_profiles
WHERE user_id IN (
  SELECT DISTINCT gm2.user_id
  FROM group_memberships gm1
  JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = auth.uid()
);
```

## Solution

### If RLS is blocking access:
1. Verify users are actually in the same group
2. Check if `group_memberships` table has correct data
3. Verify RLS policy on `group_memberships` allows reading group members

### If profiles are null/empty:
1. Check if `user_profiles` table has data for these users
2. Verify `display_name` column is populated
3. Check if profiles have correct `user_id` values

### If profile map is not being built:
1. Verify `checkin.user_profile` exists in the returned data
2. Check if the profile map is being set correctly in state
3. Verify the profile is being passed to `CheckInCard` component

## Next Steps
1. Open browser DevTools console
2. Navigate to Tribe Feed (`/mytribe`)
3. Check console logs for the three log statements
4. Report back what you see in the console

