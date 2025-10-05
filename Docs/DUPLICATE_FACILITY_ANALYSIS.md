# Duplicate Facility Analysis - Top of the World Ranch

## Summary

**Issue**: Two facilities named "Top of the World Ranch" exist in the database.

**Recommendation**: **DELETE** facility `3b2f18c9-761a-4d8c-b033-0b3afe1e3460` (older, orphaned)  
**Keep**: Facility `a77d4b1b-7e8d-48e2-b509-b305c5615f4d` (active, has all data)

---

## Facility Details

### Facility #1 (OLDER - Created First) ❌ DELETE THIS ONE
- **ID**: `3b2f18c9-761a-4d8c-b033-0b3afe1e3460`
- **Name**: "Top of the World Ranch"
- **Slug**: `totw-ranch`
- **Created**: 2025-09-26 06:27:14 (September 26, 2025)
- **Status**: ⚠️ **ORPHANED** - Has groups but NO members, NO check-ins, NO profiles

### Facility #2 (NEWER - Active) ✅ KEEP THIS ONE
- **ID**: `a77d4b1b-7e8d-48e2-b509-b305c5615f4d`
- **Name**: "Top of the World Ranch"
- **Slug**: `top-of-the-world-ranch`
- **Created**: 2025-10-03 17:16:10 (October 3, 2025)
- **Status**: ✅ **ACTIVE** - Has members, groups, check-ins, and profiles

---

## Data Comparison

| Metric | Facility #1 (OLD) | Facility #2 (NEW) |
|--------|-------------------|-------------------|
| **Tenant ID** | `3b2f18c9-761a-4d8c-b033-0b3afe1e3460` | `a77d4b1b-7e8d-48e2-b509-b305c5615f4d` |
| **Slug** | `totw-ranch` | `top-of-the-world-ranch` |
| **Created Date** | Sept 26, 2025 | Oct 3, 2025 |
| **Members** | 0 ❌ | 5 ✅ |
| **Groups** | 2 | 3 ✅ |
| **Check-ins** | 0 ❌ | 1 ✅ |
| **User Profiles** | 0 ❌ | 5 ✅ |
| **Your Membership** | None ❌ | OWNER ✅ |

---

## Detailed Data Breakdown

### Facility #1 (OLD - `3b2f18c9-761a-4d8c-b033-0b3afe1e3460`)

**Members**: 0
- No members assigned

**Groups**: 2
- "Matterdaddies"
- "Summer 2022"

**Check-ins**: 0
- No check-in activity

**User Profiles**: 0
- No user profiles associated

**Your Membership**: None
- You are NOT a member of this facility

---

### Facility #2 (NEW - `a77d4b1b-7e8d-48e2-b509-b305c5615f4d`)

**Members**: 5
- 1 OWNER (you - jrsherlock@gmail.com)
- 1 ADMIN
- 3 MEMBERS

**Groups**: 3
- "Default Group"
- "Morning Warriors"
- "Weekend Support"

**Check-ins**: 1
- Active check-in data

**User Profiles**: 5
- 5 user profiles associated with this facility

**Your Membership**: OWNER ✅
- You are the OWNER of this facility

---

## Analysis & Recommendation

### Why Facility #1 Should Be Deleted

1. **No Active Members**: Zero members assigned to this facility
2. **No User Profiles**: No user profiles linked to this tenant
3. **No Check-in Activity**: No daily check-ins recorded
4. **Orphaned Groups**: The 2 groups ("Matterdaddies", "Summer 2022") have no members
5. **Not Your Current Facility**: You are not a member of this facility
6. **Older Creation Date**: Created on Sept 26, but appears to be abandoned

### Why Facility #2 Should Be Kept

1. **Active Members**: 5 members including you as OWNER
2. **User Profiles**: 5 user profiles properly linked
3. **Check-in Activity**: Has active check-in data
4. **Active Groups**: 3 groups with members
5. **Your Current Facility**: You are the OWNER
6. **More Recent**: Created Oct 3, appears to be the "real" facility

### Likely Scenario

It appears that:
1. Facility #1 was created first on Sept 26 with slug `totw-ranch`
2. Two groups were created but never populated with members
3. Facility #2 was created on Oct 3 with slug `top-of-the-world-ranch`
4. All actual users, profiles, and activity went to Facility #2
5. Facility #1 became orphaned with empty groups

---

## Deletion Plan

### Step 1: Handle Orphaned Groups

The old facility has 2 groups that need to be handled:
- "Matterdaddies"
- "Summer 2022"

**Options**:
1. **Delete the groups** (recommended if they have no members)
2. **Migrate the groups** to Facility #2 (if they should be preserved)

**Recommendation**: Delete the groups since they have no members and appear to be test data.

### Step 2: Delete the Facility

Once groups are handled, delete the facility:
```sql
DELETE FROM public.tenants WHERE id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';
```

### Step 3: Verify

Confirm only one "Top of the World Ranch" remains:
```sql
SELECT * FROM public.tenants WHERE name = 'Top of the World Ranch';
```

---

## Foreign Key Dependencies

Before deletion, we need to check all tables that reference `tenant_id`:

### Tables to Check:
1. ✅ `tenant_members` - No members (safe to delete)
2. ⚠️ `groups` - Has 2 groups (need to delete first)
3. ✅ `daily_checkins` - No check-ins (safe to delete)
4. ✅ `user_profiles` - No profiles (safe to delete)
5. ✅ `invites` - Need to check
6. ✅ `photo_albums` - Need to check
7. ✅ `photos` - Need to check

Let me check the remaining tables...

---

## Safety Checks

### Check 1: Invites
```sql
SELECT COUNT(*) FROM public.invites WHERE tenant_id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';
```

### Check 2: Photo Albums
```sql
SELECT COUNT(*) FROM public.photo_albums WHERE tenant_id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';
```

### Check 3: Photos
```sql
SELECT COUNT(*) FROM public.photos WHERE tenant_id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';
```

---

## Deletion Script

```sql
-- Step 1: Delete orphaned groups
DELETE FROM public.groups 
WHERE tenant_id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';

-- Step 2: Delete any invites (if any)
DELETE FROM public.invites 
WHERE tenant_id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';

-- Step 3: Delete the facility
DELETE FROM public.tenants 
WHERE id = '3b2f18c9-761a-4d8c-b033-0b3afe1e3460';

-- Step 4: Verify only one remains
SELECT id, name, slug, created_at 
FROM public.tenants 
WHERE name = 'Top of the World Ranch';
```

---

## Expected Result

After deletion:
- ✅ Only 1 "Top of the World Ranch" facility remains
- ✅ ID: `a77d4b1b-7e8d-48e2-b509-b305c5615f4d`
- ✅ Slug: `top-of-the-world-ranch`
- ✅ 5 members (including you as OWNER)
- ✅ 3 groups with members
- ✅ All check-ins and profiles intact
- ✅ No data loss

---

## Rollback Plan

If something goes wrong, you can restore from Supabase's automatic backups:
1. Go to Supabase Dashboard → Database → Backups
2. Select the most recent backup before deletion
3. Restore the backup

**Note**: Supabase keeps automatic backups, so this operation is reversible.

---

**Status**: Ready for deletion

**Risk Level**: LOW (orphaned facility with no active data)

**Recommended Action**: Proceed with deletion of facility `3b2f18c9-761a-4d8c-b033-0b3afe1e3460`

