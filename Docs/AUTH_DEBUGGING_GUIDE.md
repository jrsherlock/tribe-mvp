# Authentication Debugging Guide

## Quick Start

Your authentication system has been fixed and enhanced with debugging tools. Here's how to use them:

### 1. Open the Application
```bash
npm run dev
```
Navigate to: http://localhost:5173

### 2. Enable Chrome DevTools
- Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)
- Go to **Console** tab
- Enable "Preserve log" checkbox

### 3. Use the Debug Panels

You now have **TWO** debug panels in development mode:

#### **Auth Monitor Panel** (Bottom-Left, Blue)
- Shows real-time auth events
- Displays session state
- Tracks event timing
- Click to expand/collapse

#### **User Impersonation Panel** (Bottom-Right, Purple)
- Quick user switching
- Instant sign-in (with service key)
- Reset auth button

## What to Look For

### ✅ Healthy Auth System

**Console Output:**
```
[Supabase] Creating new client instance
[Supabase] Client initialized with storage key: sb-ohlscdojhsifvnnkoiqi-auth-token
[useAuth] Starting to load session...
[useAuth] Session loaded: No user
[useAuth] Setting loading to false
[useAuth] Auth state changed: INITIAL_SESSION No user
```

**Auth Monitor Panel:**
- Shows "Signed Out" or "Signed In" status
- Events appear in chronological order
- No rapid-fire duplicate events
- Timing shows reasonable delays (< 1s)

**Network Tab:**
- All requests return 200 status
- No hanging requests
- Requests complete in < 1s

### ⚠️ Warning Signs

**Console Output:**
```
Multiple GoTrueClient instances detected  // Should NOT appear
[useAuth] getSession() timed out after 10s  // Network issue
[useAuth] Auth state changed: SIGNED_OUT  // Followed by another change within 100ms
```

**Auth Monitor Panel:**
- Rapid-fire events (> 10 per second)
- "Loading" status stuck for > 3 seconds
- Error events appearing repeatedly

**Network Tab:**
- Requests with status 500 or 401
- Requests pending for > 2 seconds
- CORS errors

## Common Scenarios

### Scenario 1: Testing Normal Sign-In

**Steps:**
1. Click "Begin Your Journey"
2. Enter email: `test@example.com`
3. Watch Auth Monitor Panel

**Expected:**
- Auth Monitor shows: "Auth: SIGNED_OUT"
- Console shows: "Check your email for the sign-in link"
- No hanging or errors

### Scenario 2: Testing User Impersonation

**Steps:**
1. Open User Impersonation Panel (bottom-right)
2. Select a user from dropdown
3. Click "Instant Sign In"
4. Watch Auth Monitor Panel

**Expected:**
- Auth Monitor shows sequence:
  1. "Storage Change" event
  2. "Auth: SIGNED_OUT" event
  3. "Auth: SIGNED_IN" event
  4. Page reloads
- Total time: ~300ms
- No hanging

### Scenario 3: Recovering from Corrupted Session

**Steps:**
1. Open DevTools > Application > Local Storage
2. Find key: `sb-ohlscdojhsifvnnkoiqi-auth-token`
3. Edit value to: `{"invalid": "data"}`
4. Reload page
5. Watch Auth Monitor Panel

**Expected:**
- Auth Monitor shows: "Auth: SIGNED_OUT"
- Console shows: "Error getting session"
- Storage is automatically cleared
- App shows Welcome screen
- No infinite loading

### Scenario 4: Testing Auth State Debouncing

**Steps:**
1. Open Auth Monitor Panel
2. Sign in using impersonation
3. Count events in Auth Monitor

**Expected:**
- Only ONE "Auth: SIGNED_IN" event
- No duplicate events within 100ms
- Profile fetch happens once

## Using the Auth Monitor Panel

### Expanded View Features

1. **Status Bar** (Top)
   - Session state: Signed In / Signed Out / Loading
   - Time since last event
   - Total event count

2. **Event Log** (Middle)
   - Real-time event stream
   - Color-coded by type:
     - 🟢 Green = Success (SIGNED_IN)
     - 🟡 Yellow = Warning (SIGNED_OUT)
     - 🔵 Blue = Info (TOKEN_REFRESHED)
     - 🔴 Red = Error
   - Timestamp for each event
   - Event details

3. **Footer** (Bottom)
   - "Clear Events" button
   - "DEV MODE ONLY" indicator

### Interpreting Events

| Event | Meaning | Expected Frequency |
|-------|---------|-------------------|
| `Auth: INITIAL_SESSION` | App loaded, checking session | Once per page load |
| `Auth: SIGNED_IN` | User signed in successfully | Once per sign-in |
| `Auth: SIGNED_OUT` | User signed out | Once per sign-out |
| `Auth: TOKEN_REFRESHED` | Session token refreshed | Every ~50 minutes |
| `Storage Change` | localStorage modified | Varies |

## Debugging Workflows

### Workflow 1: "Browser is Hanging"

1. **Check Auth Monitor Panel**
   - Is it showing rapid-fire events? → Debouncing issue
   - Is it stuck on "Loading"? → Session timeout issue

