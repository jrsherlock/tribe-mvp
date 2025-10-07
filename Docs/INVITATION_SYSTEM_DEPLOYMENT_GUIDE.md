# Invitation System Deployment Guide

## Overview

This guide walks you through deploying the invitation system for your multi-tenant addiction recovery web app. The system allows Facility Admins to invite users via email.

## ✅ What's Already Done

1. **Database Schema Fixed**
   - ✅ Added `invited_by` column to track who sent invitations
   - ✅ Added `accepted_at` column to track when invitations were accepted
   - ✅ Added `status` column (pending/accepted/expired) with automatic updates
   - ✅ Created indexes for better query performance
   - ✅ Updated RLS policies to use `tenant_members` table
   - ✅ Applied to dev database (ID: ohlscdojhsifvnnkoiqi)

2. **Code Updates**
   - ✅ Updated Edge Function to set `invited_by` field
   - ✅ Updated TypeScript types to include new fields
   - ✅ Changed accept flow to mark invites as accepted (not delete them)
   - ✅ Frontend components already exist (`InviteUserModal`, `AcceptInvite`)

## ⏳ What Needs to Be Done

### Step 1: Deploy the Edge Function

The `invite_user` Edge Function exists in code but is **not deployed** to Supabase yet.

#### Prerequisites

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```
   This will open a browser window to authenticate.

3. **Link to Your Project**:
   ```bash
   supabase link --project-ref ohlscdojhsifvnnkoiqi
   ```
   You'll be prompted to enter your database password.

#### Deploy the Function

```bash
# Navigate to your project root
cd /Users/sherlock/Downloads/Sangha

# Deploy the invite_user function
supabase functions deploy invite_user

# Verify deployment
supabase functions list
```

**Expected Output**:
```
┌──────────────┬─────────┬─────────────────────┐
│ NAME         │ VERSION │ CREATED AT          │
├──────────────┼─────────┼─────────────────────┤
│ invite_user  │ 1       │ 2025-01-07 12:00:00 │
└──────────────┴─────────┴─────────────────────┘
```

### Step 2: Configure Email Service

You have **two options** for sending invitation emails:

#### Option A: SendGrid (Recommended for Production)

**Pros**:
- Professional email delivery
- High deliverability rates
- Detailed analytics
- Free tier: 100 emails/day

**Setup Steps**:

1. **Sign up for SendGrid**:
   - Go to https://sendgrid.com
   - Create a free account
   - Verify your email address

2. **Create API Key**:
   - Navigate to Settings → API Keys
   - Click "Create API Key"
   - Name it "Sangha Invitations"
   - Select "Full Access" or "Restricted Access" with Mail Send permissions
   - Copy the API key (you won't see it again!)

3. **Verify Sender Email**:
   - Navigate to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Enter your email (e.g., `noreply@yourdomain.com`)
   - Complete verification process

4. **Set Environment Variables in Supabase**:
   ```bash
   # Set SendGrid API key
   supabase secrets set SENDGRID_API_KEY=SG.your_api_key_here

   # Set sender email (must match verified sender)
   supabase secrets set INVITE_FROM_EMAIL=noreply@yourdomain.com

   # Set your app's base URL
   supabase secrets set APP_BASE_URL=https://your-app.vercel.app
   ```

   **Or via Supabase Dashboard**:
   - Go to Project Settings → Edge Functions → Secrets
   - Add each secret manually

5. **Test Email Sending**:
   - Try inviting a user from the Admin console
   - Check the recipient's inbox (and spam folder)
   - Verify the email contains the correct facility name and invitation link

#### Option B: Supabase Auth (Simpler, No External Service)

**Pros**:
- No external service needed
- Built into Supabase
- Automatic email delivery
- No API keys to manage

**Cons**:
- Less control over email content
- Uses Supabase's email templates
- Requires Supabase email configuration

**Setup Steps**:

1. **Configure Supabase Auth Email**:
   - Go to Supabase Dashboard → Authentication → Email Templates
   - Customize the "Invite User" template
   - Add your app's branding

2. **Update Edge Function** (Alternative Implementation):
   
   Replace the SendGrid code in `supabase/functions/invite_user/index.ts` with:

   ```typescript
   // Instead of SendGrid, use Supabase Auth
   const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
   const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

   const { data: authInvite, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
     targetEmail,
     {
       data: {
         tenant_id: tenantId,
         role: requestedRole,
         invited_by: authData.user.id,
       },
       redirectTo: `${appBaseUrl}/accept-invite?token=${token}`,
     }
   );

   if (authError) {
     return json({ error: "Failed to send invitation", details: authError.message }, 500);
   }

   return json({ message: "Invitation sent", invite });
   ```

3. **Redeploy the Function**:
   ```bash
   supabase functions deploy invite_user
   ```

### Step 3: Test the Complete Flow

1. **As Facility Admin**:
   - Navigate to Admin console
   - Select a facility (e.g., "Top of the World Ranch")
   - Click "Invite User"
   - Enter email, select role (ADMIN or MEMBER), set expiry
   - Click "Send Invitation"

2. **Verify Database**:
   ```sql
   SELECT * FROM invites 
   WHERE email = 'test@example.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   
   **Expected Fields**:
   - `id`: UUID
   - `tenant_id`: Facility UUID
   - `email`: Invited user's email
   - `role`: ADMIN or MEMBER
   - `token`: Secure random token
   - `invited_by`: Admin's user_id ✅
   - `created_at`: Timestamp
   - `expires_at`: 7 days from now
   - `accepted_at`: NULL (not accepted yet)
   - `status`: 'pending' ✅

