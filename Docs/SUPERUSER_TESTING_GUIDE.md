# SuperUser Role Testing Guide

## Quick Test (2 minutes)

### 1. Open the Application
The dev server is running at: **http://localhost:5175**

### 2. Sign In as SuperUser
1. Open the Dev Mode panel (bottom-right, purple)
2. Select **"Jim Sherlock - SuperUser"** from dropdown
3. Click **"Instant Sign In"**
4. Wait for page reload

### 3. Verify SuperUser Status

#### Check 1: Dashboard Role Badge
- Navigate to `/` (Dashboard)
- Look for role badge in the header
- **Expected**: Purple badge with Shield icon saying "SuperUser"
- **NOT Expected**: "Basic User" or "BASIC_USER"

#### Check 2: Admin Dashboard Access
- Navigate to `/admin`
- **Expected**: 
  - ✅ Admin Dashboard loads successfully
  - ✅ Purple "SuperUser" badge with Shield icon
  - ✅ Three tabs visible: Facilities, Groups, Memberships
  - ✅ "Create Facility" button visible
- **NOT Expected**:
  - ❌ "Access Restricted" message
  - ❌ "Your current role: BASIC_USER"
  - ❌ Redirect to dashboard

#### Check 3: Browser Console
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for role-related logs
4. **Expected**: No errors, role should be "SUPERUSER"

---

## Detailed Testing (10 minutes)

### Test 1: Role Detection

**Steps**:
1. Sign in as Jim Sherlock
2. Open browser console
3. Type: `localStorage.getItem('sb-ohlscdojhsifvnnkoiqi-auth-token')`
4. Verify you're authenticated

**Expected Console Output**:
```
[useAuth] Session loaded: jrsherlock@gmail.com
[useUserRole] Checking SuperUser status...
[useUserRole] User is a SuperUser
```

**Pass Criteria**:
- [ ] No "BASIC_USER" logs
- [ ] Role is "SUPERUSER"
- [ ] No errors in console

---

### Test 2: Admin Dashboard Access

**Steps**:
1. Navigate to http://localhost:5175/admin
2. Wait for page to load
3. Check header and content

