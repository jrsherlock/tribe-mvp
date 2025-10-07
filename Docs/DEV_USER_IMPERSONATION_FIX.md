# Dev User Impersonation Fix

## Date: 2025-10-05

## Problem Summary

The Dev Mode user impersonation feature was not working correctly. When selecting a user from the dev user list (e.g., "Jim Sherlock (Super User)"), the application would:

1. Show brief loading activity
2. Redirect back to the landing page instead of logging in as that user
3. Display timeout errors in the console

## Root Causes Identified

### 1. **Session Load Timeout in useAuth.ts**

**Issue**: The `useAuth` hook had a 3-second timeout on `getSession()` calls, which was causing the session load to fail after dev user impersonation.

**Evidence from Console**:
```
[useAuth] Starting to load session...
[useAuth] getSession() timed out after 3s - treating as no session
[useAuth] Timeout - treating as no session
```

**Why it failed**:
- After `verifyOtp()` creates a new session, the page reloads
- On reload, `useAuth` tries to load the session with `getSession()`
- The 3-second timeout was too aggressive and would expire before the session could be loaded
- This caused the app to treat the user as unauthenticated and redirect to the landing page

**Documentation Note**: According to `AUTH_MAGIC_LINK_FIX.md`, this timeout was supposed to have been removed previously, but it was still present in the code.

### 2. **Session Persistence Race Condition**

**Issue**: The `DevUserImpersonation` component was reloading the page immediately after calling `verifyOtp()`, without waiting for the session to be fully persisted to localStorage.

**Why it failed**:
- `verifyOtp()` creates a session in memory
- The session needs to be written to localStorage for persistence
- The page reload was happening before localStorage was updated
- On reload, there was no session in localStorage, so the user appeared unauthenticated

### 3. **Multiple GoTrueClient Instances Warning**

**Issue**: The admin client used for impersonation was creating a separate GoTrueClient instance, triggering a warning.

**Impact**: While this warning didn't directly cause the authentication failure, it indicated potential conflicts between the admin client and the main client.

**Note**: This is expected behavior since we need a separate admin client with service role privileges. The warning is benign as long as the clients use different storage keys (which they do).

## Solutions Implemented

### Fix 1: Remove Session Load Timeout

**File**: `src/hooks/useAuth.ts`

**Changes**:
1. Removed the 3-second timeout on `getSession()` calls
2. Let the session load complete naturally without artificial time limits
3. Removed `sessionTimeout` variable and related cleanup code

**Before**:
```typescript
async function load() {
  console.log('[useAuth] Starting to load session...')
  try {
    const sessionPromise = supabase.auth.getSession()
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      sessionTimeout = setTimeout(() => {
        console.warn('[useAuth] getSession() timed out after 3s - treating as no session')
        reject(new Error('Session load timeout'))
      }, 3000)
    })
    
    let data, error
    try {
      const result = await Promise.race([sessionPromise, timeoutPromise])
      data = result.data
      error = result.error
      if (sessionTimeout) clearTimeout(sessionTimeout)
    } catch (timeoutError) {
      // Timeout occurred - treat as no session
      console.warn('[useAuth] Timeout - treating as no session')
      if (!ignore) {
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
      }
      return
    }
    // ...
  }
}
```

**After**:
```typescript
async function load() {
  console.log('[useAuth] Starting to load session...')
  try {
    // Get session without timeout - let it complete naturally
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('[useAuth] Error getting session:', error)
      clearAuthStorage()
      throw error
    }
    
    const s = data.session
    console.log('[useAuth] Session loaded:', s ? 'User found' : 'No user')
    // ...
  }
}
```

**Rationale**:
- Supabase's `getSession()` is designed to be fast and reliable
- Timeouts create false negatives and race conditions
- If there's a real network issue, the promise will reject naturally
- Removing the timeout allows the session to load successfully after impersonation

### Fix 2: Wait for Session Persistence

**File**: `src/components/DevUserImpersonation.tsx`

**Changes**:
1. After `verifyOtp()`, wait for the session to be persisted to localStorage
2. Check localStorage in a retry loop (max 10 attempts, 100ms each)
3. Only reload the page after confirming the session is saved

