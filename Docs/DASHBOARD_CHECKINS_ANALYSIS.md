# Dashboard "Today's Check-ins" Analysis

## Executive Summary

**ISSUE IDENTIFIED**: The Dashboard displays **MOCK/HARDCODED DATA** when the user has no tenant (solo mode), showing fake check-ins from "Sarah M.", "Alex R.", and "Jordan K."

**DATA SOURCE**: `src/components/Dashboard.tsx` (lines 236-286)

**ROOT CAUSE**: Fallback mock data is displayed when `currentTenantId` is null (solo users without a facility/tenant).

---

## Detailed Findings

### 1. Where is the data coming from?

There are **TWO** "Today's Check-ins" sections on the Dashboard:

#### Section A: Tribe Check-ins (Mini Cards with TribeCheckinCard)
- **Location**: Lines 497-520 in Dashboard.tsx
- **Component**: `<TribeCheckinCard />` 
- **Data Source**: `tribeCheckins` state variable
- **Rendering**: Horizontal scrollable mini-cards with avatars

#### Section B: Recent Check-ins (Colored Grid Cards)
- **Location**: Lines 603-680 in Dashboard.tsx
- **Component**: Inline rendered colored cards
- **Data Source**: `recentCheckins` state variable
- **Rendering**: Grid layout with colored backgrounds

### 2. Data Fetching Logic

The data is fetched in the `fetchDashboardData()` function (lines 70-296):

#### For Users WITH a Tenant (currentTenantId exists):

**Tribe Check-ins (Section A):**
```typescript
// Lines 169-233
1. Get user's group memberships
2. Get all checkin_id's shared to those groups (via checkin_group_shares table)
3. Fetch check-ins from daily_checkins where:
   - tenant_id matches
   - is_private = false
   - user_id != current user
   - id is in the shared checkin_ids
   - created_at is today
4. Fetch user profiles for display names and avatars
5. Enrich check-ins with profile data
```

**Recent Check-ins (Section B):**
```typescript
// Lines 98-167
1. Get user's group memberships
2. Get all user_ids in those groups (excluding current user)
3. Fetch check-ins from daily_checkins where:
   - tenant_id matches
   - is_private = false
   - user_id is in group member list
   - checkin_date is today
4. Fetch user profiles
5. Enrich check-ins with profile data
```

#### For Users WITHOUT a Tenant (Solo Mode):

**THIS IS THE PROBLEM:**

```typescript
// Lines 234-287
} else {
  // For testing purposes, add some mock data with proper UUIDs
  const mockTribeCheckins: TribeCheckin[] = [
    {
      _id: '550e8400-e29b-41d4-a716-446655440001',
      user_id: '550e8400-e29b-41d4-a716-446655440011',
      user_name: 'Sarah M.',
      user_avatar_url: '',
      mental_rating: 8,
      emotional_rating: 7,
      physical_rating: 9,
      social_rating: 6,
      spiritual_rating: 8,
      mood_emoji: '😊',
      grateful_for: ['My morning meditation', 'Supportive friends'],
      mental_notes: 'Feeling clear and focused today',
      spiritual_notes: 'Found peace in my morning practice',
      created_at: new Date().toISOString()
    },
    {
      _id: '550e8400-e29b-41d4-a716-446655440002',
      user_id: '550e8400-e29b-41d4-a716-446655440012',
      user_name: 'Alex R.',
      // ... more mock data
    },
    {
      _id: '550e8400-e29b-41d4-a716-446655440003',
      user_id: '550e8400-e29b-41d4-a716-446655440013',
      user_name: 'Jordan K.',
      // ... more mock data
    }
  ];
  setTribeCheckins(mockTribeCheckins);
}
```

**The mock data includes:**
- Sarah M. (😊) - 8/10 average
- Alex R. (😌) - 6/10 average  
- Jordan K. (🌟) - 9/10 average

### 3. Expected Behavior

According to the multi-tenant architecture:

**For Tenant Users (Facility Members):**
- Should see check-ins from other members in their shared groups
- Should filter by today's date
- Should include profile pictures from user_profiles table
- Should only show non-private check-ins

**For Solo Users (No Tenant):**
- Should see ONLY their own check-ins (no group sharing)
- Should NOT see mock data
- Should show empty state if no group members exist

### 4. What Needs to be Verified/Fixed

#### Issue #1: Mock Data for Solo Users
**Problem**: Lines 234-287 show hardcoded mock data when `currentTenantId` is null

**Fix**: Remove the mock data fallback and show proper empty state

