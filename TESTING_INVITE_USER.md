# Testing the Invite User Feature

## Prerequisites

1. **Service Role Key Configured**
   - Verify `.env.local` contains `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - Restart dev server if you just added it

2. **User with Admin Privileges**
   - Log in as a user with ADMIN or OWNER role in a tenant
   - Or use a SuperUser account

3. **Groups Created**
   - Create at least one group in the tenant to test group assignment
   - Navigate to Groups section and create a test group

## Test Scenarios

### Scenario 1: Basic Invitation (No Group)

**Steps:**
1. Navigate to the admin dashboard or tenant management page
2. Click "Invite User" button
3. Fill in the form:
   - Email: `test@example.com`
   - Role: `Member`
   - Expiration: `7 days (recommended)`
   - Group: `No group (user can join later)`
4. Click "Send Invitation"

**Expected Results:**
- ✅ Toast notification: "Invitation sent to test@example.com!"
- ✅ Modal closes automatically
- ✅ User receives email with invitation link
- ✅ Invite record created in database with no `group_id`

**Fallback (if email fails):**
- ✅ Toast notification: "Invitation created! Share the link below."
- ✅ Manual link displayed in modal
- ✅ Copy button works and shows "Copied" feedback

### Scenario 2: Invitation with Group Assignment

**Steps:**
1. Click "Invite User" button
2. Fill in the form:
   - Email: `groupmember@example.com`
   - Role: `Member`
   - Expiration: `7 days (recommended)`
   - Group: Select a group from dropdown
3. Click "Send Invitation"

**Expected Results:**
- ✅ Toast notification: "Invitation sent to groupmember@example.com!"
- ✅ Invite record created with `group_id` populated
- ✅ When user accepts, they are automatically added to the selected group

### Scenario 3: Facility Admin Invitation

**Steps:**
1. Click "Invite User" button
2. Fill in the form:
   - Email: `admin@example.com`
   - Role: `Facility Admin`
   - Expiration: `14 days`
   - Group: (optional)
3. Click "Send Invitation"

**Expected Results:**
- ✅ Invitation sent successfully
- ✅ Invite record has `role = 'ADMIN'`
- ✅ When accepted, user has ADMIN role in tenant

### Scenario 4: Accept Invitation (No Group)

**Steps:**
1. Open invitation link in browser (from email or manual link)
2. If not logged in, sign in with the invited email
3. Click "Accept Invitation"

**Expected Results:**
- ✅ Loading state shown during acceptance
- ✅ Success message: "Invitation accepted! Redirecting..."
- ✅ User added to tenant with correct role
- ✅ Redirected to dashboard after 2 seconds
- ✅ Invite marked as accepted in database

### Scenario 5: Accept Invitation (With Group)

**Steps:**
1. Open invitation link that includes group assignment
2. Sign in if needed
3. Click "Accept Invitation"

**Expected Results:**
- ✅ User added to tenant
- ✅ User automatically added to specified group
- ✅ Group membership visible in Groups section
- ✅ User can see group content immediately

### Scenario 6: Expired Invitation

**Steps:**
1. Create an invitation with 1-day expiration
2. Manually update `expires_at` in database to past date
3. Try to accept the invitation

**Expected Results:**
- ✅ "Invitation Expired" message shown
- ✅ Clear explanation and "Go to Home" button
- ✅ No tenant membership created

### Scenario 7: Invalid Token

**Steps:**
1. Navigate to `/accept-invite?token=invalid-token-123`

**Expected Results:**
- ✅ "Invalid Invitation" message shown
- ✅ Clear explanation and "Go to Home" button

### Scenario 8: Permission Denied

**Steps:**
1. Log in as a regular MEMBER (not ADMIN or OWNER)
2. Try to access invite functionality

**Expected Results:**
- ✅ Error: "You must be a Facility Admin to invite users"
- ✅ No invitation created

### Scenario 9: One-Tenant-Per-User Enforcement

**Steps:**
1. User already belongs to Tenant A
2. Receive invitation to Tenant B
3. Try to accept invitation

**Expected Results:**
- ✅ Error message: "You are already a member of [Tenant A]. Users can only belong to one facility at a time."
- ✅ No new membership created
- ✅ Existing membership unchanged

### Scenario 10: No Groups Available

**Steps:**
1. Open invite modal for a tenant with no groups
2. Check the group selector

**Expected Results:**
- ✅ Dropdown shows "No groups available"
- ✅ Dropdown is disabled
- ✅ Helper text: "User can join groups after accepting the invitation"
- ✅ Can still send invitation without group

## Database Verification

After each test, verify in Supabase:

### Check Invites Table
```sql
SELECT 
  id, 
  email, 
  role, 
  group_id,
  status,
  expires_at,
  accepted_at,
  invited_by
