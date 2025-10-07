# Anonymous User Display Issue - Fix Documentation

## Problem Statement
Users are showing as "Anonymous" in the Tribe Feed (`/mytribe`) and Dashboard (`/`) instead of displaying their actual display names and avatars from the `user_profiles` table.

## Root Cause
The issue is caused by Row Level Security (RLS) policies on the `user_profiles` table that are preventing users from viewing each other's profiles, even when they share group memberships.

### Why This Happens
1. The `user_profiles` table has RLS enabled
2. The existing RLS policy "Tenant members can view profiles" has multiple OR conditions:
   - Own profile
   - Facility admin viewing tenant members
   - Public profiles in same tenant
   - **Group members viewing each other** ← This should work but might be failing

3. When the frontend code calls `listProfilesByUserIds()` to fetch profiles for check-in authors, the RLS policy blocks access if the conditions aren't met properly

## Solution Implemented

### 1. Created New RLS Policy
Added a dedicated, simpler RLS policy specifically for group members:

```sql
CREATE POLICY "Group members can view each other profiles" 
ON user_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM group_memberships gm1
    JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = user_profiles.user_id
  )
);
```

**Why this works:**
- Simpler logic without multiple OR conditions
- Directly checks if the requesting user shares ANY group with the profile owner
- More explicit and easier for Postgres query planner to optimize

### 2. Added Comprehensive Debugging
Added console.log statements to track the data flow:

#### In `src/lib/services/profiles.ts`:
- Logs when `listProfilesByUserIds()` is called
- Logs the user IDs being queried
- Logs the result (count, error, profiles returned)

#### In `src/lib/services/checkins.ts`:
- Logs when `listGroupFeed()` fetches profiles
- Logs the user IDs being queried
- Logs the profiles fetched and any errors

#### In `src/components/Dashboard.tsx`:
- Logs when fetching profiles for "Today's Check-ins" section
- Logs when fetching profiles for "Tribe Check-ins" section
- Logs the enrichment process showing which profiles were found
- Logs the final enriched check-ins with user names

## Data Verification

### Confirmed in Database:
✅ All users with recent check-ins have profiles with `display_name` populated
✅ Users are correctly assigned to groups (e.g., "Matterdaddies" group has 6 members)
✅ Check-ins exist and are being shared to groups via `checkin_group_shares` table

### Example Data:
```
Group: Matterdaddies
Members:
- Abraham Lincoln
- Alfred E Newman
- Higher Power Hank
- Jim Sherlock
- Kirk Ferentz
- Navin R Johnson
```

## Testing Instructions

### Step 1: Open Browser DevTools
1. Open your browser's DevTools (F12 or Cmd+Option+I)
2. Go to the Console tab
3. Clear the console

### Step 2: Test Tribe Feed
1. Navigate to `/mytribe` (Tribe Feed page)
2. Check console for these log messages:
   ```
   [listGroupFeed] Fetching profiles for user IDs: [...]
   [listGroupFeed] Profiles fetched: { count: X, error: null, profiles: [...] }
   [SanghaFeed] Received check-ins: [...]
   [SanghaFeed] Processing checkin: { user_id: '...', user_profile: {...} }
   [SanghaFeed] Profile map: Map(...)
   ```

3. **Expected Result**: 
   - `count` should match the number of unique users with check-ins
   - `error` should be `null`
   - `profiles` array should contain objects with `display_name` values
   - Check-ins should display actual user names instead of "Anonymous"

### Step 3: Test Dashboard
1. Navigate to `/` (Dashboard page)
2. Check console for these log messages:
   ```
   [Dashboard] Fetching profiles for today group check-ins, user IDs: [...]
   [Dashboard] Profiles result: { count: X, error: null, profiles: [...] }
   [Dashboard] Enriching checkin: { user_id: '...', profile_found: true, display_name: '...' }
   [Dashboard] Enriched check-ins: [...]
   ```

3. **Expected Result**:
   - "Today's Check-ins" section should show actual user names and avatars
   - Console should show `profile_found: true` for each check-in
   - `display_name` should not be "Anonymous"

## Troubleshooting

### If profiles are still showing as "Anonymous":

#### Check 1: RLS Policy Error
Look for error messages in console logs:
```
error: { code: 'PGRST...' }
```

If you see RLS-related errors, the policy might still be blocking access.

#### Check 2: No Profiles Returned
If `count: 0` in the logs:
- Verify users are in the same group
- Check if the logged-in user has group memberships
- Verify the `group_memberships` table has correct data

#### Check 3: Profiles Returned But Not Displayed
If profiles are fetched but still showing "Anonymous":
- Check if `display_name` field is populated in the returned profiles
- Verify the profile map is being built correctly
- Check if the profile is being passed to the component correctly

## Files Modified

### Service Layer:
1. **`src/lib/services/profiles.ts`**
   - Added debugging logs to `listProfilesByUserIds()`

2. **`src/lib/services/checkins.ts`**
   - Added debugging logs to `listGroupFeed()`

### Components:
3. **`src/components/Dashboard.tsx`**
   - Added debugging logs for both "Today's Check-ins" and "Tribe Check-ins" sections
   - Logs profile fetching and enrichment process

### Database:
4. **Supabase Dev Database (ohlscdojhsifvnnkoiqi)**
   - Created new RLS policy: "Group members can view each other profiles"

## Expected Outcome

After this fix:
1. ✅ Users in the same group can see each other's display names
2. ✅ User avatars are displayed correctly
3. ✅ "Anonymous" only appears for users without profiles (edge case)
4. ✅ Console logs provide visibility into the data flow for debugging

## Production Deployment

⚠️ **IMPORTANT**: Before deploying to production:
1. Test thoroughly in dev environment
2. Apply the same RLS policy to production database (cbquhgzgffceopuqnzzm)
3. Remove or reduce console.log statements for production (optional)

### SQL to Run in Production:
```sql
CREATE POLICY "Group members can view each other profiles" 
ON user_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM group_memberships gm1
    JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = user_profiles.user_id
  )
);
```

## Next Steps

1. **Test in browser** - Navigate to Tribe Feed and Dashboard, check console logs
2. **Report findings** - Share console log output if issue persists
3. **Verify fix** - Confirm user names and avatars are displaying correctly
4. **Clean up** - Optionally remove debug logs once confirmed working