```typescript
// CURRENT (WRONG):
} else {
  const mockTribeCheckins: TribeCheckin[] = [ /* mock data */ ];
  setTribeCheckins(mockTribeCheckins);
}

// SHOULD BE:
} else {
  setTribeCheckins([]);
}
```

#### Issue #2: Solo User Check-in Logic
**Problem**: Solo users (no tenant) should still be able to see their own check-ins, but the current logic skips them entirely when `currentTenantId` is null.

**Current Logic**:
```typescript
if (currentTenantId) {
  // Fetch group check-ins
} else {
  // Show mock data (WRONG)
}
```

**Should Be**:
```typescript
if (currentTenantId) {
  // Fetch group check-ins (existing logic)
} else {
  // Solo mode: Show empty state or only user's own check-ins
  setTribeCheckins([]);
  setRecentCheckins([]);
}
```

#### Issue #3: Data Source Confusion
There are TWO separate data fetching blocks for similar data:
- `tribeCheckins` (uses `checkin_group_shares` table)
- `recentCheckins` (uses direct group membership query)

**Question**: Why two different approaches?

**Analysis**:
- `tribeCheckins`: Uses the `checkin_group_shares` junction table (more complex, allows selective sharing)
- `recentCheckins`: Directly queries group members (simpler, assumes all non-private check-ins are shared)

**Recommendation**: Consolidate to one approach or clearly document why both exist.

### 5. Database Query Verification

#### Tribe Check-ins Query (Lines 186-196):
```sql
SELECT * FROM daily_checkins
WHERE tenant_id = ?
  AND is_private = false
  AND user_id != ?  -- Exclude current user
  AND id IN (?)     -- Only shared check-ins
  AND created_at >= 'YYYY-MM-DDT00:00:00.000Z'
  AND created_at < 'YYYY-MM-DDT23:59:59.999Z'
ORDER BY created_at DESC
LIMIT 20
```

**Issue**: Uses `created_at` for date filtering instead of `checkin_date`

#### Recent Check-ins Query (Lines 118-128):
```sql
SELECT * FROM daily_checkins
WHERE tenant_id = ?
  AND is_private = false
  AND user_id IN (?)  -- Group members
  AND checkin_date >= 'YYYY-MM-DD'
  AND checkin_date <= 'YYYY-MM-DD'
ORDER BY created_at DESC
LIMIT 20
```

**Correct**: Uses `checkin_date` for filtering

**Recommendation**: Both should use `checkin_date` for consistency.

---

## Summary of Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Mock data for solo users | **HIGH** | Lines 234-287 | Users see fake check-ins |
| Inconsistent date filtering | **MEDIUM** | Lines 193 vs 124-125 | May show wrong day's data |
| Duplicate data fetching | **LOW** | Lines 98-167 & 169-233 | Code complexity |
| No solo mode support | **MEDIUM** | Lines 234-287 | Solo users have poor UX |

---

## Recommended Fixes

### Fix #1: Remove Mock Data (IMMEDIATE)

```typescript
// Line 234-287: REPLACE THIS ENTIRE BLOCK
} else {
  setTribeCheckins([]);
}
```

### Fix #2: Standardize Date Filtering

```typescript
// Line 193: CHANGE FROM
.gte('created_at', `${today}T00:00:00.000Z`).lt('created_at', `${today}T23:59:59.999Z`)

// TO
.gte('checkin_date', today).lte('checkin_date', today)
```

### Fix #3: Add Solo Mode Support (Optional)

```typescript
} else {
  // Solo mode: User can only see their own check-ins
  const { data: soloCheckins } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.userId)
    .is('tenant_id', null)
    .gte('checkin_date', today)
    .lte('checkin_date', today)
    .order('created_at', { ascending: false });
  
  // Show user's own check-in in the feed (if desired)
  // Or keep empty: setTribeCheckins([]);
}
```

---

## Testing Checklist

After fixes:
- [ ] Solo user (no tenant) sees empty state, not mock data
- [ ] Tenant user sees real check-ins from group members
- [ ] Profile pictures display correctly
- [ ] Only today's check-ins appear
- [ ] Private check-ins are excluded
- [ ] User's own check-in is excluded from tribe feed
- [ ] Empty state shows when no group members have checked in

---

## Conclusion

**The data you're seeing (Sarah M., Alex R., Jordan K.) is HARDCODED MOCK DATA** that appears when:
1. The user has no `currentTenantId` (solo mode)
2. The fallback logic at lines 234-287 kicks in

**To fix**: Remove the mock data block and replace with empty state or proper solo mode logic.

**Root cause**: Development/testing code left in production that was meant to show example data for users without groups.