FROM invites
ORDER BY created_at DESC
LIMIT 10;
```

### Check Tenant Memberships
```sql
SELECT 
  tm.user_id,
  u.email,
  tm.tenant_id,
  t.name as tenant_name,
  tm.role
FROM tenant_members tm
JOIN auth.users u ON u.id = tm.user_id
JOIN tenants t ON t.id = tm.tenant_id
ORDER BY tm.created_at DESC
LIMIT 10;
```

### Check Group Memberships
```sql
SELECT 
  gm.user_id,
  u.email,
  gm.group_id,
  g.name as group_name,
  gm.role
FROM group_memberships gm
JOIN auth.users u ON u.id = gm.user_id
JOIN groups g ON g.id = gm.group_id
ORDER BY gm.created_at DESC
LIMIT 10;
```

## UI/UX Checks

### InviteUserModal
- ✅ Modal opens smoothly
- ✅ All form fields are properly labeled
- ✅ Dropdowns show correct options
- ✅ Loading states appear during async operations
- ✅ Error messages are clear and actionable
- ✅ Success messages are encouraging
- ✅ Modal closes on success or cancel
- ✅ Form resets after successful submission

### AcceptInvite Page
- ✅ Loading spinner shows while verifying token
- ✅ Invitation details displayed clearly
- ✅ Role is human-readable ("Facility Admin" not "ADMIN")
- ✅ Expiration date formatted nicely
- ✅ Sign-in flow works for unauthenticated users
- ✅ Success animation plays on acceptance
- ✅ Error states are user-friendly

## Browser Console Checks

### No Errors Expected
- ✅ No CORS errors
- ✅ No 503 Service Unavailable errors
- ✅ No authentication errors
- ✅ No database constraint violations

### Expected Logs
- ✅ `[Supabase] Creating new client instance` (on first load)
- ✅ Successful API responses (200 status)
- ✅ Toast notifications appear in console

## Performance Checks

- ✅ Groups load quickly (< 1 second)
- ✅ Invitation sends in < 2 seconds
- ✅ Acceptance completes in < 2 seconds
- ✅ No unnecessary re-renders
- ✅ No memory leaks

## Accessibility Checks

- ✅ All form inputs have labels
- ✅ Error messages are associated with inputs
- ✅ Keyboard navigation works
- ✅ Focus states are visible
- ✅ Color contrast meets WCAG standards
- ✅ Screen reader announcements are clear

## Edge Cases

### Empty Email
- ✅ Validation error: "Please enter an email address"

### Invalid Email Format
- ✅ Browser validation catches it
- ✅ Or backend returns clear error

### Duplicate Invitation
- ✅ System allows multiple invitations to same email
- ✅ Only the latest valid invitation works

### Network Failure
- ✅ Error message: "Failed to send invitation"
- ✅ User can retry

### Service Role Key Missing
- ✅ Error: "Admin privileges required. Please contact your system administrator."
- ✅ Graceful degradation

## Cleanup After Testing

1. **Delete Test Invitations**
   ```sql
   DELETE FROM invites WHERE email LIKE '%test%' OR email LIKE '%example.com';
   ```

2. **Remove Test Users**
   - Use Supabase Dashboard → Authentication → Users
   - Delete test accounts manually

3. **Remove Test Memberships**
   ```sql
   DELETE FROM tenant_members WHERE user_id IN (
     SELECT id FROM auth.users WHERE email LIKE '%test%'
   );
   ```

## Success Criteria

The feature is working correctly if:
- ✅ All 10 test scenarios pass
- ✅ No console errors
- ✅ Database records are correct
- ✅ Email delivery works (or fallback link is provided)
- ✅ Group assignment works when specified
- ✅ One-tenant-per-user rule is enforced
- ✅ UI is responsive and provides clear feedback
- ✅ Security checks prevent unauthorized invitations

## Known Limitations

1. **Email Delivery:** Depends on Supabase email configuration
   - Fallback: Manual link sharing always works

2. **Service Role Key:** Required in environment
   - Security: Should only be in dev/server environments

3. **Group Assignment:** Non-blocking
   - If group assignment fails, user still joins tenant

## Next Steps After Testing

1. ✅ Verify all scenarios pass
2. ✅ Document any issues found
3. ✅ Fix any bugs discovered
4. ✅ Update user documentation
5. ✅ Prepare for production deployment

