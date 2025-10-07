# Tribe Feed Issue - Root Cause Analysis

## Problem Statement
The SanghaFeed "Tribe" view only shows the current user's own check-in, not check-ins from other members of the "Matterdaddies" group.

---

## Root Cause Identified ✅

**The issue is NOT with the SanghaFeed component** - it's correctly fetching check-ins from the `checkin_group_shares` table.

**The REAL issue is in the DailyCheckin component**: Check-ins are NOT being automatically shared to groups when created.

---

## How Check-in Sharing Works

### Step 1: User Creates Check-in
**File**: `src/components/DailyCheckin.tsx`

When a user creates a check-in:
1. User fills out MEPSS ratings, notes, gratitude, etc.
2. User can toggle between "Private" and "Share with groups"
3. If "Share with groups" is selected, a list of checkboxes appears (lines 797-818)
4. **User must MANUALLY check the boxes** for groups they want to share with
5. `selectedGroupIds` state tracks which groups are selected

### Step 2: Check-in is Saved
**File**: `src/components/DailyCheckin.tsx` (lines 420-441)

```typescript
// Save the check-in to daily_checkins table
const { data: saved, error: saveErr } = await upsertCheckin(checkinPayload);

// If sharing to groups: reset shares and insert selected
if (!checkinData.is_private && saved?.id && tenantId) {
  console.log('[DailyCheckin] Sharing check-in to groups:', selectedGroupIds);
  
  // Remove previous shares (if any)
  await supabase.from('checkin_group_shares').delete().eq('checkin_id', saved.id)
  
  // Insert new shares ONLY if groups are selected
  if (selectedGroupIds.length > 0) {  // ⚠️ THIS IS THE PROBLEM
    const rows = selectedGroupIds.map(gid => ({ 
      checkin_id: saved.id as string, 
      group_id: gid 
    }))
    const { error: shareErr } = await supabase.from('checkin_group_shares').insert(rows)
    if (shareErr) {
      console.error('[DailyCheckin] Error sharing to groups:', shareErr);
      throw shareErr;
    }
    console.log('[DailyCheckin] Check-in shared to groups successfully');
  }
}
```

**Key Issue**: If `selectedGroupIds.length === 0`, NO rows are inserted into `checkin_group_shares`.

### Step 3: Tribe Feed Fetches Check-ins
**File**: `src/lib/services/checkins.ts` (lines 56-159)

The `listGroupFeed` function:
1. Gets user's group memberships
2. Queries `checkin_group_shares` for check-ins shared to those groups
3. Fetches the actual check-in data from `daily_checkins`
4. Enriches with user profiles

**This logic is CORRECT** - it's properly fetching from `checkin_group_shares`.

---

## The Problem

### Default Behavior (Current)
```typescript
// Line 91 in DailyCheckin.tsx
const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
```

**New check-ins**: `selectedGroupIds` = `[]` (empty)

**Result**: Unless the user manually checks group boxes, the check-in is NOT shared.

### What Happens
```
User creates check-in
  ↓
is_private = false (Share with groups)
  ↓
User sees checkboxes for groups
  ↓
User DOES NOT check any boxes (or forgets to)
  ↓
selectedGroupIds = []
  ↓
Check-in saved to daily_checkins ✓
  ↓
NO rows inserted into checkin_group_shares ❌
  ↓
Other group members DON'T see the check-in in Tribe Feed ❌
```

---

## Why You Only See Your Own Check-in

**Scenario 1**: You checked the "Matterdaddies" box when creating your check-in
- Your check-in → shared to Matterdaddies group ✓
- You see your own check-in in Tribe Feed ✓

**Scenario 2**: Other members did NOT check the "Matterdaddies" box
- Their check-ins → NOT shared to any groups ❌
- You DON'T see their check-ins in Tribe Feed ❌

**Result**: You only see your own check-in.

---

## Verification Steps

### Check Database Directly

Run this query in Supabase SQL Editor:

```sql
-- Check which check-ins are shared to Matterdaddies group
SELECT 
  cgs.checkin_id,
  cgs.group_id,
  g.name as group_name,
  dc.user_id,
  dc.checkin_date,
  dc.created_at
FROM checkin_group_shares cgs
JOIN groups g ON g.id = cgs.group_id
JOIN daily_checkins dc ON dc.id = cgs.checkin_id
WHERE g.name = 'Matterdaddies'
ORDER BY dc.created_at DESC
LIMIT 20;
```

**Expected**: Should show check-ins from multiple users  
**Actual**: Probably only shows YOUR check-ins

### Check Your Own Check-ins

```sql
-- Check if YOUR check-ins are being shared
SELECT 
  dc.id,
  dc.checkin_date,
  dc.created_at,
  dc.is_private,
  COALESCE(
    (SELECT json_agg(g.name) 
     FROM checkin_group_shares cgs 
     JOIN groups g ON g.id = cgs.group_id 
     WHERE cgs.checkin_id = dc.id),
    '[]'::json
  ) as shared_to_groups
FROM daily_checkins dc
WHERE dc.user_id = 'YOUR_USER_ID'
ORDER BY dc.created_at DESC
LIMIT 10;
```

