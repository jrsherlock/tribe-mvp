# Tribe Feed Schema Relationship Fix

**Date**: 2025-10-07  
**Issue**: Tribe Feed failing to load due to missing foreign key relationship  
**Status**: ✅ FIXED

---

## Problem

The Tribe Feed page (`/sangha`) was failing to load with the following error:

```
PGRST200: Could not find a relationship between 'daily_checkins' and 'user_profiles' in the schema cache
```

### Error Details

**HTTP Request**:
```
GET /rest/v1/checkin_group_shares?select=...daily_checkins!inner(...user_profiles!inner(...))
Status: 400 Bad Request
```

**Error Message**:
```json
{
  "code": "PGRST200",
  "message": "Could not find a relationship between 'daily_checkins' and 'user_profiles' in the schema cache",
  "details": "Searched for a foreign key relationship between 'daily_checkins' and 'user_profiles' in the schema 'public', but no matches were found."
}
```

---

## Root Cause

### Database Schema Analysis

Both `daily_checkins` and `user_profiles` tables reference `auth.users` but **not each other**:

```sql
-- user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ...
);

-- daily_checkins table
CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ...
);
```

**The Problem**: There is no direct foreign key relationship between these two tables.

### Query Issue

The original query in `listGroupFeed()` tried to join them directly:

```typescript
// ❌ BROKEN QUERY
supabase
  .from('checkin_group_shares')
  .select(`
    checkin_id,
    group_id,
    daily_checkins!inner (
      id,
      user_id,
      ...
      user_profiles!inner (  // ❌ No FK relationship!
        user_id,
        display_name,
        avatar_url,
        is_public
      )
    )
  `)
```

Supabase PostgREST requires an explicit foreign key relationship to perform joins. Since `daily_checkins` doesn't have a foreign key to `user_profiles`, the join fails.

---

## Solution

### Approach: Separate Queries

Instead of trying to join in a single query, we now:
1. Fetch check-ins from groups
2. Extract unique user IDs
3. Fetch user profiles separately
4. Merge the data in JavaScript

### Implementation

**File**: `src/lib/services/checkins.ts`

#### Step 1: Fetch Check-ins (Without Profiles)

```typescript
// ✅ FIXED QUERY - No nested user_profiles join
let query = supabase
  .from('checkin_group_shares')
  .select(`
    checkin_id,
    group_id,
    daily_checkins!inner (
      id,
      user_id,
      tenant_id,
      checkin_date,
      mental_rating,
      emotional_rating,
      physical_rating,
      social_rating,
      spiritual_rating,
      mental_notes,
      emotional_notes,
      physical_notes,
      social_notes,
      spiritual_notes,
      mental_emojis,
      emotional_emojis,
      physical_emojis,
      social_emojis,
      spiritual_emojis,
      gratitude,
      is_private,
      mood_emoji,
      created_at,
      updated_at
    )
  `)
  .in('group_id', groupIds)
  .eq('daily_checkins.is_private', false)
  .order('daily_checkins(created_at)', { ascending: false })
```

#### Step 2: Extract Check-ins and Remove Duplicates

```typescript
const checkins = shares.map((share: any) => ({
  ...share.daily_checkins,
  _id: share.daily_checkins.id
}))

// Remove duplicates (same checkin shared to multiple groups)
const uniqueCheckins = Array.from(
  new Map(checkins.map(c => [c.id, c])).values()
)
```

#### Step 3: Fetch User Profiles Separately

```typescript
// Get unique user IDs from check-ins
const userIds = [...new Set(uniqueCheckins.map(c => c.user_id))]

// Fetch profiles for these users
const { data: profiles, error: profilesError } = await supabase
  .from('user_profiles')
  .select('user_id, display_name, avatar_url, is_public')
  .in('user_id', userIds)
```

#### Step 4: Merge Data

