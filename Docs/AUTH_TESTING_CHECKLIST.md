# Authentication Testing Checklist

## Pre-Testing Setup

1. **Open Chrome DevTools**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to the **Console** tab
   - Enable "Preserve log" to keep logs across page reloads
   - Go to the **Network** tab
   - Enable "Preserve log" there too

2. **Clear All State**
   - Open DevTools > Application tab
   - Clear all localStorage items
   - Clear all cookies
   - Close and reopen the browser tab

## Test Suite

### ✅ Test 1: Initial Page Load (No Auth)

**Steps:**
1. Navigate to `http://localhost:5173`
2. Watch the Console tab

**Expected Console Output:**
```
[Supabase] Creating new client instance
[Supabase] Client initialized with storage key: sb-ohlscdojhsifvnnkoiqi-auth-token
[useAuth] Starting to load session...
[useAuth] Session loaded: No user
[useAuth] No session, setting user to null
[useAuth] Setting loading to false
[useAuth] Auth state changed: INITIAL_SESSION No user
```

**Expected UI:**
- Welcome screen appears within 1-2 seconds
- No infinite loading spinner
- "Begin Your Journey" button is visible
- DevUserImpersonation panel appears in bottom-right (dev mode only)

**Pass Criteria:**
- [ ] No browser hanging
- [ ] No "Multiple GoTrueClient instances" warning
- [ ] Loading completes in < 2 seconds
- [ ] Welcome screen renders correctly

---

### ✅ Test 2: Magic Link Sign-In Flow

**Steps:**
1. Click "Begin Your Journey" button
2. Enter a valid email address in the prompt
3. Click OK
4. Watch Console and Network tabs

**Expected Console Output:**
```
[useAuth] Starting to load session...
Check your email for the sign-in link.
```

**Expected Network Activity:**
- POST request to `/auth/v1/otp` with status 200
- Request completes in < 2 seconds

**Expected UI:**
- Alert appears: "Check your email for the sign-in link."
- Page remains responsive
- No hanging or freezing

**Pass Criteria:**
- [ ] No browser hanging during sign-in request
- [ ] Network request completes successfully
- [ ] Alert message appears
- [ ] Page remains interactive

---

### ✅ Test 3: User Impersonation (Instant Sign-In)

**Prerequisites:**
- `VITE_SUPABASE_SERVICE_ROLE_KEY` must be set in `.env.local`
- At least one user must exist in the database

**Steps:**
1. Open the DevUserImpersonation panel (bottom-right corner)
2. Verify "Instant" badge is visible (green with lightning icon)
3. Select a user from the dropdown
4. Click "Instant Sign In"
5. Watch Console tab closely

**Expected Console Output:**
```
[DevUserImpersonation] Starting impersonation for: user@example.com
[DevUserImpersonation] Token extracted, clearing existing session
[useAuth] Clearing all auth storage...
[useAuth] Auth storage cleared
[DevUserImpersonation] Verifying OTP to create new session
[DevUserImpersonation] Session created successfully, reloading page
```

**Expected Timing:**
- Total time from click to reload: 300-500ms
- No hanging or freezing

**Expected UI After Reload:**
- Dashboard appears (user is signed in)
- User's display name appears in header
- No loading spinner stuck

**Pass Criteria:**
- [ ] No browser hanging during impersonation
- [ ] Page reloads within 1 second
- [ ] User is successfully signed in
- [ ] No "Multiple GoTrueClient instances" warning
- [ ] No duplicate auth state changes

---

### ✅ Test 4: Auth State Debouncing

**Steps:**
1. Open Console tab
2. Sign in using impersonation
3. Count the number of "Auth state changed" messages

**Expected Console Output:**
```
[useAuth] Auth state changed: SIGNED_IN User present
```

**Expected Behavior:**
- Only ONE "Auth state changed" message per actual state change
- No rapid-fire duplicate messages

**Pass Criteria:**
- [ ] No duplicate auth state change messages within 100ms
- [ ] Profile fetch happens only once per sign-in
- [ ] No race conditions visible in logs

---

### ✅ Test 5: Session Timeout Recovery

**Steps:**
1. Open DevTools > Application > Local Storage
2. Find the key `sb-ohlscdojhsifvnnkoiqi-auth-token`
3. Edit the value to invalid JSON (e.g., `{"invalid": "data"}`)
4. Reload the page
5. Watch Console tab

**Expected Console Output:**
```
[useAuth] Starting to load session...
[useAuth] Error getting session: [error details]
[useAuth] Clearing all auth storage...
[useAuth] Setting loading to false after error
```

