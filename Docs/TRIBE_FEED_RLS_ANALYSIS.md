# Tribe Feed RLS (Row Level Security) Analysis

## Potential Root Cause Found!

The issue might be with how Row Level Security (RLS) policies interact with the Supabase query using `!inner` joins.

---

## Current RLS Policies

### checkin_group_shares SELECT Policy
```sql
(
  app.is_superuser() 
  OR 
  (EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = checkin_group_shares.group_id 
    AND gm.user_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = checkin_group_shares.group_id 
    AND is_facility_admin(g.tenant_id)
  ))
)
```

**Translation**: Users can see check-in shares if:
1. They are a superuser, OR
2. They are a member of the group the check-in is shared to, OR
3. They are a facility admin of the tenant

**Status**: ✅ This policy looks CORRECT

---

### daily_checkins SELECT Policy
```sql
(
  app.is_superuser() 
  OR 
  (user_id = auth.uid()) 
  OR 
  ((tenant_id IS NOT NULL) AND is_facility_admin(tenant_id)) 
  OR 
  (
    (is_private = false) 
    AND (tenant_id IS NOT NULL) 
    AND (EXISTS (
      SELECT 1
      FROM group_memberships gm1
      JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = daily_checkins.user_id
    ))
  )
)
```

**Translation**: Users can see check-ins if:
1. They are a superuser, OR
2. They own the check-in (user_id = auth.uid()), OR
3. They are a facility admin, OR
4. The check-in is non-private AND they share a group with the check-in author

**Status**: ⚠️ This policy might be the PROBLEM

---

## The Problem

When `listGroupFeed` uses this query:

```typescript
supabase
  .from('checkin_group_shares')
  .select(`
    checkin_id,
    group_id,
    daily_checkins!inner (...)
  `)
  .in('group_id', groupIds)
  .eq('daily_checkins.is_private', false)
```

**What happens**:
1. Supabase applies the `checkin_group_shares` RLS policy ✅
2. Supabase ALSO applies the `daily_checkins` RLS policy ⚠️
3. The `!inner` join means BOTH policies must pass

**The Issue**:
The `daily_checkins` RLS policy checks:
```sql
EXISTS (
  SELECT 1
  FROM group_memberships gm1
  JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = auth.uid() 
  AND gm2.user_id = daily_checkins.user_id
)
```

This checks if the current user (`auth.uid()`) and the check-in author (`daily_checkins.user_id`) are in **the same group**.

**But**: This doesn't check if the check-in is actually **shared** to that group via `checkin_group_shares`!

**Result**: If a check-in is shared to a group, but the author and viewer are not in the SAME group, the RLS policy blocks it.

---

## Example Scenario

### Setup:
- **Groups**: "Matterdaddies" (Group A), "Recovery Warriors" (Group B)
- **User 1** (you): Member of Group A only
- **User 2**: Member of Group B only
- **User 2's check-in**: Shared to BOTH Group A and Group B

### What Should Happen:
- User 1 should see User 2's check-in (because it's shared to Group A)

### What Actually Happens:
1. `checkin_group_shares` RLS: ✅ PASS (User 1 is in Group A, check-in is shared to Group A)
2. `daily_checkins` RLS: ❌ FAIL (User 1 and User 2 are NOT in the same group)
3. **Result**: Check-in is BLOCKED

---

## Why You Only See Your Own Check-ins

**Your check-ins**:
- `daily_checkins` RLS: ✅ PASS (user_id = auth.uid())
- You see them