```typescript
// Create a map for quick lookup
const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

// Attach profiles to check-ins
const checkinsWithProfiles = uniqueCheckins.map(checkin => ({
  ...checkin,
  user_profile: profileMap.get(checkin.user_id) || {
    user_id: checkin.user_id,
    display_name: 'Anonymous',
    avatar_url: '',
    is_public: false
  }
}))
```

---

## Benefits of This Approach

### 1. **Works Without Schema Changes**
- No need to add foreign keys to the database
- No migrations required
- Maintains existing schema structure

### 2. **Handles Missing Profiles Gracefully**
- If a user profile doesn't exist, shows "Anonymous"
- Doesn't fail the entire query
- Continues to show check-ins even if profiles are missing

### 3. **Efficient**
- Only 2 database queries instead of nested joins
- Deduplicates check-ins before fetching profiles
- Uses `IN` clause for batch profile fetching

### 4. **Maintainable**
- Clear separation of concerns
- Easy to debug
- Explicit data transformation

---

## Testing

### Test Case 1: User in Groups with Check-ins
**Expected**: Tribe Feed loads with check-ins from groups  
**Result**: ✅ PASS

### Test Case 2: User in Groups with No Check-ins
**Expected**: Tribe Feed loads with empty state  
**Result**: ✅ PASS

### Test Case 3: Solo User (No Groups)
**Expected**: Tribe Feed loads with message "You're not in any groups yet"  
**Result**: ✅ PASS

### Test Case 4: Check-in Author Has No Profile
**Expected**: Check-in shows with "Anonymous" as display name  
**Result**: ✅ PASS

---

## Alternative Solutions Considered

### Option 1: Add Foreign Key to Database ❌
**Rejected**: Would require schema migration and doesn't make semantic sense (check-ins don't "belong to" profiles)

### Option 2: Use PostgREST Hints ❌
**Rejected**: PostgREST hints only work when there's an actual FK relationship

### Option 3: Create Database View ❌
**Rejected**: Adds complexity and doesn't solve the fundamental issue

### Option 4: Separate Queries ✅
**Selected**: Simple, maintainable, works with existing schema

---

## Impact on Check-In Navigation

This fix **resolves the check-in navigation issue** because:

1. **Before**: Check-in submission would navigate to `/sangha`, but the page would fail to load with a 400 error
2. **After**: Check-in submission navigates to `/sangha`, and the page loads successfully

The navigation code was always working correctly - the issue was that the destination page was broken.

---

## Related Issues

### Check-In Submission Navigation
**Status**: ✅ Working  
**Details**: Navigation code exists and functions correctly (lines 466-475 in `DailyCheckin.tsx`)

### User Experience
**Before**: User submits check-in → navigates to feed → sees error  
**After**: User submits check-in → navigates to feed → sees their check-in

---

## Files Modified

- `src/lib/services/checkins.ts` - Updated `listGroupFeed()` function

---

## Database Schema (No Changes Required)

The existing schema remains unchanged:

```sql
-- user_profiles: user_id → auth.users.id
-- daily_checkins: user_id → auth.users.id
-- No direct relationship between user_profiles and daily_checkins
```

---

## Performance Considerations

### Query Count
- **Before**: 1 query (that failed)
- **After**: 2 queries (both succeed)

### Data Transfer
- **Before**: Would have transferred nested data
- **After**: Transfers same data in two separate responses

### Optimization Opportunities
- Could cache user profiles in frontend
- Could use React Query for profile caching
- Could implement profile prefetching

---

## Monitoring

### Success Metrics
- ✅ No more PGRST200 errors in console
- ✅ Tribe Feed loads successfully
- ✅ Check-ins display with user information
- ✅ Navigation from check-in submission works end-to-end

### Error Handling
- Profile fetch errors are logged but don't break the feed
- Missing profiles show as "Anonymous"
- Empty states handled gracefully

---

**Status**: ✅ FIXED  
**Deployed**: Development environment  
**Ready for**: Production deployment

