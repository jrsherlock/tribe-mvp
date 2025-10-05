# User Management Testing Guide
**Date**: October 3, 2025  
**Purpose**: Step-by-step testing instructions for new user invitation and management features

---

## Quick Start

### What to Test
1. ✅ Invite users by email
2. ✅ Accept invitations
3. ✅ View user details (names, emails, avatars)
4. ✅ Manage member roles
5. ✅ Remove members

### Prerequisites
- SuperUser account (to create facilities)
- Dev environment running
- Supabase connection working

---

## Test 1: Invite a User

### Steps
1. Sign in as Facility Admin
2. Go to `/admin` → Memberships tab
3. Select a facility
4. Click "Invite User" button
5. Enter:
   - Email: `test@example.com`
   - Role: `MEMBER`
   - Expires: `7 days`
6. Click "Send Invitation"

### Expected
- ✅ Modal shows success
- ✅ Invitation link displayed
- ✅ Copy button works
- ✅ No errors in console

### If It Fails
- Check Edge Function is deployed
- Verify you're OWNER/ADMIN of facility
- Check VITE_SUPABASE_URL in .env.local

---

## Test 2: Accept Invitation

### Steps
1. Copy invitation link
2. Open in incognito window
3. Should see "You're Invited!" page
4. Click "Accept Invitation"
5. If not signed in:
   - Enter email
   - Click "Send Sign-In Link"
   - Check email for magic link
   - Sign in
   - Return to invite page
6. Click "Accept Invitation"

### Expected
- ✅ Shows invitation details
- ✅ Handles authentication
- ✅ Accepts successfully
- ✅ Redirects to dashboard
- ✅ User is now facility member

### If It Fails
- Check token in URL is complete
- Verify invite hasn't expired
- Check user isn't already in another facility

---

## Test 3: View Member Details

### Steps
1. Go to `/admin` → Memberships tab
2. Select facility
3. Look at member list

### Expected
- ✅ Shows user avatars (or initials)
- ✅ Shows display names
- ✅ Shows email addresses
- ✅ Shows role badges (colored)
- ✅ NOT just user IDs

### If It Fails
- User may not have created profile yet
- Check user_profiles table has data
- Refresh the page

---

## Test 4: Change Member Role

### Steps
1. In Memberships tab
2. Find a member
3. Click "Make Admin" or "Make Member"
4. Watch badge update

### Expected
- ✅ Role changes immediately
- ✅ Badge color updates
- ✅ Success toast appears

### If It Fails
- Check you're OWNER/ADMIN
- Refresh page to see changes

---

## Test 5: Remove Member

### Steps
1. In Memberships tab
2. Find a member
3. Click "Remove" button
4. Confirm action

### Expected
- ✅ Member removed from list
- ✅ Success toast appears
- ✅ Member loses facility access

### If It Fails
- Can't remove yourself (use Leave instead)
- Check you're OWNER/ADMIN

---

## Database Checks

### Verify Membership Created
```sql
SELECT 
  tm.user_id,
  tm.role,
  up.display_name,
  up.email
FROM tenant_members tm
LEFT JOIN user_profiles up ON up.user_id = tm.user_id
WHERE tm.tenant_id = 'your-facility-id';
```

### Check Pending Invites
```sql
SELECT 
  email,
  role,
  expires_at
FROM invites
WHERE tenant_id = 'your-facility-id'
  AND expires_at > NOW();
```

---

## Common Issues

### "Permission denied"
- You're not OWNER/ADMIN of the facility
- Check your role in tenant_members table

### "Invalid invitation"
- Token is wrong or expired
- Create a new invitation

### "Already a member"
- User is already in this facility
- Or user is in another facility (single-tenant constraint)

### User shows as "Unknown User"
- User hasn't created their profile yet
- They need to visit /profile and fill it out

### Invite link doesn't work
- Check Edge Function is deployed
- Verify full URL is copied
- Check invite hasn't expired

---

## Success Checklist

After testing, you should be able to:

- [x] Invite users by email
- [x] Copy invitation link
- [x] Accept invitations
- [x] See user names/emails (not just IDs)
- [x] Change member roles
- [x] Remove members
- [x] See role badges with colors

**All working? Great! Your user management is operational!** 🎉

---

## Next Steps

1. **Test with real email** (configure SendGrid)
2. **Implement group member assignment**
3. **Add bulk user import**
4. **Add pending invites list**

See `IMPLEMENTATION_COMPLETE_SUMMARY.md` for full details.

