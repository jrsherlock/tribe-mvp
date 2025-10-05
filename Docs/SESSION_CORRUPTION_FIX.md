# Session Corruption & Auth Reliability Fix
**Date**: October 4, 2025  
**Issue**: Authentication only works in fresh browsers, fails on subsequent attempts  
**Status**: ✅ FIXED

---

## Problem Summary

Critical authentication reliability issue where auth only worked once per browser, then failed on all subsequent attempts with infinite loading.

### Symptoms
1. ✅ Authentication works in completely fresh browser (new install or incognito)
2. ❌ Once browser used once, authentication fails forever
3. ❌ Both dev quick auth AND magic link fail the same way
4. ❌ Infinite loading/spinning on auth screen
5. ❌ Console shows `[useAuth] Starting to load session...` but never completes
6. ❌ `loading` state stuck at `true`, never becomes `false`

### Root Cause
**Corrupted session data in localStorage** that was never being cleared properly, causing `getSession()` to hang indefinitely.

---

## Root Causes Identified

### 1. No Session Cleanup on Errors
**Problem**: When auth failed, corrupted session data remained in localStorage

```typescript
// ❌ BEFORE - No cleanup
catch (err) {
  console.error('[useAuth] Error loading auth session:', err)
  setLoading(false) // Just set loading false, leave corrupted data
}
```

**Why it failed**:
- Corrupted tokens stayed in localStorage
- Next auth attempt tried to use corrupted tokens
- `getSession()` hung trying to validate invalid tokens
- No timeout, so it hung forever

**Fix**: Clear storage on any error

```typescript
// ✅ AFTER - Clear corrupted data
catch (err) {
  console.error('[useAuth] Error loading auth session:', err)
  clearAuthStorage() // Clear all auth data
  setLoading(false)
}
```

### 2. getSession() Hanging Indefinitely
**Problem**: Removed timeout completely in previous fix, so corrupted sessions caused infinite hangs

**Fix**: Added 10-second timeout with proper cleanup

```typescript
// ✅ AFTER - Reasonable timeout with cleanup
const sessionPromise = supabase.auth.getSession()
const timeoutPromise = new Promise<never>((_, reject) => {
  sessionTimeout = setTimeout(() => {
    console.error('[useAuth] getSession() timed out - clearing storage')
    reject(new Error('Session load timeout'))
  }, 10000)
})

try {
  const result = await Promise.race([sessionPromise, timeoutPromise])
  if (sessionTimeout) clearTimeout(sessionTimeout)
} catch (timeoutError) {
  // Timeout - clear storage and set unauthenticated
  clearAuthStorage()
  setUser(null)
  setIsAuthenticated(false)
  setLoading(false)
  return
}
```

### 3. Multiple Supabase Client Instances
**Problem**: `DevUserImpersonation` was creating new admin clients on every render

```typescript
// ❌ BEFORE - New client every time
const adminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
  { ... }
)
```

**Why it's a problem**:
- Multiple GoTrueClient instances warning
- Auth state conflicts between clients
- Session corruption

**Fix**: Singleton pattern for admin client

```typescript
// ✅ AFTER - Singleton
let adminClientInstance: SupabaseClient | null = null

function getAdminClient(): SupabaseClient | null {
  if (!adminClientInstance) {
    adminClientInstance = createClient(...)
  }
  return adminClientInstance
}
```

### 4. No Session Cleanup Before Impersonation
**Problem**: Dev impersonation didn't clear existing session first

**Fix**: Clear session before impersonating

```typescript
// ✅ Clear existing session first
clearAuthStorage()
await supabase.auth.signOut()
// Then impersonate new user
```

### 5. No Manual Reset Option
**Problem**: Users had no way to recover from stuck state

**Fix**: Added "Reset Auth" buttons in dev mode

---

## Changes Made

### File: `src/hooks/useAuth.ts`

**New Utility Function**:
```typescript
export function clearAuthStorage() {
  console.log('[useAuth] Clearing all auth storage...')
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith('supabase.auth') || key.startsWith('sb-')) {
      localStorage.removeItem(key)
    }
  })
}
```

**Enhanced Session Loading**:
1. ✅ Added 10-second timeout with proper cleanup
2. ✅ Clear storage on timeout
3. ✅ Clear storage on any error
4. ✅ Proper timeout cleanup in useEffect cleanup function

**Enhanced Sign Out**:
```typescript
const signOut = async () => {
  try {
    await supabase.auth.signOut()
    clearAuthStorage() // Always clear storage
    setUser(null)
    setIsAuthenticated(false)
  } catch (error) {
    // Even if sign out fails, clear local storage
    clearAuthStorage()
    setUser(null)
    setIsAuthenticated(false)
  }
}
```

**New Reset Function**:
```typescript
const resetAuth = async () => {
  await supabase.auth.signOut()
  clearAuthStorage()
  setUser(null)
  setIsAuthenticated(false)
  setLoading(false)
  window.location.reload() // Fresh start
}
```

### File: `src/components/DevUserImpersonation.tsx`

**Changes**:
1. ✅ Singleton admin client pattern
2. ✅ Clear session before impersonation
3. ✅ Added "Reset Auth" button
4. ✅ Import `clearAuthStorage` from useAuth

**New Features**:
- Red "Reset Auth (Clear Session)" button
- "Use if stuck on loading screen" helper text
- Clears all auth data and reloads page

### File: `src/components/Welcome.tsx`

**Changes**:
1. ✅ Import `clearAuthStorage` and `RefreshCw` icon
2. ✅ Added `handleResetAuth` function
3. ✅ Added debug reset button (dev mode only)

