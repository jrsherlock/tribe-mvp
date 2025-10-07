# Anonymous Users Investigation - Debugging Session

## Problem Statement

Users are appearing as "Anonymous" with no avatars in the Dashboard's "Today's Check-ins" section (horizontal scrollable cards), even though:
- The database has proper `display_name` values for all users
- When clicking on a check-in, the detail modal shows the correct user name ("Abraham Lincoln")
- This suggests the data exists but isn't being passed correctly to the UI components

## Current Hypothesis

The issue is NOT:
- ❌ Missing profiles in database
- ❌ Empty `display_name` fields
- ❌ Wrong tenant_id filtering (we added that but it didn't fix it)

The issue IS likely:
- ✅ Data not being fetched correctly from `listProfilesByUserIds`
- ✅ Profile data not being mapped correctly to check-ins
- ✅ Component rendering issue

## Investigation Steps

### Step 1: Added Debug Logging

Added console.log statements to track data flow:

**In `src/lib/services/profiles.ts`:**
- Log when `listProfilesByUserIds` is called
- Log the userIds and tenantId parameters
- Log the query result

**In `src/components/Dashboard.tsx`:**
- Log the userIds being fetched
- Log the currentTenantId
- Log the profiles returned
- Log each profile being added to the map
- Log the enriched check-ins

### Step 2: Created DevMode Panel

Created `src/components/DevModePanel.tsx` to show:
- Current user email and ID
- User's role
- Facility (tenant) name and ID
- Groups the user belongs to
- List of members in each group

**How to use:**
1. Panel appears in bottom-right corner (purple "Dev Mode" button)
2. Click to expand and see diagnostic info
3. Click "Log to Console" to dump all data to console
4. Click "Refresh Data" to reload diagnostic info

**Enable in production:**
```javascript
localStorage.setItem('devMode', 'true')
```

## What to Check in Console

Look for these log messages (marked with 🔍):

```
🔍 [Dashboard] Fetching profiles for userIds: [...]
🔍 [Dashboard] Current tenantId: ...
🔍 [listProfilesByUserIds] Called with: { userIds: [...], tenantId: ... }
🔍 [listProfilesByUserIds] Filtering for tenant_id = ...
🔍 [listProfilesByUserIds] Query result: { data: [...], error: null }
🔍 [Dashboard] Profiles returned: [...]
🔍 [Dashboard] Adding profile to map: user_id display_name
🔍 [Dashboard] ProfileMap size: X
🔍 [Dashboard] Enriching checkin for user: user_id Profile found: {...}
🔍 [Dashboard] Enriched tribe checkins: [...]
```

## Expected vs Actual

### Expected Flow:
1. Dashboard fetches check-ins for users in shared groups
2. Extracts unique user_ids from check-ins
3. Calls `listProfilesByUserIds(userIds, currentTenantId)`
4. Receives profiles with `display_name` and `avatar_url`
5. Maps profiles to check-ins
6. Passes enriched data to `TribeCheckinCard`
7. Card displays user name and avatar

### Actual Flow (to be determined):
- Need to check console logs to see where the flow breaks

## Possible Issues

### Issue 1: No Profiles Returned
**Symptom:** `profiles` is empty array or null
**Cause:** Query filtering out all profiles
**Fix:** Check tenant_id matching, RLS policies

### Issue 2: Profiles Returned But Not Mapped
**Symptom:** `profiles` has data but `profileMap` is empty
**Cause:** Bug in mapping logic
**Fix:** Check the forEach loop

### Issue 3: Profiles Mapped But Not Found
**Symptom:** `profileMap` has data but `profile` is undefined in map
**Cause:** user_id mismatch between check-in and profile
**Fix:** Check user_id consistency

### Issue 4: Profile Found But display_name is Null
**Symptom:** `profile` exists but `profile.display_name` is null
**Cause:** Database has null values (but we checked this - unlikely)
**Fix:** Update database

## Components Involved

### 1. Dashboard.tsx (lines 202-244)
Fetches check-ins and enriches them with profile data:
```typescript
const { data: profiles } = await listProfilesByUserIds(userIds, currentTenantId)
const profileMap = new Map<string, UserProfile>();
// ... mapping logic
const enrichedTribeCheckins = tribeCheckinsList.map((checkin) => {
  const profile = profileMap.get(checkin.user_id);
  return {
    user_name: profile?.display_name || 'Anonymous',
    user_avatar_url: profile?.avatar_url || '',
    // ... other fields
  }
})
```

### 2. TribeCheckinCard.tsx (lines 64-88)
Renders the check-in card:
```typescript
{checkin.user_avatar_url ? (
  <img src={checkin.user_avatar_url} alt={checkin.user_name} />
) : (
  <div>{checkin.user_name.charAt(0).toUpperCase()}</div>
)}
<div>{checkin.user_name}</div>
```

### 3. InteractiveCheckinModal.tsx (lines 115-132)
Renders the modal when clicking a check-in:
```typescript
{checkin.user_avatar_url ? (
  <img src={checkin.user_avatar_url} alt={checkin.user_name} />
) : (
  <div><User /></div>
)}
<h2>{checkin.user_name}'s Check-in</h2>
```

## Next Steps

1. **Refresh the dashboard** and check browser console
2. **Look for the 🔍 debug logs** to see where data flow breaks
3. **Check the DevMode panel** to verify:
   - Current tenant ID
   - Groups the user belongs to
   - Members in those groups
4. **Share console logs** with developer for analysis
5. **Based on logs**, implement targeted fix

## Files Modified

1. ✅ `src/lib/services/profiles.ts` - Added debug logging
2. ✅ `src/components/Dashboard.tsx` - Added debug logging
3. ✅ `src/components/DevModePanel.tsx` - Created diagnostic panel
4. ✅ `src/App.tsx` - Added DevModePanel to app

## Cleanup After Fix

Once the issue is resolved, remove debug logging:
- Remove all `console.log` statements with 🔍 prefix
- Keep DevModePanel (useful for future debugging)
- Document the root cause and fix in this file