3. **Check Email**:
   - Recipient should receive email
   - Email should contain facility name
   - Email should contain invitation link
   - Link format: `https://your-app.com/accept-invite?token=...`

4. **As Invited User**:
   - Click invitation link
   - Should see accept page with facility name and role
   - If not logged in, prompted to sign in
   - Click "Accept Invitation"
   - Should create `tenant_members` record
   - Should update `accepted_at` in `invites` table
   - Should redirect to dashboard

5. **Verify Acceptance**:
   ```sql
   -- Check invite was marked as accepted
   SELECT status, accepted_at FROM invites 
   WHERE email = 'test@example.com';
   -- Expected: status = 'accepted', accepted_at = timestamp

   -- Check tenant membership was created
   SELECT * FROM tenant_members 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');
   -- Expected: Record exists with correct tenant_id and role
   ```

### Step 4: Monitor and Debug

#### Check Edge Function Logs

```bash
# View real-time logs
supabase functions logs invite_user --follow

# View recent logs
supabase functions logs invite_user --limit 50
```

#### Common Issues

**Issue 1: "Edge Function not found" (404)**
- **Cause**: Function not deployed
- **Solution**: Run `supabase functions deploy invite_user`

**Issue 2: "Email sending not configured"**
- **Cause**: Missing `SENDGRID_API_KEY` environment variable
- **Solution**: Set the secret using `supabase secrets set`
- **Workaround**: UI will show a link to copy/paste manually

**Issue 3: "Failed to send email via SendGrid"**
- **Cause**: Invalid API key or unverified sender
- **Solution**: Verify API key and sender email in SendGrid dashboard

**Issue 4: "Forbidden: requires tenant OWNER or ADMIN"**
- **Cause**: User trying to invite is not an admin
- **Solution**: Check `tenant_members` table for user's role

**Issue 5: "Invalid or expired invitation"**
- **Cause**: Token is wrong or invitation expired
- **Solution**: Check `expires_at` in database, resend invitation

**Issue 6: "Must be logged in to accept invitation"**
- **Cause**: User not authenticated
- **Solution**: User needs to sign in first (UI handles this)

#### Database Queries for Debugging

```sql
-- List all pending invitations for a facility
SELECT 
  i.email,
  i.role,
  i.status,
  i.created_at,
  i.expires_at,
  u.email as invited_by_email
FROM invites i
LEFT JOIN auth.users u ON i.invited_by = u.id
WHERE i.tenant_id = 'your-tenant-id'
  AND i.status = 'pending'
ORDER BY i.created_at DESC;

-- List all accepted invitations
SELECT 
  i.email,
  i.role,
  i.accepted_at,
  u.email as invited_by_email,
  t.name as facility_name
FROM invites i
LEFT JOIN auth.users u ON i.invited_by = u.id
LEFT JOIN tenants t ON i.tenant_id = t.id
WHERE i.status = 'accepted'
ORDER BY i.accepted_at DESC;

-- Check if user is already a member
SELECT * FROM tenant_members 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')
  AND tenant_id = 'your-tenant-id';
```

## Security Checklist

- ✅ Tokens are cryptographically secure (48 bytes)
- ✅ Invitations expire after 7 days (configurable, max 30)
- ✅ Only tenant OWNER/ADMIN can send invitations
- ✅ Cannot invite as OWNER role (reserved)
- ✅ RLS policies enforce tenant isolation
- ✅ Audit trail: `invited_by` tracks who sent invitation
- ✅ Audit trail: `accepted_at` tracks when accepted
- ✅ Status automatically updates based on expiry

## Future Enhancements

- [ ] Resend invitation functionality
- [ ] Bulk invite (CSV upload)
- [ ] Invitation analytics dashboard
- [ ] Custom email templates
- [ ] Invitation reminders (3 days before expiry)
- [ ] Revoke invitation functionality
- [ ] Invitation history view in Admin console

## Troubleshooting Commands

```bash
# Check if function is deployed
supabase functions list

# View function logs
supabase functions logs invite_user

# Check environment variables
supabase secrets list

# Redeploy function
supabase functions deploy invite_user --no-verify-jwt

# Test function locally
supabase functions serve invite_user
```

## Support

If you encounter issues:
1. Check Edge Function logs
2. Verify environment variables are set
3. Test with a simple email first
4. Check spam folder for invitation emails
5. Verify RLS policies allow the operation
6. Check database for invite record creation

## Summary

**What's Working**:
- ✅ Database schema complete with tracking fields
- ✅ RLS policies configured correctly
- ✅ Frontend UI ready to use
- ✅ Edge Function code updated
- ✅ Accept flow preserves audit trail

**What You Need to Do**:
1. Deploy Edge Function (`supabase functions deploy invite_user`)
2. Configure email service (SendGrid or Supabase Auth)
3. Set environment variables
4. Test end-to-end flow
5. Monitor logs for issues

Once deployed, Facility Admins will be able to invite users via email, and the system will track who invited whom, when invitations were sent, and when they were accepted.

