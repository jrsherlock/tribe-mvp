# Timezone Inconsistency Fix - Check-In Date Mismatch

**Date**: 2025-10-07  
**Issue**: Dashboard shows "Ready" but check-in submission fails with "Only one check-in allowed per day"  
**Status**: 🔍 ROOT CAUSE IDENTIFIED

---

## Executive Summary

Kirk Ferentz's check-in submission is failing due to a **timezone inconsistency** between how check-ins are created and how the Dashboard queries for them.

### The Problem

1. **DailyCheckin component** uses **UTC timezone** to set `checkin_date`
2. **Dashboard component** uses **Central timezone** to query for today's check-in
3. When it's 7:19 PM on Oct 6 in Central Time, it's already 12:19 AM on Oct 7 in UTC
4. Check-in gets saved with `checkin_date = '2025-10-07'`
5. Dashboard looks for `checkin_date = '2025-10-06'` (today in Central)
6. **Result**: Dashboard shows "Ready" (no check-in found) but database rejects new submission (check-in exists)

---

## Evidence

### Kirk Ferentz's Check-In Data

**User ID**: `bb513a39-b053-4800-b840-4fe0c8b4fd58`  
**Display Name**: Kirk Ferentz  
**Email**: iowabone@yahoo.com

**Existing Check-In**:
```json
{
  "id": "7ea097eb-1938-46b7-896c-4e7a9969cd3f",
  "user_id": "bb513a39-b053-4800-b840-4fe0c8b4fd58",
  "checkin_date": "2025-10-07",
  "created_at": "2025-10-07 00:19:58.871+00",  // UTC
  "mental_rating": 5,
  "emotional_rating": 8,
  "physical_rating": 5,
  "social_rating": 5,
  "spiritual_rating": 5,
  "is_private": false
}
```

**Created At (UTC)**: 2025-10-07 00:19:58 (12:19 AM)  
**Created At (Central)**: 2025-10-06 19:19:58 (7:19 PM)  
**Check-in Date**: 2025-10-07 (UTC date)

### Current Time

**Query Result**:
```sql
SELECT 
  NOW() as utc_now,
  NOW() AT TIME ZONE 'America/Chicago' as central_now,
  (NOW() AT TIME ZONE 'America/Chicago')::date as central_date;
```

**Result**:
```json
{
  "utc_now": "2025-10-07 03:07:27+00",
  "central_now": "2025-10-06 22:07:27",
  "central_date": "2025-10-06"
}
```

**Current Time (UTC)**: October 7, 2025 at 3:07 AM  
**Current Time (Central)**: October 6, 2025 at 10:07 PM  
**Today (Central)**: 2025-10-06

---

## Code Analysis

### DailyCheckin.tsx (Lines 378-391)

**Uses UTC**:
```typescript
const today = new Date().toISOString();  // ← UTC timestamp

const checkinPayload = {
  id,
  tenant_id: tenantId,
  user_id: user.userId,
  checkin_date: today.split('T')[0],  // ← UTC date (2025-10-07)
  mental_rating: checkinData.mental_rating,
  // ...
}
```

### Dashboard.tsx (Lines 82-92)

**Uses Central Time**:
```typescript
const getCentralTimeToday = () => {
  const now = new Date();
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return centralTime.toISOString().split('T')[0];
};
const today = getCentralTimeToday();  // ← Central date (2025-10-06)

// Query for today's check-in
const { data: myCheckins } = await supabase
  .from('daily_checkins')
  .select('*')
  .eq('user_id', user.userId)
  .gte('checkin_date', today)  // ← Looking for 2025-10-06
  .lte('checkin_date', today)
  .limit(1)
```

### checkins.ts - getTodayForUser (Lines 30-36)

**Uses UTC**:
```typescript
export async function getTodayForUser(userId: string, tenantId: string | null) {
  const today = new Date().toISOString().split('T')[0]  // ← UTC date
  let q = supabase.from('daily_checkins').select('*').eq('user_id', userId)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  else q = q.is('tenant_id', null)
  return q.gte('checkin_date', `${today}`).lte('checkin_date', `${today}`).limit(1)
}
```

---

## Impact Analysis

### Affected Components

1. ✅ **Dashboard.tsx** - Already uses Central Time (correct)
2. ❌ **DailyCheckin.tsx** - Uses UTC (needs fix)
3. ❌ **checkins.ts** (`getTodayForUser`) - Uses UTC (needs fix)
4. ❓ **useAdminTreeData.ts** - Uses UTC for check-in counts (needs review)
5. ❓ **DataGenerator.tsx** - Uses `format(date, 'yyyy-MM-dd')` (needs review)

### User Impact

**Scenario**: User in Central Time Zone at 7:00 PM on October 6

1. User submits check-in
2. Check-in saved with `checkin_date = '2025-10-07'` (UTC date)
3. Dashboard queries for `checkin_date = '2025-10-06'` (Central date)
4. Dashboard shows "Ready" (no check-in found)
5. User tries to submit again
6. Database rejects: "Only one check-in allowed per day"
7. **User is confused and frustrated** 😞

**Time Window**: This affects users from **7:00 PM to 11:59 PM Central Time** every day (5 hours)

---

## Solution

### Approach: Standardize on Central Time

**Rationale**:
- Dashboard already uses Central Time (documented in `DASHBOARD_TODAYS_CHECKINS_UPDATE.md`)
- Most users are likely in US timezones
- Consistent with existing implementation
- Minimal changes required

### Implementation Plan

#### 1. Create Utility Function

**File**: `src/lib/utils/timezone.ts` (NEW)

