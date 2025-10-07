# Dashboard "Today's Check-ins" Debugging Guide

## Current Issues

### Issue 1: Still Showing "Anonymous"
Despite fixing the RLS policy, the Dashboard may still show "Anonymous" due to:
1. **Browser cache** - Old data cached in browser
2. **Supabase client cache** - Connection pool caching old RLS policies
3. **React state cache** - Component not re-fetching after policy change

### Issue 2: Date Confusion
You asked: "How are there entries in 'Today's Check-ins' when it's after midnight (Oct 7th now)?"

**Answer**: There SHOULD be entries for Oct 7th! The database shows:
- Current Central Time: **Oct 7, 2025 at 12:04 AM**
- Check-ins exist with `checkin_date = '2025-10-07'`
- These are TODAY's check-ins (Oct 7th)

---

## Database Verification

### Current Time
```sql
Current UTC:     2025-10-07 05:04:30 (5:04 AM UTC)
Current Central: 2025-10-07 00:04:30 (12:04 AM Central)
Central Date:    2025-10-07
```

### Check-ins for Oct 7th
```
User                  | Checkin Date | Created At
----------------------|--------------|------------------
Kirk Ferentz          | 2025-10-07   | 2025-10-07 00:00
Navin R Johnson       | 2025-10-07   | 2025-10-07 00:00
Jim Sherlock          | 2025-10-07   | 2025-10-07 00:00
Higher Power Hank     | 2025-10-07   | 2025-10-07 00:00
Alfred E Newman       | 2025-10-07   | 2025-10-07 00:00
Abraham Lincoln       | 2025-10-07   | 2025-10-07 00:00
```

**Conclusion**: The Dashboard SHOULD show these 6 check-ins for "Today" (Oct 7th).

---

## RLS Policy Verification

### Policy Status: ✅ UPDATED CORRECTLY

```sql
SELECT policyname, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND policyname = 'Tenant members can view profiles';
```

**Result**: Policy includes the group membership condition:
```sql
EXISTS (
  SELECT 1
  FROM group_memberships gm1
  JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = auth.uid() 
  AND gm2.user_id = user_profiles.user_id
)
```

---

## Debugging Steps

### Step 1: Check Browser Console

I've added debug logging to the Dashboard component. Please:

1. Open the Dashboard at http://localhost:5174/
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Look for these logs:

```
[Dashboard] Fetching data for date: 2025-10-07
[Dashboard] Fetching profiles for user IDs: [...]
[Dashboard] Profiles fetched: [...] Error: null
[Dashboard] Profile map size: 6
[Dashboard Tribe] Fetching profiles for user IDs: [...]
[Dashboard Tribe] Profiles fetched: [...] Error: null
[Dashboard Tribe] Profile map size: 6
```

### What to Look For:

#### Scenario A: Profiles are being fetched correctly
```
[Dashboard] Profiles fetched: [
  { user_id: "...", display_name: "Kirk Ferentz", ... },
  { user_id: "...", display_name: "Jim Sherlock", ... },
  ...
] Error: null
[Dashboard] Profile map size: 6
```

**This means**: RLS policy is working, profiles are being fetched.

**If still showing "Anonymous"**: React state issue or rendering issue.

---

#### Scenario B: Profiles array is empty
```
[Dashboard] Profiles fetched: [] Error: null
[Dashboard] Profile map size: 0
```

**This means**: RLS policy is blocking access (client connection hasn't picked up the new policy).

**Solution**: Force refresh the Supabase client connection.

---

#### Scenario C: Error fetching profiles
```
[Dashboard] Profiles fetched: null Error: { message: "..." }
```

**This means**: Database error or RLS policy error.

**Solution**: Check the error message for details.

---

### Step 2: Force Refresh

If profiles are empty (Scenario B), try these steps:

#### Option 1: Hard Refresh Browser
1. Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)
2. This clears browser cache and forces re-fetch

