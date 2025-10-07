# Tribe Feed Group Enhancement - Complete Implementation

## Overview

Enhanced the Tribe Feed page (`/sangha`) to properly display group-based check-ins with complete user information and clear group context. This fixes data consistency issues and provides users with a clear understanding of which groups they're viewing.

**Status**: ✅ **COMPLETE**

**Date**: 2025-10-07

---

## Problems Solved

### 1. ❌ **Incorrect Data Fetching Logic**
**Before**: Fetched all check-ins by tenant, not by user's groups
- Used `listTenantFeed()` which fetches ALL tenant check-ins
- Didn't respect group membership boundaries
- Showed check-ins from users not in the same groups

**After**: Fetches only check-ins shared with user's groups
- Created new `listGroupFeed()` function
- Properly joins `checkin_group_shares` → `daily_checkins` → `user_profiles`
- Only shows check-ins from users in the same groups

---

### 2. ❌ **Inconsistent User Data Display**
**Before**: User profiles fetched separately, causing mismatches
- Profiles fetched in separate query after check-ins loaded
- Race conditions could cause missing/incorrect user data
- Some check-ins showed "Anonymous" instead of real names

**After**: User profiles embedded in check-in data
- Single query joins user profiles with check-ins
- Guaranteed 1:1 relationship between check-in and user data
- Every check-in has complete user information (name, avatar)

---

### 3. ❌ **Missing Group Context**
**Before**: No indication of which group(s) user is viewing
- Header just said "Tribe Feed"
- Users didn't know which groups they were seeing
- Confusing for users in multiple groups

**After**: Clear group context displayed
- Shows user's group name(s) prominently
- Indicates if user is in multiple groups
- Warning message if user has no groups

---

### 4. ❌ **Unclear Time Range**
**Before**: Filter said "All Recent" - ambiguous
- Users didn't know how far back data went
- No clear indication of date range

**After**: Explicit time range labels
- "Last 7 Days" instead of "All Recent"
- "Today Only" for today's check-ins
- Subtitle clarifies: "Last 7 days of check-ins from your groups"

---

## Implementation Details

### Files Modified

#### 1. `src/lib/services/checkins.ts`
**Added**: New `listGroupFeed()` function

```typescript
export async function listGroupFeed(userId: string, sinceIso?: string)
```

**Features**:
- Fetches user's group memberships
- Queries `checkin_group_shares` with joins to `daily_checkins` and `user_profiles`
- Returns check-ins with embedded user profile data
- Removes duplicates (same check-in shared to multiple groups)
- Filters by date range (today or last 7 days)

**Query Structure**:
```typescript
supabase
  .from('checkin_group_shares')
  .select(`
    checkin_id,
    group_id,
    daily_checkins!inner (
      *,
      user_profiles!inner (
        user_id,
        display_name,
        avatar_url,
        is_public
      )
    )
  `)
  .in('group_id', groupIds)
  .eq('daily_checkins.is_private', false)
```

---

#### 2. `src/components/SanghaFeed.tsx`
**Changes**:
1. Import `listGroupFeed` instead of `listTenantFeed`
2. Import `listMembershipsByUser` and `supabase` for group fetching
3. Added `userGroups` state and `groupsLoading` state
4. Added `UserGroup` interface
5. Updated `DailyCheckin` interface to include `user_profile` field
6. Created `fetchUserGroups()` function
7. Updated `fetchFeed()` to use `listGroupFeed()`
8. Removed `fetchPublicProfiles()` function (no longer needed)
9. Enhanced header to display group context
10. Updated filter labels for clarity

**New State**:
```typescript
const [userGroups, setUserGroups] = useState<UserGroup[]>([])
const [groupsLoading, setGroupsLoading] = useState(true)
```

**New Function**: `fetchUserGroups()`
- Fetches user's group memberships
- Queries group details (id, name, description)
- Sets `userGroups` state for display

**Updated Function**: `fetchFeed()`
- Uses `listGroupFeed(user.userId, sinceIso)` instead of `listTenantFeed()`
- Builds profile map from embedded `user_profile` data
- No separate profile fetch needed

---

### Database Architecture

#### Tables Involved

1. **`group_memberships`**
   - Links users to groups
   - Fields: `user_id`, `group_id`, `role`

2. **`checkin_group_shares`**
   - Links check-ins to groups
   - Fields: `checkin_id`, `group_id`

3. **`daily_checkins`**
   - User check-ins
   - Fields: `id`, `user_id`, `mental_rating`, etc.

4. **`user_profiles`**
   - User profile information
   - Fields: `user_id`, `display_name`, `avatar_url`, `is_public`

5. **`groups`**
   - Group information
   - Fields: `id`, `name`, `description`, `tenant_id`

#### Query Flow

```
User ID
  ↓
group_memberships (get user's groups)
  ↓
checkin_group_shares (get check-ins shared with those groups)
  ↓
daily_checkins (join check-in data)
  ↓
user_profiles (join user data)
  ↓
Result: Check-ins with complete user info
```

---

## UI/UX Improvements

### Header - Before
```
┌────────────────────────────────────────┐
│  Tribe Feed                            │
│  See how your tribe is doing           │
│                                        │
│  [All Recent] [Today Only]             │
└────────────────────────────────────────┘
```

