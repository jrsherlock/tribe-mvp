# User Impersonation Feature - Testing Guide

## 🧪 Pre-Testing Checklist

Before you begin testing, ensure:

- [ ] Development server is running (`npm run dev`)
- [ ] You have access to the Supabase dashboard
- [ ] You have at least 2-3 test users in the database
- [ ] You know the email addresses of test users
- [ ] `.env.local` file exists with Supabase credentials

---

## 📋 Test Plan

### Test 1: Component Visibility

**Objective:** Verify the component only appears in development mode

**Steps:**
1. Start dev server: `npm run dev`
2. Navigate to landing page (http://localhost:5173)
3. Look for purple panel in bottom-right corner

**Expected Results:**
- ✅ Purple "DEV: User Impersonation" panel visible
- ✅ Panel contains user selector and sign-in button
- ✅ Yellow warning banner visible

**To Test Production Mode:**
1. Build for production: `npm run build`
2. Preview build: `npm run preview`
3. Navigate to landing page

**Expected Results:**
- ✅ No impersonation panel visible
- ✅ Normal landing page only

---

### Test 2: User List Loading

**Objective:** Verify users load correctly from database

**Steps:**
1. Open landing page in dev mode
2. Wait for component to load
3. Click the user dropdown

**Expected Results:**
- ✅ Loading spinner appears initially
- ✅ Dropdown populates with users
- ✅ Each user shows: Display Name (Email)
- ✅ Tenant members show: - Tenant Name [ROLE]
- ✅ Solo users show: - Solo User
- ✅ Users sorted alphabetically by display name
- ✅ User count shown at bottom

**If No Users Appear:**
- Check browser console for errors
- Verify database has user_profiles entries
- Check RLS policies allow reading user_profiles

---

### Test 3: Magic Link Mode (Without Service Key)

**Objective:** Test authentication via magic link email

**Prerequisites:**
- Remove or comment out `VITE_SUPABASE_SERVICE_ROLE_KEY` from `.env.local`
- Restart dev server

**Steps:**
1. Open landing page
2. Verify no green "Instant" badge visible
3. Select a user from dropdown
4. Click "Send Magic Link" button
5. Check the user's email inbox
6. Click the magic link in email

**Expected Results:**
- ✅ Button text says "Send Magic Link"
- ✅ Alert appears: "Magic link sent to [email]"
- ✅ Email received within 1-2 minutes
- ✅ Clicking link signs you in
- ✅ Redirected to dashboard
- ✅ User context correct (check profile, tenant)

**Common Issues:**
- Email in spam folder
- Supabase email settings not configured
- Email rate limiting (wait a few minutes)

---

### Test 4: Instant Mode (With Service Key)

**Objective:** Test instant impersonation with service role key

**Prerequisites:**
1. Get service role key from Supabase Dashboard:
   - Settings → API → service_role key
2. Add to `.env.local`:
   ```bash
   VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Restart dev server

**Steps:**
1. Open landing page
2. Verify green "Instant" badge visible in header
3. Select a user from dropdown
4. Click "Instant Sign In" button
5. Wait for page reload

**Expected Results:**
- ✅ Green "Instant" badge visible
- ✅ Button text says "Instant Sign In"
- ✅ No alert/email required
- ✅ Page reloads automatically
- ✅ Signed in as selected user
- ✅ Redirected to dashboard
- ✅ User context correct

**Common Issues:**
- Service key incorrect or expired
- Server not restarted after adding key
- Browser cache (try hard refresh)

---

### Test 5: User Context Preservation

**Objective:** Verify full user context is maintained

**Test Solo User:**
1. Impersonate a user with no tenant
2. Navigate to Dashboard
3. Navigate to Tribe Feed
4. Navigate to Profile

**Expected Results:**
- ✅ Dashboard shows only own check-ins
- ✅ Tribe Feed shows only own posts
- ✅ No tenant/group features visible
- ✅ Profile shows correct user info

**Test Tenant Member:**
1. Impersonate a user with tenant membership
2. Navigate to Dashboard
3. Navigate to Groups
4. Check available features

**Expected Results:**
- ✅ Dashboard shows tenant context
- ✅ Can see group check-ins
- ✅ Tenant name visible
- ✅ Role-appropriate features available

**Test Facility Admin:**
1. Impersonate a user with OWNER or ADMIN role
2. Navigate to Admin Dashboard
3. Try creating a group

**Expected Results:**
- ✅ Admin Dashboard accessible
- ✅ Can create groups
- ✅ Can manage users
- ✅ Tenant management available

**Test SuperUser:**
1. Impersonate jrsherlock@gmail.com (or other superuser)
2. Navigate to Admin Dashboard
3. Try creating a facility

**Expected Results:**
- ✅ Can create facilities
- ✅ Can see all tenants
- ✅ Full admin access
- ✅ SuperUser badge/indicator visible

---

### Test 6: Sign Out and Switch Users

**Objective:** Verify session clearing and user switching

**Steps:**
1. Impersonate User A
2. Verify signed in (check dashboard)
3. Click "Sign Out" in app
4. Verify redirected to landing page
5. Verify impersonation panel still visible
6. Select User B
7. Sign in as User B
8. Verify signed in as User B

**Expected Results:**
- ✅ Sign out clears session completely
- ✅ Redirected to landing page
- ✅ Impersonation panel still visible
- ✅ Can select different user
- ✅ New session created for User B
- ✅ No remnants of User A's session
- ✅ User B's context loaded correctly

---

### Test 7: Error Handling

**Objective:** Verify graceful error handling

**Test Invalid User Selection:**
1. Open landing page
2. Don't select a user
3. Click sign-in button

**Expected Results:**
- ✅ Error message: "Please select a user"
- ✅ No sign-in attempted
- ✅ UI remains responsive

**Test Network Error:**
1. Disconnect internet
2. Try to impersonate a user

**Expected Results:**
- ✅ Error message displayed
- ✅ Error logged to console
- ✅ UI remains responsive
- ✅ Can retry after reconnecting

**Test Invalid Service Key:**
1. Add invalid service key to `.env.local`
2. Restart server
3. Try instant impersonation

**Expected Results:**
- ✅ Falls back to magic link mode OR
- ✅ Shows clear error message
- ✅ Console shows detailed error

---

### Test 8: UI/UX Verification

**Objective:** Verify user interface quality

**Visual Checks:**
- [ ] Purple color scheme consistent
- [ ] Panel positioned correctly (bottom-right)
- [ ] Panel doesn't overlap important content
- [ ] Text readable and properly sized
- [ ] Icons display correctly
- [ ] Badges (Instant, warnings) visible
- [ ] Dropdown styled consistently
- [ ] Button states clear (enabled/disabled)

**Interaction Checks:**
- [ ] Dropdown opens smoothly
- [ ] Can scroll through user list
- [ ] Button shows loading state
- [ ] Hover states work
- [ ] Focus states visible
- [ ] Keyboard navigation works
- [ ] Mobile responsive (if applicable)

**Feedback Checks:**
- [ ] Loading spinner appears during load
- [ ] Error messages clear and helpful
- [ ] Success feedback appropriate
- [ ] User count accurate
- [ ] Service key status clear

---

### Test 9: Performance

**Objective:** Verify performance with many users

**Test with 10+ Users:**
1. Ensure database has 10+ users
2. Open landing page
3. Measure load time
4. Scroll through user list

**Expected Results:**
- ✅ Loads in < 2 seconds
- ✅ Dropdown scrolls smoothly
- ✅ No lag when selecting users
- ✅ No memory leaks (check DevTools)

**Test with 50+ Users:**
1. If available, test with larger dataset
2. Monitor performance

**Expected Results:**
- ✅ Still loads in reasonable time
- ✅ Consider pagination if slow

---

### Test 10: Security Verification

**Objective:** Verify security measures

**Production Build Check:**
1. Build for production: `npm run build`
2. Preview: `npm run preview`
3. Inspect page source
4. Search for "DevUserImpersonation"

**Expected Results:**
- ✅ Component not in production bundle
- ✅ No references to service role key
- ✅ No dev-only code visible

**Environment Variable Check:**
1. Check `.gitignore` includes `.env.local`
2. Verify `.env.local` not in git
3. Check `.env.example` has warnings

**Expected Results:**
- ✅ `.env.local` in `.gitignore`
- ✅ Service key not committed
- ✅ Documentation includes warnings

---

## 📊 Test Results Template

Use this template to record your test results:

```markdown
## Test Session: [Date]

### Environment
- Node Version: 
- Browser: 
- Service Key: [ ] Yes [ ] No

### Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Component Visibility | ✅ / ❌ | |
| 2 | User List Loading | ✅ / ❌ | |
| 3 | Magic Link Mode | ✅ / ❌ | |
| 4 | Instant Mode | ✅ / ❌ | |
| 5 | User Context | ✅ / ❌ | |
| 6 | Sign Out/Switch | ✅ / ❌ | |
| 7 | Error Handling | ✅ / ❌ | |
| 8 | UI/UX | ✅ / ❌ | |
| 9 | Performance | ✅ / ❌ | |
| 10 | Security | ✅ / ❌ | |

### Issues Found
1. 
2. 
3. 

### Recommendations
1. 
2. 
3. 
```

---

## 🐛 Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Panel not visible | Not in dev mode | Run `npm run dev` |
| No users in dropdown | Database empty | Add test users |
| Magic link not received | Email settings | Check Supabase email config |
| Instant mode not working | Service key missing | Add to `.env.local` and restart |
| "Failed to load users" | RLS policies | Check user_profiles policies |
| Wrong user context | Session not cleared | Hard refresh browser |
| Component in production | Build issue | Verify `import.meta.env.DEV` check |

---

## ✅ Final Checklist

Before marking testing complete:

- [ ] All 10 tests passed
- [ ] Tested in Chrome/Firefox/Safari
- [ ] Tested both magic link and instant modes
- [ ] Tested with different user types
- [ ] Verified production build excludes component
- [ ] Documented any issues found
- [ ] Created test results report
- [ ] Verified security measures
- [ ] Checked performance
- [ ] Reviewed documentation accuracy

---

## 📝 Next Steps

After testing:

1. **If all tests pass:**
   - Mark feature as ready for use
   - Share documentation with team
   - Add to onboarding materials

2. **If issues found:**
   - Document issues clearly
   - Prioritize by severity
   - Create fix plan
   - Retest after fixes

3. **Ongoing:**
   - Test quarterly
   - Update docs as needed
   - Monitor for Supabase API changes
   - Gather user feedback

---

**Happy Testing! 🎉**

