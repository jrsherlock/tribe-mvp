# Authentication Hanging Issue - Diagnosis & Fix

## Problem Summary
The browser was hanging and becoming unresponsive during authentication attempts, particularly during user impersonation in development mode.

## Root Causes Identified

### 1. **Race Conditions in Auth State Changes**
**Issue**: Multiple rapid auth state changes triggered by `onAuthStateChange` were causing overlapping profile fetches and state updates.

**Evidence from Console Logs**:
```
useAuth.ts:133 [useAuth] Auth state changed: INITIAL_SESSION No user
useAuth.ts:133 [useAuth] Auth state changed: SIGNED_OUT No user
useAuth.ts:133 [useAuth] Auth state changed: INITIAL_SESSION No user
```

**Fix**: Added 100ms debouncing to `onAuthStateChange` handler to prevent rapid-fire updates.

### 2. **Multiple Supabase Client Instances**
**Issue**: DevUserImpersonation component was creating a separate admin client, causing conflicts.

**Evidence from Console Logs**:
```
DevUserImpersonation.tsx:25 Multiple GoTrueClient instances detected in the same browser context.
```

**Fix**: 
- Implemented singleton pattern for admin client
- Used unique storage keys to isolate main client from admin client
- Changed storage key from `supabase.auth.token` to `sb-{project-id}-auth-token`

### 3. **Impersonation Flow Deadlock**
**Issue**: The impersonation flow was:
1. Clearing storage
2. Signing out (triggers auth state change)
3. Verifying new token (triggers another auth state change)
4. Profile fetch starts during step 2, conflicts with step 3

**Fix**: Reordered the impersonation flow:
1. Generate magic link token
2. Extract token
3. Clear storage (no auth state change since we're using admin client)
4. Add 100ms delay to ensure storage is cleared
5. Verify OTP to create new session
6. Add 200ms delay to ensure session is established
7. Reload page

### 4. **Missing Abort Controllers**
**Issue**: Profile fetches during auth state changes couldn't be cancelled when component unmounted or auth state changed again.

**Fix**: Added `AbortController` to profile fetches with proper cleanup in useEffect return.

## Changes Made

### File: `src/hooks/useAuth.ts`

#### Change 1: Added Abort Controller for Profile Fetches
```typescript
let profileFetchController: AbortController | null = null

// In profile fetch:
profileFetchController = new AbortController()
const { data: profileData, error } = await supabase
  .from('user_profiles')
  .select('tenant_id')
  .eq('user_id', s.user.id)
  .abortSignal(profileFetchController.signal)
  .single()

// In cleanup:
if (profileFetchController) profileFetchController.abort()
```

#### Change 2: Debounced Auth State Changes
```typescript
let authChangeTimeout: NodeJS.Timeout | null = null
const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
  // Clear any pending auth change processing
  if (authChangeTimeout) {
    clearTimeout(authChangeTimeout)
  }

  // Debounce to prevent race conditions during rapid auth changes
  authChangeTimeout = setTimeout(async () => {
    // ... handle auth state change
  }, 100) // 100ms debounce
})

// In cleanup:
if (authChangeTimeout) clearTimeout(authChangeTimeout)
```

### File: `src/components/DevUserImpersonation.tsx`

#### Change: Fixed Impersonation Flow
```typescript
// Step 1: Generate magic link
const { data, error: linkError } = await adminClient.auth.admin.generateLink({
  type: 'magiclink',
  email: selectedUser.email,
})

// Step 2: Extract token
const token = url.searchParams.get('token')

// Step 3: Clear storage BEFORE verifying
clearAuthStorage()
await new Promise(resolve => setTimeout(resolve, 100))

// Step 4: Verify OTP
const { error: verifyError } = await supabase.auth.verifyOtp({
  token_hash: token,
  type: type as any || 'magiclink',
})

// Step 5: Reload with delay
await new Promise(resolve => setTimeout(resolve, 200))
window.location.reload()
```

### File: `src/lib/supabase.ts`

#### Change: Unique Storage Key
```typescript
storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
```

This prevents conflicts between the main client and admin client by using project-specific storage keys.

## Testing Instructions

### Test 1: Normal Authentication Flow
1. Clear browser cache and localStorage
2. Navigate to the app
3. Click "Begin Your Journey"
4. Enter email and submit
5. **Expected**: No hanging, loading spinner shows, then "Check your email" message

### Test 2: User Impersonation (Dev Mode)
1. Ensure `VITE_SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
2. Open the app in development mode
3. Select a user from the DevUserImpersonation panel
4. Click "Instant Sign In"
5. **Expected**: 
   - Console shows: "Starting impersonation", "Token extracted", "Clearing existing session", "Verifying OTP", "Session created successfully"
   - Page reloads within 1-2 seconds
   - User is signed in as the selected user
   - No browser hanging

### Test 3: Auth State Recovery
1. Manually corrupt localStorage by setting invalid auth token
2. Reload the page
3. **Expected**: 
   - 10-second timeout triggers
   - Storage is cleared
   - App shows Welcome screen
   - No infinite loading

### Test 4: Multiple Tab Handling
1. Open app in two tabs
2. Sign in on tab 1
3. **Expected**: Tab 2 should detect the auth state change and update within 100ms

## Monitoring

Watch for these console messages to verify fixes are working:

### Good Signs ✅
```
[useAuth] Starting to load session...
[useAuth] Session loaded: User found
[useAuth] Profile loaded, tenant_id: xxx
[useAuth] Setting loading to false
[DevUserImpersonation] Token extracted, clearing existing session
[DevUserImpersonation] Session created successfully, reloading page
```

### Warning Signs ⚠️
```
Multiple GoTrueClient instances detected  // Should not appear anymore
[useAuth] getSession() timed out after 10s  // Should only appear if network issues
[useAuth] Auth state changed: SIGNED_OUT  // Followed immediately by another change = potential issue
```

## Performance Improvements

1. **Reduced Auth State Changes**: Debouncing reduces unnecessary re-renders
2. **Faster Impersonation**: Removed unnecessary `signOut()` call, reduced from ~3s to ~300ms
3. **Better Error Recovery**: Abort controllers prevent memory leaks from abandoned fetches
4. **Cleaner Storage**: Unique storage keys prevent cross-contamination

## Security Notes

- The service role key is only used in development mode
- The DevUserImpersonation component is completely hidden in production
- PKCE flow is still used for all authentication
- Storage keys are project-specific to prevent cross-site issues

## Next Steps

1. Monitor production logs for any auth-related errors
2. Consider adding Sentry or similar error tracking for auth flows
3. Add unit tests for the debounced auth state handler
4. Consider implementing a "health check" endpoint to verify auth is working

## Rollback Plan

If issues persist, revert these files:
- `src/hooks/useAuth.ts`
- `src/components/DevUserImpersonation.tsx`
- `src/lib/supabase.ts`

And use the "Reset Auth" button in the DevUserImpersonation panel to clear all state.

