# Testing Dev User Impersonation

## Quick Test Guide

### Prerequisites
1. Dev server running (`npm run dev`)
2. Browser open to `http://localhost:5174/`
3. Service role key configured in `.env.local` (for instant impersonation)
4. Browser DevTools console open to monitor logs

### Test Steps

#### 1. Initial State Check
- [ ] Verify you're on the Welcome/Landing page (not logged in)
- [ ] Verify the purple "DEV: User Impersonation" panel is visible in bottom-right corner
- [ ] Verify the panel shows "Instant" badge (green) if service key is configured

#### 2. Select a User
- [ ] Click the dropdown in the dev impersonation panel
- [ ] Verify you see a list of users with their roles (e.g., "Jim Sherlock - SuperUser")
- [ ] Select a user (recommend starting with a SuperUser)

#### 3. Impersonate User
- [ ] Click "Instant Sign In" button
- [ ] Watch the browser console for logs

**Expected Console Output**:
```
[DevUserImpersonation] Starting impersonation for: user@example.com
[DevUserImpersonation] Token extracted, clearing existing session
[useAuth] Clearing all auth storage...
[DevUserImpersonation] Verifying OTP to create new session
[DevUserImpersonation] Session created successfully: Session present
[DevUserImpersonation] Waiting for session to persist... (attempt 1)
[DevUserImpersonation] Session persisted to localStorage
[DevUserImpersonation] Reloading page to initialize with new session
```

#### 4. Verify Successful Login
After page reload:

- [ ] Verify you see the Dashboard (not the Welcome page)
- [ ] Verify the sidebar shows navigation items (Dashboard, Profile, Check-in, etc.)
- [ ] Verify no timeout errors in console

**Expected Console Output After Reload**:
```
[useAuth] Starting to load session...
[useAuth] Session loaded: User found
[useAuth] Fetching user profile for tenant_id...
[useAuth] Profile loaded, tenant_id: xxx
[useAuth] Setting user: {userId: 'xxx', email: 'user@example.com', tenant_id: 'xxx'}
[useAuth] Setting loading to false
```

#### 5. Verify User Identity
- [ ] Click on "Profile" in the sidebar
- [ ] Verify the profile shows the correct user information
- [ ] Verify the email matches the user you selected

#### 6. Test Sign Out
- [ ] Click "Sign Out" in the sidebar
- [ ] Verify you're redirected to the Welcome page
- [ ] Verify the dev impersonation panel is still visible

#### 7. Test Different User Types
Repeat steps 2-5 for each user type:
- [ ] SuperUser
- [ ] Facility Admin
- [ ] Group Admin
- [ ] Basic User
- [ ] Solo User (no tenant)

### What Should NOT Happen

❌ **These errors should NOT appear**:
- `[useAuth] getSession() timed out after 3s - treating as no session`
- `[useAuth] Timeout - treating as no session`
- Redirect back to Welcome page after impersonation
- Infinite loading screen
- "Multiple GoTrueClient instances" error (warning is OK)

### Troubleshooting

#### Issue: Still seeing timeout errors
**Solution**:
1. Hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser localStorage (DevTools > Application > Local Storage > Clear All)
3. Click "Reset Auth (Clear Session)" button in dev impersonation panel
4. Verify the code changes were applied (check `src/hooks/useAuth.ts` line 40-54)

#### Issue: "Session may not be fully persisted" warning
**Cause**: The retry loop reached max attempts (10) without finding the session in localStorage

**Solution**:
1. Check if the session was actually created (look for `Session created successfully: Session present`)
2. Verify the storage key matches (check console logs)
3. Try increasing `maxRetries` in `DevUserImpersonation.tsx` if on slow connection

#### Issue: "Multiple GoTrueClient instances" warning
**Status**: This is expected and benign

**Explanation**: The admin client needs to be separate from the main client to use service role privileges. As long as they use different storage keys, this warning can be ignored.

#### Issue: User list is empty
**Cause**: Service role key not configured or invalid

**Solution**:
1. Check `.env.local` for `VITE_SUPABASE_SERVICE_ROLE_KEY`
2. Verify the key is correct (copy from Supabase dashboard)
3. Restart dev server after adding/changing the key

### Performance Expectations

- **Impersonation time**: < 2 seconds (with service key)
- **Session persistence check**: Usually completes on first attempt (< 100ms)
- **Page reload**: Standard page load time
- **Total time from click to Dashboard**: < 5 seconds

### Browser DevTools Checks

#### Application > Local Storage
After successful impersonation, verify:
- [ ] `sb-ohlscdojhsifvnnkoiqi-auth-token` exists
- [ ] Contains valid JSON with `access_token` and `refresh_token`
- [ ] `user` object has correct `id` and `email`

#### Network Tab
During impersonation, you should see:
- [ ] POST to `/auth/v1/admin/generate_link` (admin client)
- [ ] POST to `/auth/v1/verify` (verifyOtp call)
- [ ] GET to `/auth/v1/user` (session verification)

### Success Criteria

✅ **All of these should be true**:
1. No timeout errors in console
2. Successful login after impersonation
3. Dashboard appears (not Welcome page)
4. User profile shows correct information
5. Can navigate to different pages
6. Can sign out and impersonate again
7. Works for all user types

## Automated Testing (Future)

Consider adding E2E tests for:
- Dev impersonation flow
- Session persistence
- User type verification
- Sign out and re-impersonation

Example test framework: Playwright or Cypress

## Related Documentation

- `Docs/DEV_USER_IMPERSONATION_FIX.md` - Technical details of the fix
- `Docs/AUTH_DEBUGGING_GUIDE.md` - General auth debugging
- `Docs/AUTH_MAGIC_LINK_FIX.md` - Related auth fixes