**Expected UI**:
```
┌─────────────────────────────────────────┐
│ Admin Dashboard  [🛡️ SuperUser]         │
├─────────────────────────────────────────┤
│ [Facilities] [Groups] [Memberships]     │
├─────────────────────────────────────────┤
│ Facilities Tab:                         │
│ ┌─────────────────────────────────────┐ │
│ │ [+ Create Facility]                 │ │
│ │                                     │ │
│ │ Existing Facilities:                │ │
│ │ • Facility 1                        │ │
│ │ • Facility 2                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Pass Criteria**:
- [ ] "SuperUser" badge visible (purple with shield)
- [ ] All three tabs visible
- [ ] "Create Facility" button enabled
- [ ] No "Access Restricted" message

---

### Test 3: Facility Creation

**Steps**:
1. Go to Admin Dashboard → Facilities tab
2. Click "Create Facility" button
3. Enter facility name: "Test Facility"
4. Enter slug: "test-facility"
5. Click "Create"

**Expected Behavior**:
- ✅ Form submits successfully
- ✅ New facility appears in list
- ✅ Success toast notification
- ✅ No permission errors

**Pass Criteria**:
- [ ] Facility created successfully
- [ ] No "Only SuperUsers can create facilities" error
- [ ] Facility appears in dropdown

---

### Test 4: Group Creation

**Steps**:
1. Go to Admin Dashboard → Groups tab
2. Select a facility from dropdown
3. Click "Create Group" button
4. Enter group name: "Test Group"
5. Click "Create"

**Expected Behavior**:
- ✅ Form submits successfully
- ✅ New group appears in list
- ✅ Success toast notification
- ✅ No permission errors

**Pass Criteria**:
- [ ] Group created successfully
- [ ] No permission errors
- [ ] Group appears in list

---

### Test 5: Role Persistence

**Steps**:
1. Sign in as SuperUser
2. Navigate to different pages:
   - Dashboard (`/`)
   - Profile (`/profile`)
   - Admin (`/admin`)
   - Tribe Feed (`/sangha`)
3. Check role badge on each page

**Expected Behavior**:
- ✅ Role remains "SuperUser" on all pages
- ✅ No role changes or resets
- ✅ Admin features remain accessible

**Pass Criteria**:
- [ ] Role is consistent across all pages
- [ ] No "BASIC_USER" shown anywhere
- [ ] Admin links remain visible

---

### Test 6: Sign Out and Re-Sign In

**Steps**:
1. Sign out
2. Sign in again as Jim Sherlock
3. Navigate to `/admin`

**Expected Behavior**:
- ✅ SuperUser status recognized immediately
- ✅ Admin dashboard accessible
- ✅ No delay or loading issues

**Pass Criteria**:
- [ ] SuperUser status recognized on re-sign in
- [ ] Admin access granted immediately
- [ ] No errors or warnings

---

## Troubleshooting

### Issue: Still showing "BASIC_USER"

**Solution**:
1. Clear browser cache and localStorage
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Sign out and sign in again
4. Check browser console for errors

### Issue: "Access Restricted" on Admin Dashboard

**Solution**:
1. Verify you're signed in as jrsherlock@gmail.com
2. Check browser console for role logs
3. Verify database: `SELECT * FROM superusers WHERE user_id = '7c1051b5-3e92-4215-8623-763f7fb627c7'`
4. Clear auth storage and re-authenticate

### Issue: Console errors about "superusers" table

**Solution**:
1. Check RLS policies on `superusers` table
2. Verify user has permission to read their own row
3. Check Supabase logs for RLS violations

---

## Database Verification Queries

Run these in Supabase SQL Editor to verify database state:

### Query 1: Verify SuperUser Entry
```sql
SELECT * FROM public.superusers 
WHERE user_id = '7c1051b5-3e92-4215-8623-763f7fb627c7';
```
**Expected**: 1 row returned

### Query 2: Verify User Profile
```sql
SELECT up.*, au.email 
FROM public.user_profiles up 
JOIN auth.users au ON up.user_id = au.id 
WHERE au.email = 'jrsherlock@gmail.com';
```
**Expected**: 1 row with display_name "Jim Sherlock"

### Query 3: Test is_superuser Function
```sql
-- This won't work from SQL Editor (no auth context)
-- But you can test it from the application
SELECT app.is_superuser();
```
**Expected**: TRUE (when called from authenticated session)

---

## Success Criteria Summary

All of the following must be true:

- ✅ User can sign in as Jim Sherlock
- ✅ Role badge shows "SuperUser" (not "BASIC_USER")
- ✅ Admin dashboard is accessible at `/admin`
- ✅ "Create Facility" button is visible and functional
- ✅ "Create Group" button is visible and functional
- ✅ No "Access Restricted" messages
- ✅ No console errors related to roles
- ✅ Role persists across page navigation
- ✅ Role persists after sign out/sign in

---

## Performance Checks

### Check 1: Role Loading Time
- **Expected**: < 500ms
- **Measure**: Time from page load to role badge appearing
- **Tool**: Chrome DevTools Performance tab

### Check 2: Database Queries
- **Expected**: 1 query to `superusers` table per page load
- **Measure**: Network tab → Filter by "superusers"
- **Tool**: Chrome DevTools Network tab

### Check 3: No Infinite Loops
- **Expected**: No repeated role checks
- **Measure**: Console logs should not repeat
- **Tool**: Chrome DevTools Console tab

---

## Regression Testing

Ensure the fix didn't break regular users:

### Test Regular User (Non-SuperUser)
1. Sign in as a non-SuperUser (e.g., test user)
2. Navigate to `/admin`
3. **Expected**: "Access Restricted" message
4. **Expected**: Role shows their actual role (OWNER, ADMIN, MEMBER, or BASIC_USER)

### Test Facility Admin
1. Sign in as a Facility Admin
2. Navigate to `/admin`
3. **Expected**: Admin dashboard accessible
4. **Expected**: Role shows "Facility Admin" or "OWNER"
5. **Expected**: Cannot create facilities (SuperUser only)

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Commit the fix to git
3. ✅ Push to remote repository
4. ✅ Deploy to staging/production
5. ✅ Monitor for any issues
6. ✅ Update documentation

---

**Testing Status**: Ready for testing

**Dev Server**: http://localhost:5175

**Test User**: jrsherlock@gmail.com (Jim Sherlock - SuperUser)

**Expected Result**: Full SuperUser access to all admin features