**Before**:
```typescript
const { error: verifyError } = await supabase.auth.verifyOtp({
  token_hash: token,
  type: type as any || 'magiclink',
})

if (verifyError) throw verifyError

console.log('[DevUserImpersonation] Session created successfully, reloading page')

// Reload immediately
await new Promise(resolve => setTimeout(resolve, 200))
window.location.reload()
```

**After**:
```typescript
const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
  token_hash: token,
  type: type as any || 'magiclink',
})

if (verifyError) throw verifyError

console.log('[DevUserImpersonation] Session created successfully:', verifyData.session ? 'Session present' : 'No session')

// Wait for the session to be persisted to localStorage
let retries = 0
const maxRetries = 10
while (retries < maxRetries) {
  const storageKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`
  const storedSession = localStorage.getItem(storageKey)
  
  if (storedSession) {
    console.log('[DevUserImpersonation] Session persisted to localStorage')
    break
  }
  
  console.log('[DevUserImpersonation] Waiting for session to persist... (attempt', retries + 1, ')')
  await new Promise(resolve => setTimeout(resolve, 100))
  retries++
}

if (retries >= maxRetries) {
  console.warn('[DevUserImpersonation] Session may not be fully persisted, but proceeding anyway')
}

console.log('[DevUserImpersonation] Reloading page to initialize with new session')
window.location.reload()
```

**Rationale**:
- Ensures the session is fully written to localStorage before reloading
- Prevents the race condition where the page reloads before persistence
- Retry loop provides resilience while avoiding infinite waits
- Console logs help with debugging if issues persist

## Expected Behavior After Fix

### Successful Impersonation Flow

1. User selects a user from the dev impersonation dropdown
2. User clicks "Instant Sign In"
3. Console shows:
   ```
   [DevUserImpersonation] Starting impersonation for: jim@example.com
   [DevUserImpersonation] Token extracted, clearing existing session
   [useAuth] Clearing all auth storage...
   [DevUserImpersonation] Verifying OTP to create new session
   [DevUserImpersonation] Session created successfully: Session present
   [DevUserImpersonation] Waiting for session to persist... (attempt 1)
   [DevUserImpersonation] Session persisted to localStorage
   [DevUserImpersonation] Reloading page to initialize with new session
   ```
4. Page reloads
5. Console shows:
   ```
   [useAuth] Starting to load session...
   [useAuth] Session loaded: User found
   [useAuth] Fetching user profile for tenant_id...
   [useAuth] Profile loaded, tenant_id: xxx
   [useAuth] Setting user: {userId: 'xxx', email: 'jim@example.com', tenant_id: 'xxx'}
   [useAuth] Setting loading to false
   ```
6. User is successfully logged in and sees the Dashboard

### No More Timeout Errors

The following errors should **no longer appear**:
- ❌ `[useAuth] getSession() timed out after 3s - treating as no session`
- ❌ `[useAuth] Timeout - treating as no session`

## Testing Checklist

- [ ] Select a SuperUser from dev impersonation dropdown
- [ ] Click "Instant Sign In"
- [ ] Verify no timeout errors in console
- [ ] Verify successful login (Dashboard appears)
- [ ] Verify user profile loads correctly
- [ ] Test with different user types (Facility Admin, Group Admin, Basic User, Solo User)
- [ ] Test sign out and re-impersonation
- [ ] Verify "Reset Auth" button still works if needed

## Files Modified

1. **src/hooks/useAuth.ts**
   - Removed 3-second timeout on `getSession()`
   - Removed `sessionTimeout` variable
   - Simplified session loading logic

2. **src/components/DevUserImpersonation.tsx**
   - Added session persistence check after `verifyOtp()`
   - Added retry loop to wait for localStorage update
   - Improved console logging for debugging

## Related Documentation

- `Docs/AUTH_MAGIC_LINK_FIX.md` - Previous fix that should have removed the timeout
- `Docs/AUTH_DEBUGGING_GUIDE.md` - General auth debugging guide
- `Docs/AUTH_SIGNOUT_FIX.md` - Related auth storage clearing fixes

## Notes

- The "Multiple GoTrueClient instances" warning is expected and benign - the admin client needs to be separate
- The admin client uses a different storage key to prevent conflicts
- If impersonation still fails, use the "Reset Auth (Clear Session)" button to clear all auth state

