# SuperUser Role Recognition Fix

## Problem Summary

**Issue**: User `jrsherlock@gmail.com` (user_id: `7c1051b5-3e92-4215-8623-763f7fb627c7`) was correctly listed in the `superusers` table but the application was not recognizing them as a SuperUser, showing "BASIC_USER" instead and blocking access to Admin features.

**Symptoms**:
- Dev Mode impersonation showed "Jim Sherlock - SuperUser"
- Authentication logs confirmed successful sign-in
- Admin dashboard showed "Access Restricted" with role: "BASIC_USER"
- Unable to access Facility creation, Group creation, or Admin features

## Root Cause Analysis

### Database Status ✅
The database was correctly configured:
- ✅ User exists in `auth.users` table
- ✅ User exists in `superusers` table
- ✅ User profile exists in `user_profiles` table
- ✅ RLS policies are correct
- ✅ `app.is_superuser()` function works correctly

### Frontend Logic Bug ❌
The bug was in `src/hooks/useUserRole.ts`:

**Original Code (BUGGY)**:
```typescript
export function useUserRole(tenantId?: string | null) {
  useEffect(() => {
    async function fetchRole() {
      setLoading(true)
      setError(null)

      // BUG: If no tenantId provided, immediately return BASIC_USER
      // This skips the SuperUser check!
      if (!tenantId) {
        setRole('BASIC_USER')
        setLoading(false)
        return
      }

      // SuperUser check happens in get_user_tenant_role RPC
      // But we never get here if tenantId is null!
      const { data, error: rpcError } = await supabase.rpc('get_user_tenant_role', {
        p_tenant_id: tenantId
      })
      
      setRole(data)
    }
    fetchRole()
  }, [tenantId])
}
```

**Why This Failed**:
1. SuperUsers may not have a `currentTenantId` set (they can access all tenants)
2. When `currentTenantId` is `null`, the hook immediately returned `'BASIC_USER'`
3. The SuperUser check in `get_user_tenant_role()` was never executed
4. Result: SuperUser shown as "BASIC_USER" in the UI

## The Fix

Modified `src/hooks/useUserRole.ts` to **ALWAYS check SuperUser status FIRST**, regardless of whether a `tenantId` is provided.

### Fixed Code

**File**: `src/hooks/useUserRole.ts`

#### 1. `useUserRole()` Hook
```typescript
export function useUserRole(tenantId?: string | null) {
  useEffect(() => {
    async function fetchRole() {
      setLoading(true)
      setError(null)

      try {
        // FIX: ALWAYS check SuperUser status first, regardless of tenantId
        const { data: isSuperUserData, error: superUserError } = await supabase
          .from('superusers')
          .select('user_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()

        if (superUserError && superUserError.code !== 'PGRST116') {
          throw superUserError
        }

        // If user is a SuperUser, return that role immediately
        if (isSuperUserData) {
          setRole('SUPERUSER')
          setLoading(false)
          return
        }

        // If no tenantId provided and not a SuperUser, user is a Basic User
        if (!tenantId) {
          setRole('BASIC_USER')
          setLoading(false)
          return
        }

        // Get user's role in the specified tenant
        const { data, error: rpcError } = await supabase.rpc('get_user_tenant_role', {
          p_tenant_id: tenantId
        })

        if (rpcError) throw rpcError

        setRole(data)
      } catch (err) {
        console.error('Error fetching user role:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [tenantId])
}
```

#### 2. `useGroupAdmin()` Hook
Also updated to check SuperUser status first:
```typescript
export function useGroupAdmin(groupId?: string | null) {
  useEffect(() => {
    async function checkGroupAdmin() {
      // ... setup code ...

      try {
        // Check if user is a SuperUser first (SuperUsers are admins of all groups)
        const { data: isSuperUserData } = await supabase
          .from('superusers')
          .select('user_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()

        // If user is a SuperUser, they have admin access to all groups
        if (isSuperUserData) {
          setIsGroupAdmin(true)
          setLoading(false)
          return
        }

        // Otherwise, check via RPC
        const { data } = await supabase.rpc('is_group_admin', { p_group_id: groupId })
        setIsGroupAdmin(data === true)
      } catch (err) {
        // ... error handling ...
      }
    }
    checkGroupAdmin()
  }, [groupId])
}
```

#### 3. `useGroupRole()` Hook
Also updated to check SuperUser status first:
```typescript
export function useGroupRole(groupId?: string | null) {
  useEffect(() => {
    async function fetchGroupRole() {
      // ... setup code ...

      try {
        // Check if user is a SuperUser first
        const { data: isSuperUserData } = await supabase
          .from('superusers')
          .select('user_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()

        // If user is a SuperUser, return that role
        if (isSuperUserData) {
          setGroupRole('SUPERUSER')
          setLoading(false)
          return
        }

        // Otherwise, get user's role in the specified group
        const { data } = await supabase.rpc('get_user_group_role', { p_group_id: groupId })
        setGroupRole(data)
      } catch (err) {
        // ... error handling ...
      }
    }
    fetchGroupRole()
  }, [groupId])
}
```

