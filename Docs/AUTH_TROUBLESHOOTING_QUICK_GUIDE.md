# Authentication Troubleshooting - Quick Guide
**For when things go wrong with auth**

---

## 🚨 Stuck on Loading Screen?

### Quick Fix (Development)
1. Look for the purple "DEV: User Impersonation" panel in bottom-right
2. Click the red "Reset Auth (Clear Session)" button
3. Page will reload with fresh auth state

### Alternative (Any Environment)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run: `localStorage.clear()`
4. Reload the page

---

## 🔍 Common Issues & Solutions

### Issue: "Auth works once, then fails forever"
**Status**: ✅ FIXED (as of Oct 4, 2025)

**If still happening**:
1. Click "Reset Auth" button
2. Check console for errors
3. Verify you're on latest code

### Issue: Infinite loading spinner
**Cause**: Session timeout or corrupted data

**Solution**:
1. Wait 10 seconds (timeout will trigger)
2. Or click "Reset Auth" button
3. Page should show Welcome screen

### Issue: "Multiple GoTrueClient instances detected"
**Status**: ✅ FIXED (singleton pattern)

**If still happening**:
- Check for other `createClient()` calls in codebase
- Make sure importing from `src/lib/supabase.ts`

### Issue: Magic link doesn't work
**Check**:
1. Is the link complete? (should have `?token=...`)
2. Has it expired? (links expire after 1 hour)
3. Check Supabase email logs
4. Verify redirect URL in Supabase dashboard

### Issue: Dev impersonation doesn't work
**Check**:
1. Do you have `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env.local`?
2. Is the service key correct?
3. Try the "Reset Auth" button first
4. Check console for errors

---

## 🛠️ Manual Reset Methods

### Method 1: Dev Panel Button (Easiest)
```
1. Find purple dev panel (bottom-right)
2. Click "Reset Auth (Clear Session)"
3. Confirm dialog
4. Page reloads
```

### Method 2: Console Command
```javascript
// In browser console
localStorage.clear()
location.reload()
```

### Method 3: Application Tab
```
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Local Storage" → your domain
4. Right-click → Clear
5. Reload page
```

---

## 📊 What to Check in Console

### Healthy Auth Flow
```
✅ [useAuth] Starting to load session...
✅ [useAuth] Session loaded: User found
✅ [useAuth] Fetching user profile...
✅ [useAuth] Profile loaded
✅ [useAuth] Setting loading to false
```

### Timeout (Recoverable)
```
⚠️ [useAuth] getSession() timed out after 10s
⚠️ [useAuth] Clearing all auth storage...
✅ [useAuth] Setting loading to false
```

### Error (Recoverable)
```
❌ [useAuth] Error getting session: ...
⚠️ [useAuth] Clearing all auth storage...
✅ [useAuth] Setting loading to false
```

### Bad Signs
```
❌ [useAuth] Starting to load session...
❌ (nothing else - stuck!)
→ Use Reset Auth button
```

---

## 🔑 Environment Variables

### Required
```bash
VITE_SUPABASE_URL=https://ohlscdojhsifvnnkoiqi.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Optional (Dev Only)
```bash
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

**Benefits of service key**:
- Instant dev impersonation (no email)
- List all users in dev panel
- Faster development workflow

---

## 🧪 Testing Checklist

After any auth changes, test:

- [ ] Fresh browser sign-in works
- [ ] Sign out works
- [ ] Sign in again (same browser) works ← Critical!
- [ ] Magic link works
- [ ] Dev impersonation works
- [ ] Session persists across page reloads
- [ ] No infinite loading
- [ ] No console errors

---

## 📞 When to Ask for Help

If you've tried:
1. ✅ Reset Auth button
2. ✅ Cleared localStorage
3. ✅ Checked console for errors
4. ✅ Verified environment variables
5. ✅ Tested in incognito mode

And it still doesn't work, provide:
- Console logs (full output)
- Steps to reproduce
- Browser and version
- Whether it works in incognito

---

## 🎯 Quick Commands

### Clear Auth (Console)
```javascript
localStorage.clear()
location.reload()
```

### Check Current Session (Console)
```javascript
const { data } = await supabase.auth.getSession()
console.log(data.session)
```

### Check localStorage Keys (Console)
```javascript
Object.keys(localStorage).filter(k => k.includes('supabase'))
```

### Force Sign Out (Console)
```javascript
await supabase.auth.signOut()
localStorage.clear()
location.reload()
```

---

## 🔄 Recovery Workflow

```
Stuck on loading?
    ↓
Wait 10 seconds
    ↓
Still loading?
    ↓
Click "Reset Auth" button
    ↓
Still stuck?
    ↓
Open console, run: localStorage.clear()
    ↓
Reload page
    ↓
Still stuck?
    ↓
Check console for errors
    ↓
Ask for help with logs
```

---

## ✅ Prevention Tips

1. **Always sign out properly** - Don't just close the tab
2. **Use Reset Auth if switching users** - Clears old session
3. **Check console regularly** - Catch errors early
4. **Keep service key in .env.local** - Faster dev workflow
5. **Test in incognito** - Verify fresh browser works

---

## 🎉 Success Indicators

You know auth is working when:
- ✅ Can sign in multiple times
- ✅ Session persists across reloads
- ✅ Sign out works cleanly
- ✅ No infinite loading
- ✅ No console errors
- ✅ Dev impersonation instant
- ✅ Magic links work

---

**Last Updated**: October 4, 2025  
**Related Docs**: 
- `SESSION_CORRUPTION_FIX.md` - Technical details
- `AUTH_MAGIC_LINK_FIX.md` - Magic link flow