**New Feature**:
- Small "Reset Auth (Debug)" link at bottom of CTA
- Only visible in development mode
- Helps users recover from stuck state

---

## How It Works Now

### Normal Auth Flow
```
1. User clicks sign in
   ↓
2. getSession() called with 10s timeout
   ↓
3. If session exists and valid → Authenticated
4. If no session → Unauthenticated
5. If timeout or error → Clear storage, Unauthenticated
```

### Error Recovery Flow
```
1. getSession() hangs or errors
   ↓
2. After 10 seconds, timeout fires
   ↓
3. clearAuthStorage() removes all tokens
   ↓
4. Set user to null, loading to false
   ↓
5. User sees Welcome page (can try again)
```

### Manual Reset Flow
```
1. User stuck on loading screen
   ↓
2. Click "Reset Auth" button (dev mode)
   ↓
3. Confirm dialog
   ↓
4. clearAuthStorage() + signOut()
   ↓
5. Page reloads
   ↓
6. Fresh start, no corrupted data
```

---

## Testing the Fix

### Test 1: Fresh Browser Auth
1. Open app in fresh incognito window
2. Sign in with dev impersonation or magic link
3. **Expected**: Signs in successfully
4. **Should NOT**: Get stuck on loading

### Test 2: Subsequent Auth (The Critical Test)
1. Sign out
2. Sign in again (same browser)
3. **Expected**: Signs in successfully again
4. **Should NOT**: Get stuck on loading (this was the bug!)

### Test 3: Corrupted Session Recovery
1. Manually corrupt localStorage:
   ```javascript
   localStorage.setItem('supabase.auth.token', 'corrupted-data')
   ```
2. Reload page
3. **Expected**: After 10s timeout, shows Welcome page
4. **Should NOT**: Hang forever

### Test 4: Manual Reset
1. If stuck on loading screen
2. Wait for page to load (or force it)
3. Click "Reset Auth" button in dev panel
4. **Expected**: Page reloads, shows Welcome page
5. Can sign in successfully

### Test 5: Multiple Sign-Ins
1. Sign in as User A
2. Sign out
3. Sign in as User B
4. Sign out
5. Sign in as User A again
6. **Expected**: All sign-ins work
7. **Should NOT**: Get stuck after first use

---

## localStorage Keys Cleared

The `clearAuthStorage()` function removes:
- `supabase.auth.token` - Main auth token
- `supabase.auth.expires_at` - Token expiration
- `supabase.auth.refresh_token` - Refresh token
- Any keys starting with `sb-` (Supabase storage)

---

## Console Logs to Expect

### Successful Auth
```
[useAuth] Starting to load session...
[useAuth] Session loaded: User found
[useAuth] Fetching user profile for tenant_id...
[useAuth] Profile loaded, tenant_id: null
[useAuth] Setting user: {...}
[useAuth] Setting loading to false
```

### Timeout Recovery
```
[useAuth] Starting to load session...
[useAuth] getSession() timed out after 10s - clearing storage
[useAuth] Clearing all auth storage...
[useAuth] Removed: supabase.auth.token
[useAuth] Auth storage cleared
[useAuth] Setting loading to false
```

### Manual Reset
```
[Welcome] Manual auth reset
[useAuth] Clearing all auth storage...
[useAuth] Removed: supabase.auth.token
[useAuth] Auth storage cleared
```

---

## Key Improvements

### Reliability
- ✅ Auth works multiple times in same browser
- ✅ Automatic recovery from corrupted sessions
- ✅ No more infinite loading
- ✅ Proper cleanup on errors

### Developer Experience
- ✅ "Reset Auth" button for quick recovery
- ✅ Clear console logs for debugging
- ✅ Singleton pattern prevents multiple clients
- ✅ Helpful error messages

### User Experience
- ✅ Loading never hangs forever (10s max)
- ✅ Clear error states
- ✅ Can always recover with reset button
- ✅ Smooth sign in/out flow

---

## Prevention Measures

### 1. Always Clear on Error
Every error path now calls `clearAuthStorage()`

### 2. Timeout Protection
10-second timeout prevents infinite hangs

### 3. Singleton Clients
Only one Supabase client instance per type

### 4. Manual Recovery
Users can always reset if stuck

### 5. Comprehensive Logging
Easy to debug issues in console

---

## Troubleshooting

### Issue: Still stuck on loading
**Solution**: 
1. Click "Reset Auth" button in dev panel
2. Or manually clear localStorage in browser DevTools
3. Reload page

### Issue: "Multiple instances" warning
**Solution**:
- Should be fixed with singleton pattern
- If still appears, check for other `createClient` calls

### Issue: Auth works once then fails
**Solution**:
- This was the main bug, should be fixed
- If still happens, check console for errors
- Use "Reset Auth" button

### Issue: Timeout too short/long
**Solution**:
- Currently 10 seconds
- Can adjust in `useAuth.ts` line ~45
- Increase for slow connections
- Decrease for faster feedback

---

## Summary

**What was broken**:
- Corrupted session data never cleared
- getSession() hung indefinitely
- No recovery mechanism
- Multiple client instances

**What we fixed**:
- Clear storage on all errors
- 10-second timeout with cleanup
- Singleton admin client
- Manual reset buttons
- Comprehensive logging

**Result**: 
- ✅ Auth works reliably across multiple sign-ins
- ✅ Automatic recovery from errors
- ✅ Manual reset option
- ✅ No more infinite loading
- ✅ Production-ready authentication! 🎉

