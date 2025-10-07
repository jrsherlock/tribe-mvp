# Tribe Feed Debugging Guide

## Current Status

I've added extensive debugging logs to help identify where the filtering is happening. The database verification shows that:

✅ **Check-ins ARE being properly shared to the Matterdaddies group**
- 6 check-ins from different users found in `checkin_group_shares` table
- All are non-private and shared to group ID: `4cd09d6c-c212-4662-8a4d-fad4cbe84052`

## Database Verification Results

### Check-ins in Matterdaddies Group:
```
User ID                                  | Checkin Date | Created At
-----------------------------------------|--------------|------------------
4aab6afe-b59e-475b-98ad-ab8407190004    | 2025-10-07   | 2025-10-07 00:00
08e4c05c-1b0c-40a2-a8d8-309e419fd219    | 2025-10-07   | 2025-10-07 00:00
402feaf1-7b9c-4f42-9b6e-1e7cfcef4108    | 2025-10-07   | 2025-10-07 00:00
1a2741bb-8dfb-470e-b1b4-f66b7b8c8088    | 2025-10-07   | 2025-10-07 00:00
bb513a39-b053-4800-b840-4fe0c8b4fd58    | 2025-10-07   | 2025-10-07 00:00
7c1051b5-3e92-4215-8623-763f7fb627c7    | 2025-10-06   | 2025-10-06 20:37
```

**Conclusion**: The data IS in the database correctly.

---

## Debug Logs Added

I've added console.log statements to track the data flow:

### 1. In `listGroupFeed` function (`src/lib/services/checkins.ts`):
```typescript
console.log('[listGroupFeed] Fetching feed for user:', userId)
console.log('[listGroupFeed] Since:', sinceIso)
console.log('[listGroupFeed] User is in groups:', groupIds)
console.log('[listGroupFeed] Found shares:', shares?.length)
console.log('[listGroupFeed] Extracted check-ins:', checkins.length)
console.log('[listGroupFeed] Unique user IDs in check-ins:', [...new Set(checkins.map(c => c.user_id))])
console.log('[listGroupFeed] After deduplication:', uniqueCheckins.length)
```

### 2. In `SanghaFeed` component (`src/components/SanghaFeed.tsx`):
```typescript
console.log('[SanghaFeed] Fetched check-ins from listGroupFeed:', groupCheckins)
console.log('[SanghaFeed] Number of check-ins:', groupCheckins?.length)
console.log('[SanghaFeed] Unique user IDs:', [...new Set(groupCheckins?.map(c => c.user_id))])
```

### 3. In `processedCheckins` useMemo:
```typescript
console.log('[SanghaFeed] processedCheckins - Total checkins:', checkins.length)
console.log('[SanghaFeed] processedCheckins - filterMode:', filterMode)
console.log('[SanghaFeed] processedCheckins - filteredMemberId:', filteredMemberId)
console.log('[SanghaFeed] Filtering by member:', filteredMemberId)
console.log('[SanghaFeed] After member filter:', filtered.length, 'check-ins')
```

---

## Next Steps: Check Browser Console

### Instructions:
1. Open the application at http://localhost:5174/
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Navigate to the Tribe Feed (`/sangha`)
5. Look for the debug logs starting with `[listGroupFeed]` and `[SanghaFeed]`

### What to Look For:

#### Scenario A: Data is fetched but filtered out
If you see logs like:
```
[listGroupFeed] Fetched feed for user: YOUR_USER_ID
[listGroupFeed] User is in groups: ["4cd09d6c-c212-4662-8a4d-fad4cbe84052"]
[listGroupFeed] Found shares: 6
[listGroupFeed] Unique user IDs in check-ins: [user1, user2, user3, ...]
[SanghaFeed] Number of check-ins: 6
[SanghaFeed] processedCheckins - Total checkins: 6
[SanghaFeed] processedCheckins - filteredMemberId: YOUR_USER_ID  ← PROBLEM!
[SanghaFeed] After member filter: 1 check-ins
```

**This means**: Data is being fetched correctly, but `filteredMemberId` is set to your user ID, causing it to filter to only your check-ins.

**Solution**: Need to find where `filteredMemberId` is being set incorrectly.

---