#### Option 2: Clear Supabase Client Cache
1. Log out of the application
2. Clear browser local storage:
   - Open DevTools → Application tab → Local Storage
   - Delete all entries for `localhost:5174`
3. Log back in

#### Option 3: Restart Dev Server
1. Stop the dev server (Ctrl+C)
2. Run `npm run dev` again
3. This creates a new Supabase client connection

---

### Step 3: Test RLS Policy Directly

To verify the RLS policy is working, run this query in Supabase SQL Editor:

```sql
-- Set the auth context to simulate a logged-in user
-- Replace YOUR_USER_ID with your actual user ID
SET LOCAL request.jwt.claims = '{"sub": "YOUR_USER_ID"}';

-- Try to fetch profiles
SELECT user_id, display_name, is_public
FROM user_profiles
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM daily_checkins 
  WHERE checkin_date = '2025-10-07'
);
```

**Expected**: Should return profiles for all users who have check-ins today.

---

## Common Issues and Solutions

### Issue: "Anonymous" still showing after RLS fix

**Possible Causes**:
1. Browser cache
2. Supabase client connection cache
3. React component not re-rendering

**Solutions**:
1. Hard refresh browser (Cmd+Shift+R)
2. Clear local storage and log out/in
3. Restart dev server
4. Check console logs to see if profiles are being fetched

---

### Issue: No check-ins showing for "Today"

**Possible Causes**:
1. No check-ins created for today (Oct 7th)
2. Date filter is incorrect
3. User not in any groups

**Solutions**:
1. Create a new check-in for today
2. Check console log: `[Dashboard] Fetching data for date: 2025-10-07`
3. Verify user is in a group (Matterdaddies)

---

### Issue: Check-ins from yesterday showing as "Today"

**Possible Causes**:
1. Timezone mismatch
2. `checkin_date` not set correctly when creating check-in

**Solutions**:
1. Verify `getCentralTimeToday()` returns correct date
2. Check database: `SELECT checkin_date FROM daily_checkins WHERE id = '...'`
3. Ensure DailyCheckin component uses `getCentralTimeToday()` when creating check-ins

---

## Expected Behavior

### What Should Happen:

1. **Dashboard loads** → Fetches today's date in Central Time (Oct 7th)
2. **Queries database** → Gets check-ins where `checkin_date = '2025-10-07'`
3. **Fetches profiles** → Calls `listProfilesByUserIds()` with user IDs from check-ins
4. **RLS policy allows** → Returns profiles for users in same groups
5. **Enriches check-ins** → Maps profiles to check-ins using `profileMap`
6. **Renders cards** → Shows user names and avatars

### What You Should See:

```
Today's Check-ins
┌──────────────────────┐  ┌──────────────────────┐
│  KF                  │  │  JS                  │
│  6/10                │  │  7/10                │
│  Kirk Ferentz        │  │  Jim Sherlock        │
└──────────────────────┘  └──────────────────────┘
```

**NOT**:
```
Today's Check-ins
┌──────────────────────┐  ┌──────────────────────┐
│  A                   │  │  A                   │
│  6/10                │  │  7/10                │
│  Anonymous           │  │  Anonymous           │
└──────────────────────┘  └──────────────────────┘
```

---

## Next Steps

1. ⏳ **Check browser console** for debug logs
2. ⏳ **Copy and paste console output** so we can analyze it
3. ⏳ **Try hard refresh** (Cmd+Shift+R)
4. ⏳ **Report what you see** - Are profiles being fetched? What's the error?

---

## Summary

**Date Issue**: ✅ **NOT AN ISSUE** - It IS Oct 7th in Central Time, so "Today's Check-ins" should show Oct 7th check-ins.

**Anonymous Issue**: ⏳ **NEEDS DEBUGGING** - RLS policy is fixed, but client may need cache refresh.

**Action Required**: Check browser console logs and report what you see!

