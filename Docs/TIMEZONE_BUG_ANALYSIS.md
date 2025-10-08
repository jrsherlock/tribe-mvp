# Timezone Bug Analysis - October 7, 2025

## Executive Summary

**BUG FOUND**: `SanghaFeed.tsx` (My Tribe Feed) is using **UTC timezone** instead of **Central Time** for filtering "today's" check-ins, causing incorrect check-ins to be displayed.

**Impact**: Users see check-ins from the wrong day when viewing "Today Only" filter on My Tribe Feed page.

**Root Cause**: Line 155 in `SanghaFeed.tsx` uses `new Date().toISOString().split('T')[0]` which returns UTC date, not Central Time date.

---

## Detailed Analysis

### 1. Timezone Utility Implementation ✅

**File**: `src/lib/utils/timezone.ts`

**Status**: ✅ **CORRECT** - Properly implemented

```typescript
export function getCentralTimeToday(): string {
  const now = new Date();
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return centralTime.toISOString().split('T')[0];
}
```

**How it works**:
1. Gets current time: `new Date()`
2. Converts to Central Time string: `toLocaleString('en-US', { timeZone: 'America/Chicago' })`
3. Parses back to Date object: `new Date(...)`
4. Extracts date portion: `toISOString().split('T')[0]`

**Example**:
```
Current UTC time: 2025-10-07 01:30:00 UTC (Oct 7, 1:30 AM)
Central Time:     2025-10-06 20:30:00 CDT (Oct 6, 8:30 PM)
Returns:          "2025-10-06" ✅ (Correct - Oct 6 in Central)
```

---

### 2. Dashboard Implementation ✅

**File**: `src/components/Dashboard.tsx`

**Status**: ✅ **CORRECT** - Using Central Time

**Line 76**:
```typescript
const today = getCentralTimeToday();
```

