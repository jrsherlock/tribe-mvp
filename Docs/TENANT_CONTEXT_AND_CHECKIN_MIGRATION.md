# Tenant Context and Check-in Migration

**Date**: 2025-10-07  
**Status**: ✅ IMPLEMENTED

---

## Business Model Context

### Primary Use Case: Facility-Based Recovery Platform

The platform is designed as a **multi-tenant SaaS** sold to treatment facilities:

- **Revenue Model**: Treatment facilities purchase site licenses
- **Primary Users**: Facility members (patients/residents) assigned to groups
- **Free Tier**: Solo mode exists as a "free forever" tier for individuals using MEPSS check-ins and goal tracking without facility features

### User Journey

1. **Solo User** → Creates account, uses MEPSS check-ins in solo mode (`tenant_id = null`)
2. **Joins Facility** → Receives invitation from facility, accepts invite
3. **Facility Member** → Operates in facility mode, sees group features, shares check-ins with groups

---

## Design Decision: Auto-Migrate Check-ins on Facility Join

### The Problem

When a user joins a facility, they have two contexts:
- **Solo mode**: `tenant_id = null` (personal check-ins)
- **Facility mode**: `tenant_id = <facility_id>` (facility check-ins)

The Dashboard filters check-ins by `tenant_id`:
```typescript
if (currentTenantId) 
  q1 = q1.eq('tenant_id', currentTenantId);  // Facility mode
else 
  q1 = q1.is('tenant_id', null);  // Solo mode
```

**Issue**: When a user joins a facility, their previous solo check-ins don't show up in facility mode, creating a confusing UX where their check-in history "disappears".

### The Solution

**Auto-migrate solo check-ins to facility mode when user joins a facility.**

**Rationale**:
1. **Complete History**: Facility members should see their full check-in history
2. **Treatment Context**: Facilities want to see the complete recovery journey
3. **User Experience**: No confusing "disappearing" check-ins
4. **Business Model**: Aligns with facility-first approach

---

## Implementation

### Database Trigger

Created a trigger that automatically migrates solo check-ins when a user joins a facility:

```sql
CREATE OR REPLACE FUNCTION migrate_solo_checkins_to_facility()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new tenant membership is created (user joins a facility)
  -- Migrate all their solo mode check-ins to the facility
  UPDATE public.daily_checkins
  SET tenant_id = NEW.tenant_id
  WHERE user_id = NEW.user_id
    AND tenant_id IS NULL;  -- Only migrate solo mode check-ins
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER migrate_checkins_on_tenant_join
  AFTER INSERT ON public.tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION migrate_solo_checkins_to_facility();
```

### How It Works

1. User creates check-ins in solo mode (`tenant_id = null`)
2. User receives facility invitation
3. User accepts invitation → New record inserted in `tenant_members`
4. **Trigger fires** → All solo check-ins updated to `tenant_id = <facility_id>`
5. User now sees complete check-in history in facility mode

---

## Example: Kirk Ferentz

### Timeline

1. **6:45 PM Central (Oct 6)**: Kirk creates check-in in solo mode
   ```json
   {
     "user_id": "bb513a39-b053-4800-b840-4fe0c8b4fd58",
     "tenant_id": null,
     "checkin_date": "2025-10-06"
   }
   ```

2. **7:43 PM Central (Oct 6)**: Kirk joins "Top of the World Ranch" facility
   - Trigger fires automatically
   - Check-in updated to `tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d'`

3. **10:21 PM Central (Oct 6)**: Kirk views Dashboard in facility mode
   - Dashboard shows his check-in ✅
   - Complete history visible

### Before Fix

**Dashboard Query**:
```typescript
.eq('user_id', 'bb513a39-b053-4800-b840-4fe0c8b4fd58')
.eq('tenant_id', 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d')  // Facility mode
```

**Check-in Data**:
```json
{
  "tenant_id": null  // Solo mode
}
```

**Result**: No match → Dashboard shows "Ready" ❌

### After Fix

**Dashboard Query**:
```typescript
.eq('user_id', 'bb513a39-b053-4800-b840-4fe0c8b4fd58')
.eq('tenant_id', 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d')  // Facility mode
```

**Check-in Data**:
```json
{
  "tenant_id": "a77d4b1b-7e8d-48e2-b509-b305c5615f4d"  // Facility mode
}
```

**Result**: Match found → Dashboard shows check-in ✅

---

## Tenant Context Behavior

### Solo Mode (`tenant_id = null`)

**Who**: Users who haven't joined a facility
**Features**:
- MEPSS check-ins (personal only)
- Goal tracking
- Sobriety streak
- Personal analytics
- **No** group features
- **No** community sharing

**Dashboard Query**:
```typescript
.eq('user_id', user.userId)
.is('tenant_id', null)
```

### Facility Mode (`tenant_id = <facility_id>`)