**Expected**: `shared_to_groups` should show `["Matterdaddies"]`  
**Actual**: Might show `[]` for some check-ins

---

## Solutions

### Option 1: Auto-Select All Groups (Recommended)

**Change**: When a user has groups, automatically select ALL of them by default.

**File**: `src/components/DailyCheckin.tsx`

**Modify lines 275-301**:

```typescript
useEffect(() => {
  let mounted = true
  async function load() {
    if (!user || !currentTenantId) { 
      setAvailableGroups([]); 
      setSelectedGroupIds([]); 
      return 
    }
    try {
      const [{ data: groupRows }, { data: memRows }] = await Promise.all([
        listGroups(currentTenantId),
        listMembershipsByUser(user.userId)
      ])
      if (!mounted) return
      const mySet = new Set((memRows ?? []).map((r) => r.group_id))
      const mine = (groupRows ?? []).filter((g) => mySet.has(g.id))
      setAvailableGroups(mine)
      
      if (existingCheckin?.id) {
        // Editing existing check-in: load its shares
        const { data: shares } = await supabase
          .from('checkin_group_shares')
          .select('group_id')
          .eq('checkin_id', existingCheckin.id)
        if (mounted && shares) setSelectedGroupIds(shares.map((s) => s.group_id))
      } else {
        // NEW CHECK-IN: Auto-select all groups by default
        if (mounted && mine.length > 0) {
          setSelectedGroupIds(mine.map(g => g.id))
        }
      }
    } catch (e) {
      console.error('Failed to load groups', e)
    }
  }
  load()
  return () => { mounted = false }
}, [user, currentTenantId, existingCheckin])
```

**Impact**:
- ✅ New check-ins automatically shared to all user's groups
- ✅ Users can still uncheck boxes if they want to exclude specific groups
- ✅ Existing check-ins preserve their current sharing settings
- ✅ Matches user expectations (most users want to share with their groups)

---

### Option 2: Make Sharing Opt-Out Instead of Opt-In

**Change**: Change the UI to show "Share with all groups" by default, with option to customize.

**Pros**:
- Simpler UX
- Most users want to share with all groups

**Cons**:
- Less granular control
- Requires more UI changes

---

### Option 3: Add a "Select All" Button

**Change**: Add a button to quickly select/deselect all groups.

**Pros**:
- Gives users quick control
- Doesn't change default behavior

**Cons**:
- Doesn't solve the root problem (users still need to click)
- Extra UI complexity

---

## Recommended Fix: Option 1 (Auto-Select All Groups)

This is the best solution because:
1. **Matches user expectations**: When users select "Share with groups", they expect it to share with their groups
2. **Minimal code change**: Just a few lines in one useEffect
3. **Preserves user control**: Users can still uncheck boxes
4. **Backward compatible**: Existing check-ins are unaffected
5. **Fixes the immediate problem**: Tribe Feed will start showing all group members' check-ins

---

## Testing After Fix

### Test 1: Create New Check-in
1. Log in as a user in "Matterdaddies" group
2. Navigate to Check-in page
3. Fill out check-in form
4. Select "Share with groups" (not Private)
5. **VERIFY**: "Matterdaddies" checkbox is ALREADY CHECKED by default
6. Submit check-in
7. Navigate to Tribe Feed
8. **VERIFY**: Your check-in appears in the feed

### Test 2: Verify Database
```sql
SELECT 
  cgs.checkin_id,
  g.name as group_name
FROM checkin_group_shares cgs
JOIN groups g ON g.id = cgs.group_id
WHERE cgs.checkin_id = 'YOUR_NEW_CHECKIN_ID';
```
**Expected**: Should show row with group_name = 'Matterdaddies'

### Test 3: Other Users See It
1. Log in as a different user in "Matterdaddies" group
2. Navigate to Tribe Feed
3. **VERIFY**: You see the check-in from the first user

---

## Additional Considerations

### Privacy Concerns
- Users who want private check-ins can still toggle "Private Check-in"
- Users who want to exclude specific groups can uncheck boxes
- The default behavior (auto-select all) is reasonable for a recovery support community

### Migration
- Existing check-ins are NOT affected
- Only NEW check-ins will have auto-selected groups
- No database migration needed

### User Education
- Consider adding a tooltip: "Your check-in will be shared with all your groups by default. Uncheck to exclude specific groups."
- Update help documentation

---

## Summary

**Problem**: Tribe Feed only shows own check-in, not group members' check-ins

**Root Cause**: Check-ins are not being shared to groups because `selectedGroupIds` defaults to empty array

**Solution**: Auto-select all user's groups when creating a new check-in

**Impact**: Tribe Feed will start showing check-ins from all group members who create check-ins after the fix

**Files to Modify**: `src/components/DailyCheckin.tsx` (lines 275-301)

**Testing**: Create new check-in, verify it's shared to groups, verify it appears in Tribe Feed for other group members