**Issues**:
- No group context
- "All Recent" is vague
- No indication of what user is viewing

---

### Header - After (Single Group)
```
┌────────────────────────────────────────┐
│  Tribe Feed                            │
│  👥 Viewing: Recovery Warriors         │
│  Last 7 days of check-ins from your    │
│  groups                                │
│                                        │
│  [Last 7 Days] [Today Only]            │
└────────────────────────────────────────┘
```

**Improvements**:
- Clear group name displayed
- Explicit time range
- User knows exactly what they're viewing

---

### Header - After (Multiple Groups)
```
┌────────────────────────────────────────┐
│  Tribe Feed                            │
│  👥 Your Groups: Recovery Warriors,    │
│     Support Circle, Wellness Team      │
│  Last 7 days of check-ins from your    │
│  groups                                │
│                                        │
│  [Last 7 Days] [Today Only]            │
└────────────────────────────────────────┘
```

**Improvements**:
- Shows all group names
- Clear indication of multiple groups
- User understands they're seeing combined feed

---

### Header - After (No Groups)
```
┌────────────────────────────────────────┐
│  Tribe Feed                            │
│  ┌──────────────────────────────────┐ │
│  │ ⚠️  You're not in any groups yet │ │
│  │ Join a group to see check-ins    │ │
│  │ from your tribe                  │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Improvements**:
- Clear warning message
- Explains why feed is empty
- Guides user to next action

---

## Data Consistency Guarantee

### Before: Separate Queries (Race Condition Risk)
```typescript
// Step 1: Fetch check-ins
const checkins = await listTenantFeed(tenantId)

// Step 2: Extract user IDs
const userIds = checkins.map(c => c.user_id)

// Step 3: Fetch profiles separately
const profiles = await listProfilesByUserIds(userIds)

// ❌ Problem: If profile fetch fails, check-ins show "Anonymous"
// ❌ Problem: Timing issues can cause mismatches
```

### After: Single Query with Joins (Guaranteed Consistency)
```typescript
// Single query with joins
const checkins = await listGroupFeed(userId, sinceIso)

// ✅ Each check-in includes user_profile data
// ✅ No race conditions
// ✅ Guaranteed 1:1 relationship
// ✅ Every check-in has complete user info

checkin.user_profile = {
  user_id: "...",
  display_name: "John Doe",
  avatar_url: "https://...",
  is_public: true
}
```

---

## Time Range Behavior

### "Last 7 Days" Mode
- Fetches check-ins from last 7 days (including today)
- Calculation: `Date.now() - 7 * 24 * 60 * 60 * 1000`
- Shows comprehensive recent activity

### "Today Only" Mode
- Fetches only today's check-ins
- Calculation: `${today}T00:00:00.000Z`
- Shows current day's activity

### Filter Persistence
- URL parameter support: `?filter=today`
- Maintains filter selection across page refreshes
- Redirects from check-in page can set filter

---

## Security & Privacy

### RLS Policies Respected
- Only fetches check-ins shared with user's groups
- Respects `is_private` flag (only shows public check-ins)
- User can only see check-ins from groups they're in

### Data Access Control
1. User must be in group to see check-ins shared with that group
2. Check-in must be marked `is_private = false`
3. User profile data only included if check-in is visible

---

## Performance Optimizations

### Single Query Instead of Multiple
**Before**: 3 separate queries
1. Fetch check-ins
2. Fetch user profiles
3. Fetch interactions

**After**: 2 queries
1. Fetch check-ins with user profiles (joined)
2. Fetch interactions

**Improvement**: 33% fewer database queries

### Duplicate Removal
- If user is in multiple groups and same check-in is shared to both
- Automatically deduplicates using Map
- Shows each check-in only once

### Efficient Joins
- Uses Supabase's `!inner` join syntax
- Only returns check-ins that have matching user profiles
- Filters at database level, not in application

---

## Testing Checklist

### Data Fetching
- [x] Check-ins from user's groups are displayed
- [x] Check-ins from other groups are NOT displayed
- [x] Private check-ins are NOT displayed
- [x] User profile data is always present
- [x] No "Anonymous" users shown

### Group Context
- [x] Single group: Shows "Viewing: [Group Name]"
- [x] Multiple groups: Shows "Your Groups: [Names]"
- [x] No groups: Shows warning message
- [x] Group names are correct

### Time Range
- [x] "Last 7 Days" shows check-ins from last 7 days
- [x] "Today Only" shows only today's check-ins
- [x] Date filter works correctly
- [x] Filter labels are clear

### User Data Consistency
- [x] Every check-in shows user name
- [x] Every check-in shows user avatar (or default)
- [x] User data matches check-in author
- [x] No mismatched user info

---

## Summary

✅ **Fixed data fetching** - Now uses group-based queries  
✅ **Guaranteed user data consistency** - Embedded profiles in check-ins  
✅ **Added group context** - Clear display of user's groups  
✅ **Clarified time ranges** - Explicit "Last 7 Days" and "Today Only"  
✅ **Improved performance** - Fewer database queries  
✅ **Enhanced UX** - Users know exactly what they're viewing  

**Access**: http://localhost:5175/sangha

**Build Status**: ✅ Successful (3.45s)

---

**Built with ❤️ by Augment Agent**

*Tribe Feed now properly displays group check-ins with complete user information!*