**Who**: Users who are members of a facility
**Features**:
- All solo mode features
- Group membership
- Community check-in sharing
- Group analytics
- Facility-wide features

**Dashboard Query**:
```typescript
.eq('user_id', user.userId)
.eq('tenant_id', currentTenantId)
```

---

## Edge Cases

### Case 1: User Joins Multiple Facilities

**Scenario**: User is invited to Facility A, then later invited to Facility B

**Current Behavior**: 
- User can only be a member of one facility at a time (based on current schema)
- If this changes, we'd need to handle check-in migration differently

**Future Consideration**: 
- Allow users to be members of multiple facilities
- Add facility switcher UI
- Don't auto-migrate check-ins (keep them in original facility context)

### Case 2: User Leaves Facility

**Scenario**: User is removed from a facility

**Current Behavior**: 
- Check-ins remain in facility context (`tenant_id` unchanged)
- User loses access to facility features
- Check-ins are still visible to facility (for treatment continuity)

**Alternative**: 
- Migrate check-ins back to solo mode when user leaves
- Requires additional trigger on DELETE from `tenant_members`

### Case 3: User Creates Check-in Before Joining Facility

**Scenario**: User creates check-in at 6 PM, joins facility at 7 PM (same day)

**Behavior**: 
- ✅ Check-in automatically migrated to facility
- ✅ Visible on Dashboard in facility mode
- ✅ No duplicate check-in issues

---

## Testing

### Test Case 1: New User Joins Facility

**Steps**:
1. Create new user in solo mode
2. User creates 3 check-ins in solo mode
3. User accepts facility invitation
4. Verify all 3 check-ins now have `tenant_id = <facility_id>`
5. Verify Dashboard shows all 3 check-ins in facility mode

**Expected**: ✅ All check-ins migrated, visible in facility mode

### Test Case 2: Existing Facility Member Creates Check-in

**Steps**:
1. User is already a facility member
2. User creates new check-in
3. Verify check-in has `tenant_id = <facility_id>` (not null)

**Expected**: ✅ Check-in created in facility mode directly

### Test Case 3: Solo User Creates Check-in

**Steps**:
1. User has no facility membership
2. User creates check-in
3. Verify check-in has `tenant_id = null`
4. Verify Dashboard shows check-in in solo mode

**Expected**: ✅ Check-in created in solo mode

---

## Related Issues Fixed

### Issue 1: Kirk Ferentz's Check-in Not Showing

**Root Cause**: Check-in created in solo mode, Dashboard viewing in facility mode  
**Fix**: Migrated check-in to facility mode  
**Prevention**: Auto-migration trigger ensures this won't happen again

### Issue 2: Auth Email Mismatch

**Root Cause**: Kirk's `user_id` linked to Jim Sherlock's auth email  
**Fix**: Updated `auth.users.email` to match `user_profiles.email`  
**Data**:
- Before: `auth.users.email = 'jsherlock@valabs.ai'`
- After: `auth.users.email = 'iowabone@yahoo.com'`

---

## Future Enhancements

### 1. Tenant Switcher UI (Not Needed for MVP)

Since facility members should always operate in facility mode, a tenant switcher is not necessary for the current business model.

**When it might be needed**:
- If users can be members of multiple facilities
- If facility members need to access solo mode features separately

### 2. Check-in Migration on Facility Leave

Add trigger to migrate check-ins back to solo mode when user leaves a facility:

```sql
CREATE TRIGGER migrate_checkins_on_tenant_leave
  AFTER DELETE ON public.tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION migrate_facility_checkins_to_solo();
```

### 3. Prevent Solo Check-ins for Facility Members

Add constraint to prevent facility members from creating solo check-ins:

```sql
ALTER TABLE public.daily_checkins
ADD CONSTRAINT facility_members_must_use_facility_context
CHECK (
  tenant_id IS NOT NULL OR 
  NOT EXISTS (
    SELECT 1 FROM public.tenant_members 
    WHERE user_id = daily_checkins.user_id
  )
);
```

---

## Files Modified

1. ✅ `supabase/migrations/20251007_migrate_checkins_on_tenant_join.sql` - Migration file
2. ✅ Database: Created `migrate_solo_checkins_to_facility()` function
3. ✅ Database: Created `migrate_checkins_on_tenant_join` trigger
4. ✅ Database: Updated Kirk Ferentz's check-in to facility mode
5. ✅ Database: Fixed Kirk Ferentz's auth email

---

## Summary

**Problem**: Users' check-ins "disappeared" when they joined a facility  
**Solution**: Auto-migrate solo check-ins to facility mode on join  
**Result**: Complete check-in history visible in facility context  
**Status**: ✅ Implemented and tested

**Business Alignment**: This solution aligns with the facility-first business model where most users will be facility members, and facilities need to see the complete recovery journey.