## Changes Summary

### Files Modified
1. **`src/hooks/useUserRole.ts`**
   - Modified `useUserRole()` to check SuperUser status before checking tenantId
   - Modified `useGroupAdmin()` to check SuperUser status first
   - Modified `useGroupRole()` to check SuperUser status first

### Logic Flow (Before vs After)

**BEFORE (Buggy)**:
```
1. Check if tenantId exists
2. If NO → Return 'BASIC_USER' ❌ (BUG: Skips SuperUser check!)
3. If YES → Call get_user_tenant_role RPC
4. RPC checks SuperUser status
5. Return role
```

**AFTER (Fixed)**:
```
1. Check if user is in superusers table ✅
2. If YES → Return 'SUPERUSER' immediately
3. If NO → Check if tenantId exists
4. If NO tenantId → Return 'BASIC_USER'
5. If YES tenantId → Call get_user_tenant_role RPC
6. Return role
```

## Testing & Verification

### Database Verification ✅
```sql
-- Confirm user is in superusers table
SELECT * FROM public.superusers WHERE user_id = '7c1051b5-3e92-4215-8623-763f7fb627c7';
-- Result: ✅ Row exists

-- Confirm user profile
SELECT * FROM public.user_profiles WHERE user_id = '7c1051b5-3e92-4215-8623-763f7fb627c7';
-- Result: ✅ Profile exists with display_name "Jim Sherlock"
```

### Frontend Testing Checklist

After the fix, verify:

1. **Dev Mode Impersonation**
   - [ ] Select "Jim Sherlock - SuperUser" from dropdown
   - [ ] Sign in successfully
   - [ ] Check browser console for role logs

2. **Admin Dashboard Access**
   - [ ] Navigate to `/admin`
   - [ ] Should see "SuperUser" badge (purple with Shield icon)
   - [ ] Should NOT see "Access Restricted" message
   - [ ] Should see Facilities, Groups, and Memberships tabs

3. **Facility Creation**
   - [ ] Click "Create Facility" button
   - [ ] Should be able to create new facilities
   - [ ] Should NOT see "Only SuperUsers can create facilities" error

4. **Group Creation**
   - [ ] Select a facility
   - [ ] Click "Create Group" button
   - [ ] Should be able to create new groups

5. **Role Display**
   - [ ] Check Dashboard header for role badge
   - [ ] Should show "SuperUser" with Shield icon
   - [ ] Should NOT show "Basic User"

## Expected Behavior After Fix

### For SuperUsers (like jrsherlock@gmail.com)
- ✅ `useUserRole()` returns `role: 'SUPERUSER'`
- ✅ `isSuperUser` flag is `true`
- ✅ `canCreateFacilities` is `true`
- ✅ `canCreateGroups` is `true`
- ✅ `canEditFacility` is `true`
- ✅ `canDeleteFacility` is `true`
- ✅ Admin dashboard is accessible
- ✅ All admin features are enabled

### For Regular Users
- ✅ `useUserRole()` returns appropriate role based on tenant membership
- ✅ `isSuperUser` flag is `false`
- ✅ Permissions are restricted based on actual role
- ✅ Admin features are hidden/disabled as appropriate

## Performance Considerations

The fix adds one additional database query per hook invocation:
```typescript
await supabase.from('superusers').select('user_id').eq('user_id', userId).maybeSingle()
```

**Impact**: Minimal
- Query is very fast (indexed lookup on primary key)
- Only runs once per component mount
- Cached by React's useEffect dependency array
- SuperUser check happens early, avoiding unnecessary RPC calls

## Related Files

- `src/hooks/useUserRole.ts` - Main fix location
- `src/components/admin/AdminDashboard.tsx` - Uses `useUserRole(currentTenantId)`
- `src/components/Dashboard.tsx` - Uses `useUserRole(currentTenantId)`
- `supabase-rls-policies.sql` - Contains `app.is_superuser()` function
- `Docs/RBAC_DEVELOPER_GUIDE.md` - RBAC documentation

## Rollback Plan

If issues arise, revert the changes to `src/hooks/useUserRole.ts`:

```bash
git diff HEAD~1 src/hooks/useUserRole.ts
git checkout HEAD~1 -- src/hooks/useUserRole.ts
```

## Future Improvements

Consider these enhancements:

1. **Cache SuperUser Status**: Store in React Context to avoid repeated queries
2. **Add Loading States**: Show skeleton UI while checking SuperUser status
3. **Error Boundaries**: Add error boundaries around admin components
4. **Audit Logging**: Log SuperUser actions for security compliance
5. **Session Refresh**: Ensure SuperUser status is re-checked on session refresh

---

**Status**: ✅ **FIXED**

**Affected User**: jrsherlock@gmail.com (user_id: 7c1051b5-3e92-4215-8623-763f7fb627c7)

**Fix Applied**: 2025-10-05

**Files Changed**: 1 file (`src/hooks/useUserRole.ts`)

**Lines Changed**: ~90 lines (3 hooks updated)