```typescript
/**
 * Get today's date in Central Time Zone (America/Chicago)
 * This ensures consistent date handling across the application
 * 
 * @returns Date string in YYYY-MM-DD format (Central Time)
 */
export function getCentralTimeToday(): string {
  const now = new Date();
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return centralTime.toISOString().split('T')[0];
}

/**
 * Get current timestamp in Central Time Zone
 * 
 * @returns ISO timestamp string in Central Time
 */
export function getCentralTimeNow(): string {
  const now = new Date();
  return now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
}
```

#### 2. Update DailyCheckin.tsx

**Change**:
```typescript
// OLD (UTC)
const today = new Date().toISOString();
checkin_date: today.split('T')[0],

// NEW (Central)
import { getCentralTimeToday } from '../lib/utils/timezone';
const today = getCentralTimeToday();
checkin_date: today,
```

#### 3. Update checkins.ts

**Change**:
```typescript
// OLD (UTC)
export async function getTodayForUser(userId: string, tenantId: string | null) {
  const today = new Date().toISOString().split('T')[0]
  // ...
}

// NEW (Central)
import { getCentralTimeToday } from '../utils/timezone';

export async function getTodayForUser(userId: string, tenantId: string | null) {
  const today = getCentralTimeToday()
  // ...
}
```

#### 4. Update Dashboard.tsx

**Change**:
```typescript
// OLD (inline function)
const getCentralTimeToday = () => {
  const now = new Date();
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return centralTime.toISOString().split('T')[0];
};
const today = getCentralTimeToday();

// NEW (imported utility)
import { getCentralTimeToday } from '../lib/utils/timezone';
const today = getCentralTimeToday();
```

#### 5. Update useAdminTreeData.ts

**Review and update** all instances of:
```typescript
const today = new Date().toISOString().split('T')[0];
```

To:
```typescript
import { getCentralTimeToday } from '../lib/utils/timezone';
const today = getCentralTimeToday();
```

---

## Data Cleanup

### Kirk Ferentz's Orphaned Check-In

**Option 1**: Delete the check-in (allows re-submission today)
```sql
DELETE FROM public.daily_checkins 
WHERE id = '7ea097eb-1938-46b7-896c-4e7a9969cd3f';
```

**Option 2**: Update the check-in date to Central date
```sql
UPDATE public.daily_checkins 
SET checkin_date = '2025-10-06'
WHERE id = '7ea097eb-1938-46b7-896c-4e7a9969cd3f';
```

**Recommendation**: **Option 2** (Update) - Preserves the check-in data

### Find All Affected Check-Ins

```sql
-- Find check-ins created "tomorrow" in Central Time
SELECT 
  dc.id,
  dc.user_id,
  up.display_name,
  dc.checkin_date,
  dc.created_at,
  dc.created_at AT TIME ZONE 'America/Chicago' as created_at_central,
  (dc.created_at AT TIME ZONE 'America/Chicago')::date as created_date_central
FROM public.daily_checkins dc
JOIN public.user_profiles up ON dc.user_id = up.user_id
WHERE dc.checkin_date > (dc.created_at AT TIME ZONE 'America/Chicago')::date
ORDER BY dc.created_at DESC;
```

---

## Testing Plan

### Test Case 1: Before Midnight Central

**Time**: 10:00 PM Central (3:00 AM UTC next day)  
**Expected**:
- Check-in saved with today's Central date
- Dashboard shows check-in immediately
- Cannot submit second check-in

### Test Case 2: After Midnight Central

**Time**: 12:01 AM Central (5:01 AM UTC)  
**Expected**:
- Check-in saved with new day's Central date
- Dashboard shows "Ready" (new day)
- Can submit new check-in

### Test Case 3: Existing Check-In Update

**Scenario**: User has check-in from earlier today  
**Expected**:
- Dashboard shows existing check-in
- User can update (not create new)
- Same `checkin_date` maintained

---

## Prevention Strategy

### 1. Centralized Timezone Utility

- All date operations use `getCentralTimeToday()`
- No direct use of `new Date().toISOString().split('T')[0]`
- Consistent across entire codebase

### 2. Code Review Checklist

- [ ] All `checkin_date` assignments use Central Time
- [ ] All `checkin_date` queries use Central Time
- [ ] No hardcoded timezone conversions
- [ ] Utility function imported where needed

### 3. Documentation

- Update all docs to specify Central Time usage
- Add comments explaining timezone choice
- Document edge cases (midnight transitions)

---

## Files to Modify

1. ✅ `src/lib/utils/timezone.ts` - NEW utility file
2. ✅ `src/components/DailyCheckin.tsx` - Use Central Time
3. ✅ `src/lib/services/checkins.ts` - Use Central Time
4. ✅ `src/components/Dashboard.tsx` - Use imported utility
5. ✅ `src/hooks/useAdminTreeData.ts` - Use Central Time
6. ⚠️ `src/components/DataGenerator.tsx` - Review and update if needed

---

## Rollout Plan

### Phase 1: Fix Code (Immediate)
1. Create timezone utility
2. Update all components
3. Test locally
4. Deploy to dev

### Phase 2: Clean Data (After Deploy)
1. Run query to find affected check-ins
2. Update `checkin_date` to match Central Time
3. Verify no duplicates created

### Phase 3: Monitor (Ongoing)
1. Watch for similar issues
2. Monitor error logs
3. User feedback

---

**Status**: 🔍 ROOT CAUSE IDENTIFIED - Ready for implementation  
**Priority**: HIGH - Affects users daily from 7 PM to midnight Central  
**Estimated Fix Time**: 30 minutes