**Expected UI:**
- Welcome screen appears after error recovery
- No infinite loading
- No browser crash

**Pass Criteria:**
- [ ] Corrupted session is detected
- [ ] Storage is automatically cleared
- [ ] App recovers to Welcome screen
- [ ] No browser hanging

---

### ✅ Test 6: Profile Fetch Abort on Unmount

**Steps:**
1. Sign in using impersonation
2. Immediately click "Sign Out" before profile fetch completes
3. Watch Console tab for abort messages

**Expected Console Output:**
```
[useAuth] Starting to load session...
[useAuth] Fetching user profile for tenant_id...
[useAuth] Cleanup
[useAuth] Profile fetch failed: AbortError (or no error if completed)
```

**Expected Behavior:**
- Profile fetch is aborted if component unmounts
- No memory leaks
- No hanging requests

**Pass Criteria:**
- [ ] Profile fetch is properly aborted
- [ ] No console errors about unmounted components
- [ ] Sign out completes successfully

---

### ✅ Test 7: Multiple Tab Synchronization

**Steps:**
1. Open app in Tab 1
2. Sign in using impersonation
3. Open app in Tab 2 (new tab, same browser)
4. Watch both tabs

**Expected Behavior:**
- Tab 2 detects the auth state change within 100-200ms
- Tab 2 automatically shows Dashboard (signed in state)
- Both tabs show the same user

**Pass Criteria:**
- [ ] Auth state syncs across tabs
- [ ] No conflicts or race conditions
- [ ] Both tabs remain responsive

---

### ✅ Test 8: Network Request Inspection

**Steps:**
1. Open DevTools > Network tab
2. Filter by "Fetch/XHR"
3. Sign in using impersonation
4. Inspect the requests

**Expected Network Requests:**
1. POST `/auth/v1/admin/generate_link` (admin client)
2. POST `/auth/v1/verify` (verify OTP)
3. GET `/rest/v1/user_profiles?user_id=eq.xxx` (profile fetch)

**Expected Timing:**
- All requests complete in < 1 second total
- No hanging requests
- No 500 errors

**Pass Criteria:**
- [ ] All auth requests succeed (200 status)
- [ ] No hanging network requests
- [ ] Requests complete in reasonable time
- [ ] No CORS errors

---

### ✅ Test 9: Reset Auth Button

**Steps:**
1. Sign in using impersonation
2. Click "Reset Auth (Clear Session)" button in DevUserImpersonation panel
3. Confirm the dialog
4. Watch Console tab

**Expected Console Output:**
```
[DevUserImpersonation] Manual auth reset
[useAuth] Clearing all auth storage...
[useAuth] Auth storage cleared
```

**Expected Behavior:**
- Page reloads
- All auth storage is cleared
- Welcome screen appears
- No errors

**Pass Criteria:**
- [ ] Storage is completely cleared
- [ ] Page reloads successfully
- [ ] App returns to unauthenticated state
- [ ] No hanging or errors

---

## Performance Benchmarks

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| Initial page load | < 1s | < 2s | > 3s |
| Magic link request | < 500ms | < 1s | > 2s |
| Impersonation flow | < 500ms | < 1s | > 2s |
| Profile fetch | < 300ms | < 500ms | > 1s |
| Auth state change | < 100ms | < 200ms | > 500ms |

## Common Issues & Solutions

### Issue: "Multiple GoTrueClient instances" Warning
**Solution:** Ensure singleton pattern is working. Check that `supabaseInstance` is not null before creating new client.

### Issue: Browser Hangs During Impersonation
**Solution:** Check that delays are in place (100ms after clearStorage, 200ms before reload). Verify debouncing is working.

### Issue: Profile Fetch Never Completes
**Solution:** Check network tab for hanging requests. Verify RLS policies allow user to read their own profile.

### Issue: Auth State Changes Fire Rapidly
**Solution:** Verify debouncing timeout is set to 100ms. Check that `authChangeTimeout` is being cleared properly.

## Success Criteria Summary

All tests must pass with:
- ✅ No browser hanging or freezing
- ✅ No "Multiple GoTrueClient instances" warnings
- ✅ All network requests complete in < 1 second
- ✅ Auth state changes are debounced (max 1 per 100ms)
- ✅ Profile fetches can be aborted
- ✅ Storage is properly isolated between clients
- ✅ Error recovery works correctly

## Next Steps After Testing

1. If all tests pass: Deploy to staging environment
2. If any test fails: Review console logs and network activity
3. Use "Reset Auth" button to clear state between tests
4. Document any new issues in GitHub Issues
5. Consider adding automated E2E tests using Playwright or Cypress