**Other users' check-ins**:
- `daily_checkins` RLS: ❌ FAIL (unless you're in the same group as them)
- You DON'T see them

---

## Solution Options

### Option 1: Modify daily_checkins RLS Policy (Recommended)

Add a condition to allow viewing check-ins that are explicitly shared via `checkin_group_shares`:

```sql
ALTER POLICY daily_checkins_select ON daily_checkins
USING (
  app.is_superuser() 
  OR 
  (user_id = auth.uid()) 
  OR 
  ((tenant_id IS NOT NULL) AND is_facility_admin(tenant_id)) 
  OR 
  (
    (is_private = false) 
    AND (tenant_id IS NOT NULL) 
    AND (
      -- Original condition: same group membership
      (EXISTS (
        SELECT 1
        FROM group_memberships gm1
        JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() 
        AND gm2.user_id = daily_checkins.user_id
      ))
      OR
      -- NEW condition: explicitly shared to user's groups
      (EXISTS (
        SELECT 1
        FROM checkin_group_shares cgs
        JOIN group_memberships gm ON gm.group_id = cgs.group_id
        WHERE cgs.checkin_id = daily_checkins.id
        AND gm.user_id = auth.uid()
      ))
    )
  )
);
```

**Explanation**: This adds a check to see if the check-in is shared to any of the user's groups via `checkin_group_shares`.

---

### Option 2: Use a Different Query Approach

Instead of using `!inner` join, fetch data in two steps:

```typescript
// Step 1: Get checkin IDs from checkin_group_shares (RLS allows this)
const { data: shares } = await supabase
  .from('checkin_group_shares')
  .select('checkin_id')
  .in('group_id', groupIds)

const checkinIds = shares.map(s => s.checkin_id)

// Step 2: Get check-ins by ID (bypasses the group membership check)
const { data: checkins } = await supabase
  .from('daily_checkins')
  .select('*')
  .in('id', checkinIds)
  .eq('is_private', false)
```

**Issue**: This might still be blocked by the `daily_checkins` RLS policy.

---

### Option 3: Use a Database Function

Create a Postgres function that bypasses RLS:

```sql
CREATE OR REPLACE FUNCTION get_group_feed(p_user_id UUID, p_since TIMESTAMPTZ)
RETURNS SETOF daily_checkins
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function owner's permissions
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT dc.*
  FROM daily_checkins dc
  INNER JOIN checkin_group_shares cgs ON cgs.checkin_id = dc.id
  INNER JOIN group_memberships gm ON gm.group_id = cgs.group_id
  WHERE gm.user_id = p_user_id
    AND dc.is_private = false
    AND dc.created_at >= p_since
  ORDER BY dc.created_at DESC;
END;
$$;
```

Then call it from the app:

```typescript
const { data } = await supabase.rpc('get_group_feed', {
  p_user_id: userId,
  p_since: sinceIso
})
```

---

## Recommended Fix: Option 1

Modify the `daily_checkins_select` RLS policy to include check-ins shared via `checkin_group_shares`.

### SQL to Run:

```sql
-- Drop the existing policy
DROP POLICY IF EXISTS daily_checkins_select ON daily_checkins;

-- Create the new policy with the additional condition
CREATE POLICY daily_checkins_select ON daily_checkins
FOR SELECT
USING (
  app.is_superuser() 
  OR 
  (user_id = auth.uid()) 
  OR 
  ((tenant_id IS NOT NULL) AND is_facility_admin(tenant_id)) 
  OR 
  (
    (is_private = false) 
    AND (tenant_id IS NOT NULL) 
    AND (
      -- Allow if user shares a group with the check-in author
      (EXISTS (
        SELECT 1
        FROM group_memberships gm1
        JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() 
        AND gm2.user_id = daily_checkins.user_id
      ))
      OR
      -- Allow if check-in is explicitly shared to user's groups
      (EXISTS (
        SELECT 1
        FROM checkin_group_shares cgs
        JOIN group_memberships gm ON gm.group_id = cgs.group_id
        WHERE cgs.checkin_id = daily_checkins.id
        AND gm.user_id = auth.uid()
      ))
    )
  )
);
```

---

## Testing the Fix

### Before Fix:
```
User 1 (you) → Matterdaddies group
User 2 → Different group
User 2's check-in → Shared to Matterdaddies

Result: You DON'T see User 2's check-in ❌
```

### After Fix:
```
User 1 (you) → Matterdaddies group
User 2 → Different group
User 2's check-in → Shared to Matterdaddies

RLS Check:
1. Is check-in shared to Matterdaddies? YES ✅
2. Is User 1 in Matterdaddies? YES ✅

Result: You SEE User 2's check-in ✅
```

---

## Verification Steps

1. **Apply the RLS policy fix** (run the SQL above)
2. **Refresh the Tribe Feed** in the browser
3. **Check if you see other users' check-ins**
4. **Verify in console logs** that multiple check-ins are being fetched

---

## Summary

**Root Cause**: The `daily_checkins` RLS policy only allows viewing check-ins from users in the SAME group, not check-ins SHARED to your groups.

**Solution**: Modify the RLS policy to also allow viewing check-ins that are explicitly shared to your groups via `checkin_group_shares`.

**Impact**: After the fix, users will see ALL check-ins shared to their groups, regardless of whether they share a group membership with the author.

This is the correct behavior for a group feed!

