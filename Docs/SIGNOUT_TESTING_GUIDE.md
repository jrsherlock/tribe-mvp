# Sign-Out Testing Guide

## Quick Test

### 1. Open the Application
The app should already be running at: http://localhost:5173

### 2. Open Chrome DevTools
- Press `F12` or `Cmd+Option+I` (Mac)
- Go to **Console** tab
- Enable "Preserve log"

### 3. Test Sign-Out Flow

#### Step 1: Sign In
1. Open DevUserImpersonation panel (bottom-right, purple)
2. Select any user from dropdown
3. Click "Instant Sign In"
4. Wait for page to reload

**Expected:**
- Page reloads in ~300ms
- Dashboard appears
- User is signed in

#### Step 2: Sign Out
1. Click the sign-out button in the app header
2. Watch the DevUserImpersonation panel
3. Watch the Console tab

**Expected Console Output:**
```
[useAuth] Auth state changed: SIGNED_OUT No user
[useAuth] Clearing all auth storage...
[useAuth] Auth storage cleared (admin storage preserved)
[useAuth] Starting to load session...
[useAuth] Session loaded: No user
[useAuth] Setting loading to false
```

**Expected UI:**
- Welcome screen appears within 3 seconds
- DevUserImpersonation panel shows user dropdown (reloaded)
- No infinite spinner
- No "Multiple GoTrueClient instances" warning

#### Step 3: Verify Storage Keys
1. Open DevTools > Application > Local Storage
2. Look for keys starting with `sb-`

**Expected:**
- `sb-ohlscdojhsifvnnkoiqi-auth-token` - Should be EMPTY or DELETED (main client)
- `sb-admin-ohlscdojhsifvnnkoiqi-token` - Should still EXIST (admin client)

#### Step 4: Sign In Again
1. Select a user from DevUserImpersonation panel
2. Click "Instant Sign In"

**Expected:**
- Works normally
- No errors
- Page reloads with user signed in

## Detailed Testing

### Test 1: Multiple Sign-Out Cycles

**Steps:**
1. Sign in
2. Sign out
3. Repeat 5 times

**Expected:**
- Each cycle completes successfully
- No accumulating errors
- DevUserImpersonation panel reloads each time
- No memory leaks

**Pass Criteria:**
- [ ] All 5 cycles complete
- [ ] No console errors
- [ ] No "Multiple GoTrueClient instances" warning
- [ ] Each sign-out takes < 3 seconds

### Test 2: Storage Key Isolation

**Steps:**
1. Sign in
2. Open DevTools > Application > Local Storage
3. Note the keys present
4. Sign out
5. Check keys again

**Expected Before Sign-Out:**
```
sb-ohlscdojhsifvnnkoiqi-auth-token: {"access_token": "...", ...}
sb-admin-ohlscdojhsifvnnkoiqi-token: (empty or minimal)
```

**Expected After Sign-Out:**
```
sb-ohlscdojhsifvnnkoiqi-auth-token: (deleted or empty)
sb-admin-ohlscdojhsifvnnkoiqi-token: (still exists, unchanged)
```

**Pass Criteria:**
- [ ] Main client storage is cleared
- [ ] Admin client storage is preserved
- [ ] Keys are separate and isolated

### Test 3: DevUserImpersonation Panel Reload

**Steps:**
1. Sign in
2. Note the number of users in DevUserImpersonation dropdown
3. Sign out
4. Check if dropdown still shows users

**Expected:**
- Dropdown shows same number of users
- Users are still selectable
- No loading spinner stuck
- No error message

**Pass Criteria:**
- [ ] User list reloads successfully
- [ ] All users are visible
- [ ] Dropdown is functional
- [ ] No errors in console

### Test 4: Timeout Behavior

**Steps:**
1. Sign out
2. Watch console for timeout messages
3. Measure time until Welcome screen appears

**Expected Console:**
```
[useAuth] Starting to load session...
[useAuth] Session loaded: No user
[useAuth] Setting loading to false
```

**Should NOT See:**
```
[useAuth] getSession() timed out after 10s  // Old behavior
```

**Expected Timing:**
- Welcome screen appears in < 3 seconds
- No 10-second timeout

**Pass Criteria:**
- [ ] No timeout errors
- [ ] Welcome screen appears quickly
- [ ] No hanging or freezing

### Test 5: Network Requests

