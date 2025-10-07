# Dashboard "Today's Check-ins" Data Flow

## Overview

The Dashboard has TWO separate "Today's Check-ins" sections that fetch data differently.

## Section 1: Tribe Check-ins (Mini Cards)

**Visual Location**: Horizontal scrollable cards with avatars  
**Component**: `<TribeCheckinCard />`  
**State Variable**: `tribeCheckins`

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Logs Into Dashboard                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Has currentTenantId? │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼ YES                            ▼ NO (Solo User)
┌────────────────────┐          ┌────────────────────────┐
│ Fetch Real Data    │          │ MOCK DATA (PROBLEM!)   │
└────────┬───────────┘          │ Shows:                 │
         │                      │ - Sarah M. (😊)        │
         ▼                      │ - Alex R. (😌)         │
┌────────────────────┐          │ - Jordan K. (🌟)       │
│ 1. Get User's      │          └────────────────────────┘
│    Group IDs       │
└────────┬───────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 2. Query checkin_group_shares table   │
│    WHERE group_id IN (user's groups)  │
│    → Get list of shared checkin_ids   │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 3. Query daily_checkins table         │
│    WHERE:                              │
│    - tenant_id = currentTenantId      │
│    - is_private = false               │
│    - user_id != current user          │
│    - id IN (shared checkin_ids)       │
│    - created_at is TODAY ⚠️           │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 4. Fetch user_profiles for avatars    │
│    WHERE user_id IN (checkin users)   │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 5. Enrich check-ins with profile data │
│    - display_name                      │
│    - avatar_url                        │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 6. Set tribeCheckins state            │
│    → Renders TribeCheckinCard         │
└────────────────────────────────────────┘
```

### Database Tables Involved

```
┌──────────────────────┐
│ group_memberships    │  ← Get user's groups
├──────────────────────┤
│ user_id              │
│ group_id             │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ checkin_group_shares │  ← Get shared check-ins
├──────────────────────┤
│ checkin_id           │
│ group_id             │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ daily_checkins       │  ← Get check-in details
├──────────────────────┤
│ id                   │
│ user_id              │
│ tenant_id            │
│ is_private           │
│ created_at           │
│ mental_rating        │
│ mood_emoji           │
│ ...                  │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ user_profiles        │  ← Get user info
├──────────────────────┤
│ user_id              │
│ display_name         │
│ avatar_url           │
└──────────────────────┘
```

---

## Section 2: Recent Check-ins (Colored Grid Cards)

**Visual Location**: Grid of colored cards (green/yellow/red based on score)  
**Component**: Inline rendered cards  
**State Variable**: `recentCheckins`

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Logs Into Dashboard                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Has currentTenantId? │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼ YES                            ▼ NO (Solo User)
┌────────────────────┐          ┌────────────────────────┐
│ Fetch Real Data    │          │ Empty Array []         │
└────────┬───────────┘          │ Shows empty state      │
         │                      └────────────────────────┘
         ▼
┌────────────────────┐
│ 1. Get User's      │
│    Group IDs       │
└────────┬───────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 2. Query group_memberships table      │
│    WHERE group_id IN (user's groups)  │
│    AND user_id != current user        │
│    → Get list of group member IDs     │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 3. Query daily_checkins table         │
│    WHERE:                              │
│    - tenant_id = currentTenantId      │
│    - is_private = false               │
│    - user_id IN (group members)       │
│    - checkin_date is TODAY ✓          │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 4. Fetch user_profiles for avatars    │
│    WHERE user_id IN (checkin users)   │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 5. Enrich check-ins with profile data │
│    - display_name                      │
│    - avatar_url                        │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ 6. Set recentCheckins state           │
│    → Renders colored grid cards       │
└────────────────────────────────────────┘
```

### Database Tables Involved

```
┌──────────────────────┐
│ group_memberships    │  ← Get user's groups
├──────────────────────┤
│ user_id              │
│ group_id             │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ group_memberships    │  ← Get group members
├──────────────────────┤  (AGAIN - different query)
│ user_id              │
│ group_id             │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ daily_checkins       │  ← Get check-in details
├──────────────────────┤
│ id                   │
│ user_id              │
│ tenant_id            │
│ is_private           │
│ checkin_date         │
│ mental_rating        │
│ mood_emoji           │
│ ...                  │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ user_profiles        │  ← Get user info
├──────────────────────┤
│ user_id              │
│ display_name         │
│ avatar_url           │
└──────────────────────┘
```

---

## Key Differences Between Sections

| Aspect | Tribe Check-ins | Recent Check-ins |
|--------|----------------|------------------|
| **Uses checkin_group_shares?** | ✅ Yes | ❌ No |
| **Date Filter Field** | `created_at` ⚠️ | `checkin_date` ✓ |
| **Excludes Current User?** | ✅ Yes | ✅ Yes |
| **Solo Mode Behavior** | Shows MOCK DATA ❌ | Shows empty array ✓ |
| **Component** | TribeCheckinCard | Inline cards |
| **Layout** | Horizontal scroll | Grid |
| **Visual Style** | Mini cards with avatars | Colored cards |

---

## The Mock Data Problem

### Current Code (Lines 234-287)

```typescript
if (currentTenantId) {
  // Fetch real data from database
  // ... complex queries ...
} else {
  // ⚠️ PROBLEM: Shows fake data for solo users
  const mockTribeCheckins: TribeCheckin[] = [
    {
      user_name: 'Sarah M.',
      mood_emoji: '😊',
      mental_rating: 8,
      // ... fake data ...
    },
    {
      user_name: 'Alex R.',
      mood_emoji: '😌',
      // ... fake data ...
    },
    {
      user_name: 'Jordan K.',
      mood_emoji: '🌟',
      // ... fake data ...
    }
  ];
  setTribeCheckins(mockTribeCheckins);
}
```

### Why This Exists

This was likely added during development to:
1. Test the UI without setting up a full tenant/group structure
2. Show example data for demo purposes
3. Provide visual feedback during development

### Why It's a Problem

1. **Confusing to Users**: Solo users see fake check-ins from people who don't exist
2. **Data Integrity**: Users can't tell what's real vs. fake
3. **Privacy Concern**: Might make users think their data is being shared incorrectly
4. **Production Code**: Development/testing code left in production

---

## Recommended Architecture

### Unified Data Fetching

Instead of two separate queries, consider:

```typescript
async function fetchTodayGroupCheckins(userId: string, tenantId: string) {
  // 1. Get user's groups
  const groups = await getUserGroups(userId);
  
  // 2. Get group members
  const memberIds = await getGroupMembers(groups);
  
  // 3. Fetch check-ins
  const checkins = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_private', false)
    .in('user_id', memberIds)
    .neq('user_id', userId)  // Exclude self
    .gte('checkin_date', today)  // Use checkin_date
    .lte('checkin_date', today)
    .order('created_at', { ascending: false });
  
  // 4. Enrich with profiles
  return enrichWithProfiles(checkins);
}
```

### Solo Mode Handling

```typescript
if (currentTenantId) {
  const checkins = await fetchTodayGroupCheckins(user.userId, currentTenantId);
  setTribeCheckins(checkins);
  setRecentCheckins(checkins);  // Use same data
} else {
  // Solo mode: No group sharing
  setTribeCheckins([]);
  setRecentCheckins([]);
  // UI will show appropriate empty states
}
```

---

## Testing Scenarios

### Scenario 1: Solo User (No Tenant)
```
User: john@example.com
Tenant: null
Groups: []

Expected:
- tribeCheckins: []
- recentCheckins: []
- UI: "No check-ins yet today"

Current (WRONG):
- tribeCheckins: [Sarah M., Alex R., Jordan K.] ❌
- recentCheckins: []
```

### Scenario 2: Tenant User in "Matterdaddies" Group
```
User: jane@example.com
Tenant: facility-123
Groups: [matterdaddies-group-id]
Group Members: [bob, alice, charlie]

Expected:
- Fetch check-ins from bob, alice, charlie
- Filter by today's date
- Include profile pictures
- Exclude jane's own check-in

Current:
- Works correctly ✓
```

### Scenario 3: Tenant User, No Group Members Checked In
```
User: jane@example.com
Tenant: facility-123
Groups: [matterdaddies-group-id]
Group Members: [bob, alice, charlie]
Today's Check-ins: []

Expected:
- tribeCheckins: []
- recentCheckins: []
- UI: "No check-ins yet today"

Current:
- Works correctly ✓
```

---

## Summary

**The Issue**: Mock data (Sarah M., Alex R., Jordan K.) appears for solo users because of a development fallback at lines 234-287.

**The Fix**: Remove the mock data and show empty state for solo users.

**The Impact**: Solo users will see appropriate empty states instead of confusing fake data. Tenant users are unaffected.