#### Scenario B: Data is not being fetched
If you see logs like:
```
[listGroupFeed] Fetched feed for user: YOUR_USER_ID
[listGroupFeed] User is in groups: ["4cd09d6c-c212-4662-8a4d-fad4cbe84052"]
[listGroupFeed] Found shares: 0  ← PROBLEM!
[SanghaFeed] Number of check-ins: 0
```

**This means**: The Supabase query is not returning data (even though we verified it exists in the database).

**Possible causes**:
- Row Level Security (RLS) policies blocking access
- Incorrect query syntax
- Date filter too restrictive

---

#### Scenario C: User not in any groups
If you see logs like:
```
[listGroupFeed] Fetched feed for user: YOUR_USER_ID
[listGroupFeed] No group memberships found for user  ← PROBLEM!
```

**This means**: The user is not in any groups.

**Solution**: Verify user is in Matterdaddies group:
```sql
SELECT * FROM group_memberships 
WHERE user_id = 'YOUR_USER_ID';
```

---

## Potential Issues to Investigate

### Issue 1: Row Level Security (RLS)
The `checkin_group_shares` table might have RLS policies that are blocking access.

**Check RLS policies**:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'checkin_group_shares';
```

**Possible fix**: Ensure RLS policy allows users to see check-ins shared to their groups.

---

### Issue 2: filteredMemberId Auto-Selection
There might be code that's automatically setting `filteredMemberId` to the current user.

**Check for**:
- URL parameters that set the filter
- Local storage that persists the filter
- Auto-selection logic in AvatarFilterBar component

---

### Issue 3: Date Filter Too Restrictive
The `sinceIso` filter might be excluding check-ins.

**Check**:
- What date is being used for the filter?
- Are check-ins created with the correct `created_at` timestamp?

---

## Quick Tests

### Test 1: Disable Member Filtering
Temporarily comment out the member filtering logic:

```typescript
// In SanghaFeed.tsx, line 357-369
const processedCheckins = useMemo(() => {
  console.log('[SanghaFeed] processedCheckins - Total checkins:', checkins.length)
  
  // Step 1: Filter by member if selected
  let filtered = checkins
  // TEMPORARILY COMMENT OUT:
  // if (filterMode === 'all' && filteredMemberId) {
  //   console.log('[SanghaFeed] Filtering by member:', filteredMemberId)
  //   filtered = checkins.filter(c => c.user_id === filteredMemberId)
  //   console.log('[SanghaFeed] After member filter:', filtered.length, 'check-ins')
  // }
  
  // ... rest of code
```

**Expected**: If this fixes it, then `filteredMemberId` is the problem.

---

### Test 2: Check RLS Policies
Run this query to see if RLS is blocking access:

```sql
-- Disable RLS temporarily to test
ALTER TABLE checkin_group_shares DISABLE ROW LEVEL SECURITY;

-- Then try loading the feed again

-- Re-enable RLS after testing
ALTER TABLE checkin_group_shares ENABLE ROW LEVEL SECURITY;
```

**WARNING**: Only do this in dev environment, not production!

---

### Test 3: Direct Supabase Query
Test the exact query that `listGroupFeed` is using:

```typescript
// In browser console:
const { data, error } = await supabase
  .from('checkin_group_shares')
  .select(`
    checkin_id,
    group_id,
    daily_checkins!inner (
      id,
      user_id,
      checkin_date,
      created_at
    )
  `)
  .in('group_id', ['4cd09d6c-c212-4662-8a4d-fad4cbe84052'])
  .eq('daily_checkins.is_private', false)
  .order('daily_checkins(created_at)', { ascending: false })

console.log('Direct query result:', data, error)
```

**Expected**: Should return multiple check-ins from different users.

---

## Action Items

1. **Check browser console** for the debug logs
2. **Copy and paste the console output** so we can analyze it
3. **Note which scenario** (A, B, or C) matches what you see
4. **Try Test 1** (disable member filtering) to see if that's the issue
5. **Check your user ID** - what user are you logged in as?

---

## Summary

The database has the correct data (6 check-ins from different users). The issue is either:
1. **Filtering**: `filteredMemberId` is set to your user ID
2. **RLS**: Row Level Security is blocking access
3. **Query**: The Supabase query is not returning data
4. **Membership**: User is not in the Matterdaddies group

The debug logs will tell us which one it is.

Please check the browser console and share the output!