**Line 87** (User's check-in query):
```typescript
const { data: myCheckins, error: e1 } = await q1
  .gte('checkin_date', today)  // Uses Central Time ✅
  .lte('checkin_date', today)
  .limit(1)
```

**Line 121** (Group check-ins query):
```typescript
const { data: rows, error: e2 } = await supabase
  .from('daily_checkins')
  .select('*')
  .eq('tenant_id', currentTenantId)
  .eq('is_private', false)
  .neq('user_id', user.userId)
  .in('id', checkinIds)
  .gte('checkin_date', today)  // Uses Central Time ✅
  .lte('checkin_date', today)
  .order('created_at', { ascending: false })
  .limit(20)
```

**Result**: Dashboard correctly shows "Today's Check-ins" based on Central Time ✅

---

### 3. SanghaFeed Implementation ❌

**File**: `src/components/SanghaFeed.tsx`

**Status**: ❌ **INCORRECT** - Using UTC Time

**Lines 154-156** (THE BUG):
```typescript
if (filterMode === 'today') {
  const today = new Date().toISOString().split('T')[0]  // ❌ UTC!
  sinceIso = `${today}T00:00:00.000Z`
}
```

**Problem**:
- `new Date().toISOString()` returns UTC time
- `.split('T')[0]` extracts UTC date
- Creates timestamp starting at midnight UTC, not midnight Central

**Example of the Bug**:
```
Current time: Oct 6, 2025 at 11:00 PM Central Time

UTC time:     Oct 7, 2025 at 04:00 AM UTC
UTC date:     "2025-10-07" ❌ WRONG!
sinceIso:     "2025-10-07T00:00:00.000Z"

Expected:
Central date: "2025-10-06" ✅ CORRECT
sinceIso:     "2025-10-06T05:00:00.000Z" (midnight Central = 5 AM UTC)
```

**Impact**:
- At 11 PM Central on Oct 6, users see Oct 7 check-ins (wrong day!)
- At 1 AM Central on Oct 7, users still see Oct 7 check-ins (correct by accident)
- Between 7 PM - midnight Central, the date is off by 1 day

---

### 4. Service Layer Implementation ✅

**File**: `src/lib/services/checkins.ts`

**Status**: ✅ **CORRECT** - Using Central Time

**Function**: `getTodayForUser()`

**Lines 31-37**:
```typescript
export async function getTodayForUser(userId: string, tenantId: string | null) {
  // Use Central Time to match Dashboard query logic and prevent timezone mismatches
  const today = getCentralTimeToday()  // ✅ Correct!
  let q = supabase.from('daily_checkins').select('*').eq('user_id', userId)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  else q = q.is('tenant_id', null)
  return q.gte('checkin_date', `${today}`).lte('checkin_date', `${today}`).limit(1)
}
```

**Result**: Service layer correctly uses Central Time ✅

---

## Timezone Offset Details

### Central Time (America/Chicago)

**Standard Time (CST)**: UTC-6
- November - March
- Example: 12:00 PM Central = 6:00 PM UTC

**Daylight Time (CDT)**: UTC-5
- March - November
- Example: 12:00 PM Central = 5:00 PM UTC

### Critical Time Windows

**When the bug manifests** (during CDT, UTC-5):

| Central Time | UTC Time | UTC Date | Central Date | Bug? |
|--------------|----------|----------|--------------|------|
| Oct 6, 6:00 PM | Oct 6, 11:00 PM | 2025-10-06 | 2025-10-06 | ✅ OK |
| Oct 6, 7:00 PM | Oct 7, 12:00 AM | **2025-10-07** | 2025-10-06 | ❌ **BUG** |
| Oct 6, 11:00 PM | Oct 7, 4:00 AM | **2025-10-07** | 2025-10-06 | ❌ **BUG** |
| Oct 7, 12:00 AM | Oct 7, 5:00 AM | 2025-10-07 | 2025-10-07 | ✅ OK |

**Bug Window**: 7:00 PM - 11:59 PM Central Time (5 hours per day)

---

## Code Comparison

### ❌ WRONG (SanghaFeed.tsx - Current)

```typescript
// Line 155 - Uses UTC
const today = new Date().toISOString().split('T')[0]
sinceIso = `${today}T00:00:00.000Z`

// Example at 11 PM Central on Oct 6:
// today = "2025-10-07" (WRONG - it's Oct 7 in UTC)
// sinceIso = "2025-10-07T00:00:00.000Z"
// Shows check-ins from Oct 7 instead of Oct 6!
```

### ✅ CORRECT (Dashboard.tsx - Reference)

```typescript
// Line 76 - Uses Central Time
const today = getCentralTimeToday()

// Line 87 - Filters by checkin_date
.gte('checkin_date', today)
.lte('checkin_date', today)

// Example at 11 PM Central on Oct 6:
// today = "2025-10-06" (CORRECT - it's Oct 6 in Central)
// Shows check-ins from Oct 6 ✅
```

---

## Proposed Fix

### Change Required in SanghaFeed.tsx

**File**: `src/components/SanghaFeed.tsx`
**Lines**: 154-160

**Before** (WRONG):
```typescript
if (filterMode === 'today') {
  const today = new Date().toISOString().split('T')[0]  // ❌ UTC
  sinceIso = `${today}T00:00:00.000Z`
} else {
  // Last 7 days including today
  sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}
```

**After** (CORRECT):
```typescript
if (filterMode === 'today') {
  const today = getCentralTimeToday()  // ✅ Central Time
  // Convert Central midnight to UTC timestamp
  const centralMidnight = new Date(`${today}T00:00:00-05:00`)  // CDT offset
  sinceIso = centralMidnight.toISOString()
} else {
  // Last 7 days including today
  sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}
```

**Alternative (Simpler)**:
```typescript
if (filterMode === 'today') {
  const today = getCentralTimeToday()  // ✅ Central Time
  sinceIso = `${today}T00:00:00.000Z`  // Still use checkin_date comparison
} else {
  sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}
```

**Note**: The simpler approach works because `listGroupFeed()` filters by `created_at` timestamp, but we should verify the query logic.

---

## Query Analysis

### Dashboard Query (Correct)

**Filters by**: `checkin_date` field (YYYY-MM-DD format)

```typescript
.gte('checkin_date', today)  // today = "2025-10-06"
.lte('checkin_date', today)
```

**How it works**:
- `checkin_date` is stored as "YYYY-MM-DD" string
- Direct string comparison: "2025-10-06" >= "2025-10-06" AND "2025-10-06" <= "2025-10-06"
- Works correctly regardless of timezone ✅

### SanghaFeed Query (Incorrect)

**Filters by**: `created_at` timestamp (ISO 8601 format)

**In `listGroupFeed()` (Line 109)**:
```typescript
if (sinceIso) {
  query = query.gte('daily_checkins.created_at', sinceIso)
}
```

**Problem**:
- `created_at` is a full timestamp: "2025-10-06T23:30:00.000Z"
- `sinceIso` is calculated from UTC date: "2025-10-07T00:00:00.000Z"
- Check-in created at 11:30 PM Central (Oct 6) has `created_at` = "2025-10-07T04:30:00.000Z"
- This is >= "2025-10-07T00:00:00.000Z", so it shows up ✅
- But we're using the wrong date to calculate `sinceIso` ❌

**The Real Issue**:
The query should filter by `checkin_date` field, not `created_at` timestamp!

---

## Recommended Solution

### Option 1: Filter by checkin_date (BEST)

**Change `listGroupFeed()` to filter by `checkin_date` instead of `created_at`**:

```typescript
// In SanghaFeed.tsx
if (filterMode === 'today') {
  const today = getCentralTimeToday()  // ✅ Central Time
  // Pass the date string instead of ISO timestamp
  const { data: groupCheckins, error } = await listGroupFeed(user.userId, today)
}

// In checkins.ts - Update listGroupFeed signature
export async function listGroupFeed(userId: string, sinceDate?: string) {
  // ...
  if (sinceDate) {
    // Filter by checkin_date field, not created_at
    query = query.gte('daily_checkins.checkin_date', sinceDate)
  }
}
```

**Pros**:
- Consistent with Dashboard logic
- Uses `checkin_date` field which is timezone-aware
- Simpler logic
- More accurate

**Cons**:
- Requires changing `listGroupFeed()` signature
- Need to update all callers

### Option 2: Convert Central Time to UTC Timestamp (ALTERNATIVE)

**Keep `created_at` filtering but fix the timezone conversion**:

```typescript
if (filterMode === 'today') {
  const today = getCentralTimeToday()  // "2025-10-06"
  
  // Create midnight Central Time and convert to UTC
  const centralMidnight = new Date(`${today}T00:00:00`)
  const centralOffset = centralMidnight.getTimezoneOffset() / 60  // Get offset in hours
  const utcMidnight = new Date(centralMidnight.getTime() + (centralOffset * 60 * 60 * 1000))
  
  sinceIso = utcMidnight.toISOString()
}
```

**Pros**:
- No changes to `listGroupFeed()`
- Keeps existing API

**Cons**:
- More complex
- Timezone offset calculation can be error-prone
- Still filtering by `created_at` instead of `checkin_date`

---

## Recommendation

**Use Option 1**: Filter by `checkin_date` field

**Reasoning**:
1. **Consistency**: Dashboard already uses `checkin_date` filtering
2. **Accuracy**: `checkin_date` is set using `getCentralTimeToday()` when check-in is created
3. **Simplicity**: Direct string comparison, no timezone math
4. **Maintainability**: Easier to understand and debug

---

## Testing Plan

### Test Cases

**Test 1: Evening Check-in (Bug Window)**
```
Time: Oct 6, 2025 at 10:00 PM Central
Expected: Show check-ins from Oct 6
Current (Bug): Shows check-ins from Oct 7 ❌
After Fix: Shows check-ins from Oct 6 ✅
```

**Test 2: Morning Check-in**
```
Time: Oct 7, 2025 at 9:00 AM Central
Expected: Show check-ins from Oct 7
Current: Shows check-ins from Oct 7 ✅ (works by accident)
After Fix: Shows check-ins from Oct 7 ✅
```

**Test 3: Midnight Boundary**
```
Time: Oct 6, 2025 at 11:59 PM Central
Expected: Show check-ins from Oct 6
Current (Bug): Shows check-ins from Oct 7 ❌
After Fix: Shows check-ins from Oct 6 ✅
```

**Test 4: Just After Midnight**
```
Time: Oct 7, 2025 at 12:01 AM Central
Expected: Show check-ins from Oct 7
Current: Shows check-ins from Oct 7 ✅
After Fix: Shows check-ins from Oct 7 ✅
```

---

## Files to Modify

### 1. SanghaFeed.tsx
**Lines**: 154-160
**Change**: Use `getCentralTimeToday()` instead of UTC date

### 2. checkins.ts (Optional - for Option 1)
**Function**: `listGroupFeed()`
**Change**: Filter by `checkin_date` instead of `created_at`

---

## Summary

| Component | Status | Uses Central Time? | Filters By |
|-----------|--------|-------------------|------------|
| **timezone.ts** | ✅ Correct | N/A | N/A |
| **Dashboard.tsx** | ✅ Correct | ✅ Yes | `checkin_date` |
| **SanghaFeed.tsx** | ❌ **BUG** | ❌ **No (UTC)** | `created_at` |
| **checkins.ts** | ✅ Correct | ✅ Yes | `checkin_date` |

**Bug Impact**: Users see incorrect check-ins between 7 PM - midnight Central Time (5 hours daily)

**Fix**: Change line 155 in `SanghaFeed.tsx` to use `getCentralTimeToday()` instead of UTC date