**Steps:**
1. Open DevTools > Network tab
2. Filter by "Fetch/XHR"
3. Sign out
4. Watch for requests

**Expected Requests:**
1. POST `/auth/v1/logout` (sign-out)
2. GET `/auth/v1/admin/users` (reload user list)
3. GET `/rest/v1/user_profiles` (using admin client)
4. GET `/rest/v1/superusers` (using admin client)
5. GET `/rest/v1/tenant_members` (using admin client)

**Expected Status:**
- All requests return 200
- No 401 or 403 errors
- No hanging requests

**Pass Criteria:**
- [ ] All requests succeed
- [ ] No RLS errors
- [ ] Admin client bypasses RLS
- [ ] Requests complete in < 1s

## Console Output Reference

### ✅ Good (Expected)

```
[useAuth] Auth state changed: SIGNED_OUT No user
[useAuth] Clearing all auth storage...
[useAuth] Removed: sb-ohlscdojhsifvnnkoiqi-auth-token
[useAuth] Auth storage cleared (admin storage preserved)
[useAuth] Starting to load session...
[useAuth] Session loaded: No user
[useAuth] Setting loading to false
[DevUserImpersonation] Creating admin client instance
[DevUserImpersonation] Admin client initialized with separate storage key
```

### ⚠️ Warning (Should Not Appear)

```
Multiple GoTrueClient instances detected  // Storage key conflict
[useAuth] getSession() timed out after 10s  // Old timeout behavior
[useAuth] Timeout error: Error: Session load timeout - clearing storage  // Old error handling
```

### ❌ Error (Should Not Appear)

```
Error fetching users: [RLS error]  // Should use admin client
Failed to load users. Check console for details.  // Should not fail
```

## Performance Benchmarks

| Metric | Target | Acceptable | Issue |
|--------|--------|------------|-------|
| Sign-out to Welcome screen | < 1s | < 3s | > 5s |
| User list reload | < 500ms | < 1s | > 2s |
| Storage clear | < 100ms | < 200ms | > 500ms |
| Total sign-out flow | < 2s | < 4s | > 6s |

## Troubleshooting

### Issue: "Multiple GoTrueClient instances" Warning

**Cause:** Storage keys are not properly isolated

**Fix:** Check that admin client has unique storage key:
```typescript
storageKey: `sb-admin-${projectId}-token`
```

**Verify:** Open DevTools > Application > Local Storage and check for two separate keys

### Issue: DevUserImpersonation Panel Stuck Loading

**Cause:** Admin client queries failing due to RLS

**Fix:** Ensure all queries use `adminClient`, not `supabase`:
```typescript
const { data } = await adminClient.from('user_profiles').select('...')
```

**Verify:** Check Network tab for successful requests to `/rest/v1/user_profiles`

### Issue: Sign-Out Takes > 5 Seconds

**Cause:** Old 10-second timeout still in effect

**Fix:** Verify timeout is set to 3 seconds in `useAuth.ts`:
```typescript
setTimeout(() => { ... }, 3000)
```

**Verify:** Check console for timeout message after 3 seconds, not 10

### Issue: Admin Storage Being Cleared

**Cause:** `clearAuthStorage()` not preserving admin keys

**Fix:** Verify the condition includes `!key.includes('admin')`:
```typescript
if ((key.startsWith('sb-')) && !key.includes('admin')) {
  localStorage.removeItem(key)
}
```

**Verify:** Check localStorage after sign-out - admin key should still exist

## Success Criteria Summary

All tests must pass:

- ✅ Sign-out completes in < 3 seconds
- ✅ No "Multiple GoTrueClient instances" warning
- ✅ DevUserImpersonation panel reloads successfully
- ✅ Storage keys are properly isolated
- ✅ Admin storage is preserved
- ✅ Main storage is cleared
- ✅ No RLS errors when fetching users
- ✅ All network requests succeed
- ✅ No timeout errors
- ✅ Can sign in again after sign-out

## Next Steps

1. ✅ Test sign-out flow 5 times
2. ✅ Verify storage keys are separate
3. ✅ Check console for warnings
4. ✅ Test impersonation after sign-out
5. ✅ Verify network requests succeed
6. Deploy to staging environment

---

**Status**: Ready for testing

**Expected Result**: Sign-out works perfectly with no hanging or errors

**Time to Test**: ~5 minutes