2. **Check Console**
   - Look for "Multiple GoTrueClient instances" → Client conflict
   - Look for timeout errors → Network issue

3. **Check Network Tab**
   - Are requests pending? → Backend issue
   - Are requests failing? → Auth configuration issue

4. **Recovery Steps**
   - Click "Reset Auth" in User Impersonation Panel
   - Clear browser cache
   - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Workflow 2: "Sign-In Not Working"

1. **Check Console for Errors**
   ```
   [useAuth] Error getting session: [error message]
   ```

2. **Check Network Tab**
   - Look for failed `/auth/v1/otp` request
   - Check response body for error details

3. **Verify Environment Variables**
   ```bash
   # In terminal
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

4. **Check Supabase Dashboard**
   - Auth > Settings > Email Auth enabled?
   - Auth > Email Templates configured?

### Workflow 3: "Impersonation Not Working"

1. **Check for Service Key**
   - User Impersonation Panel should show "Instant" badge
   - If not, add `VITE_SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

2. **Check Console for Errors**
   ```
   [DevUserImpersonation] Impersonation error: [error message]
   ```

3. **Verify User Exists**
   - Check Supabase Dashboard > Authentication > Users
   - Ensure user has email address

4. **Check Network Tab**
   - Look for `/auth/v1/admin/generate_link` request
   - Should return 200 with `action_link` in response

## Performance Benchmarks

Use Auth Monitor Panel to track these metrics:

| Metric | Target | Acceptable | Issue |
|--------|--------|------------|-------|
| Initial load | < 1s | < 2s | > 3s |
| Sign-in request | < 500ms | < 1s | > 2s |
| Impersonation | < 500ms | < 1s | > 2s |
| Auth state change | < 100ms | < 200ms | > 500ms |
| Profile fetch | < 300ms | < 500ms | > 1s |

## Advanced Debugging

### Enable Verbose Logging

Add to `src/lib/supabase.ts`:
```typescript
supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ... existing config
    debug: true,  // Add this line
  },
})
```

### Monitor Network Requests

In Chrome DevTools > Network tab:
1. Filter by "Fetch/XHR"
2. Look for requests to:
   - `/auth/v1/token` - Session refresh
   - `/auth/v1/otp` - Magic link
   - `/auth/v1/verify` - OTP verification
   - `/rest/v1/user_profiles` - Profile fetch

### Inspect localStorage

In Chrome DevTools > Application > Local Storage:
- `sb-ohlscdojhsifvnnkoiqi-auth-token` - Main auth token
- Look for valid JSON structure
- Check `access_token` and `refresh_token` fields

## Troubleshooting Common Issues

### Issue: "Multiple GoTrueClient instances" Warning

**Cause:** Two Supabase clients using same storage key

**Fix:** Already fixed in `src/lib/supabase.ts` with unique storage key

**Verify:** Warning should NOT appear in console

### Issue: Browser Hangs During Sign-In

**Cause:** Race condition in auth state changes

**Fix:** Already fixed with debouncing in `src/hooks/useAuth.ts`

**Verify:** Auth Monitor shows max 1 event per 100ms

### Issue: Impersonation Takes > 3 Seconds

**Cause:** Improper sequencing in impersonation flow

**Fix:** Already fixed in `src/components/DevUserImpersonation.tsx`

**Verify:** Auth Monitor shows impersonation completes in ~300ms

### Issue: Profile Fetch Never Completes

**Cause:** Missing RLS policy or network issue

**Fix:** Check Supabase Dashboard > Database > Policies

**Verify:** Network tab shows `/rest/v1/user_profiles` returns 200

## Testing Checklist

Before deploying to production:

- [ ] Initial page load completes in < 2s
- [ ] No "Multiple GoTrueClient instances" warning
- [ ] Magic link sign-in works
- [ ] User impersonation works (dev only)
- [ ] Auth state changes are debounced
- [ ] Profile fetches can be aborted
- [ ] Corrupted session recovery works
- [ ] Auth Monitor Panel shows healthy events
- [ ] No hanging network requests
- [ ] All tests in AUTH_TESTING_CHECKLIST.md pass

## Support Resources

1. **Documentation**
   - `AUTH_HANGING_FIX.md` - Technical details of fixes
   - `AUTH_TESTING_CHECKLIST.md` - Comprehensive test suite
   - `AUTH_FIX_SUMMARY.md` - Executive summary

2. **Debug Tools**
   - Auth Monitor Panel (bottom-left, blue)
   - User Impersonation Panel (bottom-right, purple)
   - Chrome DevTools Console
   - Chrome DevTools Network tab

3. **Emergency Recovery**
   - Click "Reset Auth" button
   - Clear browser localStorage
   - Hard refresh browser
   - Restart dev server

## Next Steps

1. ✅ Test all authentication flows
2. ✅ Verify Auth Monitor Panel shows healthy events
3. ✅ Check console for any warnings
4. ✅ Test user impersonation multiple times
5. ✅ Deploy to staging environment
6. ✅ Monitor production logs

---

**Status**: ✅ Authentication system fixed and enhanced with debugging tools

**Confidence**: HIGH

**Risk**: LOW

