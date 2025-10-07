# Invitation System Analysis & Implementation Plan

## Current State Analysis

### ✅ What's Already Built

1. **Frontend Components**
   - ✅ `InviteUserModal.tsx` - UI for sending invitations
   - ✅ `AcceptInvite.tsx` - Page for accepting invitations
   - ✅ Integration in `AdminTreeView.tsx` and `AdminDashboard.tsx`

2. **Backend Services**
   - ✅ `src/lib/services/invites.ts` - Client-side invitation functions
   - ✅ `supabase/functions/invite_user/index.ts` - Edge Function for creating invites
   - ✅ Database table `invites` exists

3. **Database Schema**
   - ✅ `invites` table with columns: `id`, `tenant_id`, `email`, `role`, `token`, `created_at`, `expires_at`
   - ⚠️ **MISSING**: `invited_by` column (not in current schema)
   - ⚠️ **MISSING**: `accepted_at` column (not in current schema)
   - ⚠️ **MISSING**: `status` computed column (not in current schema)

4. **Invitation Flow**
   - ✅ Admin clicks "Invite User" → Modal opens
   - ✅ Admin enters email, role, expiry → Calls Edge Function
   - ✅ Edge Function creates invite record with secure token
   - ⚠️ **ISSUE**: Edge Function is NOT deployed (empty functions list)
   - ⚠️ **ISSUE**: Email sending not configured (no SENDGRID_API_KEY)
   - ✅ Accept page exists at `/accept-invite?token=...`

### ❌ What's Broken / Missing

#### 1. **Edge Function Not Deployed**
**Problem**: The `invite_user` Edge Function exists in code but is NOT deployed to Supabase.

**Evidence**:
```bash
GET /v1/projects/ohlscdojhsifvnnkoiqi/functions
Response: []  # Empty array - no functions deployed
```

**Impact**: When admins try to invite users, the API call fails with 404.

**Solution**: Deploy the Edge Function using Supabase CLI.

#### 2. **Email Configuration Missing**
**Problem**: No email service configured for sending invitation emails.

**Current Code** (line 130 in `invite_user/index.ts`):
```typescript
if (!sendgridApiKey) {
  // If email is not configured yet, return the accept URL
  return json({
    message: "Invite created. Email sending not configured (missing SENDGRID_API_KEY).",
    invite,
    accept_url: acceptUrl,
  });
}
```

**Impact**: Invitations are created but emails are never sent. The UI shows a link to copy/paste manually.

**Options**:
1. **SendGrid** (current implementation) - Requires API key
2. **Supabase Auth Magic Links** - Built-in, no extra config
3. **Resend** - Modern alternative to SendGrid
4. **AWS SES** - Enterprise option

#### 3. **Database Schema Incomplete**
**Problem**: The `invites` table is missing key tracking columns.

**Current Schema**:
```sql
id UUID
tenant_id UUID
email TEXT
role TEXT (default: 'common_user')
token TEXT
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ (default: now() + 3 days)
```

**Missing Columns** (from `supabase-invites.sql`):
```sql
invited_by UUID REFERENCES auth.users(id)  -- Track who sent the invite
accepted_at TIMESTAMPTZ                     -- Track when accepted
status TEXT GENERATED ALWAYS AS (...)       -- Computed: pending/accepted/expired
```

**Impact**: Cannot track who sent invitations or when they were accepted.

#### 4. **Edge Function Missing `invited_by`**
**Problem**: The Edge Function doesn't set `invited_by` when creating invites.

**Current Code** (line 105-113):
```typescript
const { data: invite, error: inviteError } = await supabase
  .from("invites")
  .insert({
    tenant_id: tenantId,
    email: targetEmail,
    role: requestedRole,
    token,
    expires_at: expiresAt,
    // ❌ MISSING: invited_by: authData.user.id
  })
```

**Impact**: Even if we add the column, the Edge Function won't populate it.

#### 5. **Accept Flow Doesn't Update `accepted_at`**
**Problem**: The `acceptInvite` function deletes the invite instead of marking it accepted.

**Current Code** (`src/lib/services/invites.ts` line 102-103):
```typescript
// Delete the invite
await supabase.from('invites').delete().eq('id', invite.id)
```

**Better Approach**:
```typescript
// Mark invite as accepted (for audit trail)
await supabase.from('invites')
  .update({ accepted_at: new Date().toISOString() })
  .eq('id', invite.id)
```

**Impact**: No audit trail of accepted invitations.

---

## Recommended Solutions

### Option 1: Quick Fix (Use Supabase Auth Magic Links)

**Pros**:
- ✅ No external email service needed
- ✅ Built into Supabase
- ✅ Handles email delivery automatically
- ✅ Works with existing auth flow

**Cons**:
- ❌ Less control over email content
- ❌ Doesn't use custom invitation tracking
- ❌ User must verify email separately

**Implementation**:
1. Use `supabase.auth.admin.inviteUserByEmail()` instead of custom Edge Function
2. Store invitation metadata in `invites` table for tracking
3. Use Supabase's built-in email templates

### Option 2: Deploy Edge Function + Configure SendGrid (Recommended)

**Pros**:
- ✅ Full control over email content
- ✅ Custom invitation tracking
- ✅ Professional email delivery
- ✅ Audit trail of who invited whom

**Cons**:
- ❌ Requires SendGrid account (free tier available)
- ❌ Requires deploying Edge Function
- ❌ More configuration steps

**Implementation Steps**:
1. Fix database schema (add missing columns)
2. Update Edge Function to set `invited_by`
3. Deploy Edge Function to Supabase
4. Configure SendGrid API key
5. Set environment variables in Supabase dashboard

### Option 3: Hybrid Approach (Best of Both Worlds)

**Pros**:
- ✅ Use Supabase Auth for email delivery (no SendGrid needed)
- ✅ Keep custom invitation tracking
- ✅ Audit trail preserved
- ✅ Simpler configuration

**Cons**:
- ❌ Requires custom Edge Function
- ❌ More complex implementation

**Implementation**:
1. Fix database schema
2. Update Edge Function to use `supabase.auth.admin.inviteUserByEmail()`
3. Store invitation metadata in `invites` table
4. Deploy Edge Function

---

## Implementation Plan (Option 2 - Recommended)

### Phase 1: Fix Database Schema

**File**: `supabase/migrations/20251007000003_fix_invites_schema.sql`

```sql
-- Add missing columns to invites table
ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Update default role to match tenant_members
ALTER TABLE public.invites 
ALTER COLUMN role SET DEFAULT 'MEMBER';

-- Add status computed column
ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS status TEXT GENERATED ALWAYS AS (
  CASE
    WHEN accepted_at IS NOT NULL THEN 'accepted'
    WHEN NOW() > expires_at THEN 'expired'
    ELSE 'pending'
  END
) STORED;

-- Add index on invited_by for faster queries
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON public.invites(invited_by);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);
```

### Phase 2: Update Edge Function

**Changes to `supabase/functions/invite_user/index.ts`**:

1. Add `invited_by` to insert:
```typescript
const { data: invite, error: inviteError } = await supabase
  .from("invites")
  .insert({
    tenant_id: tenantId,
    email: targetEmail,
    role: requestedRole,
    token,
    expires_at: expiresAt,
    invited_by: authData.user.id,  // ✅ ADD THIS
  })
```

2. Return `invited_by` in response:
```typescript
.select("id, token, email, tenant_id, role, expires_at, created_at, invited_by")
```

### Phase 3: Deploy Edge Function

**Commands**:
```bash
# Login to Supabase CLI
supabase login

# Link to project
supabase link --project-ref ohlscdojhsifvnnkoiqi

# Deploy the function
supabase functions deploy invite_user

# Set environment variables
supabase secrets set SENDGRID_API_KEY=your_key_here
supabase secrets set INVITE_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set APP_BASE_URL=https://your-app.vercel.app
```

### Phase 4: Configure SendGrid

1. **Sign up for SendGrid**: https://sendgrid.com (free tier: 100 emails/day)
2. **Create API Key**: Settings → API Keys → Create API Key
3. **Verify Sender**: Settings → Sender Authentication → Verify Single Sender
4. **Set Environment Variables** in Supabase Dashboard:
   - Go to Project Settings → Edge Functions → Secrets
   - Add `SENDGRID_API_KEY`
   - Add `INVITE_FROM_EMAIL`
   - Add `APP_BASE_URL`

### Phase 5: Update Accept Flow

**File**: `src/lib/services/invites.ts`

**Change line 102-103 from**:
```typescript
// Delete the invite
await supabase.from('invites').delete().eq('id', invite.id)
```

**To**:
```typescript
// Mark invite as accepted (keep for audit trail)
await supabase.from('invites')
  .update({ accepted_at: new Date().toISOString() })
  .eq('id', invite.id)
```

### Phase 6: Update TypeScript Types

**File**: `src/lib/services/invites.ts`

**Update Invite type**:
```typescript
export type Invite = {
  id: string
  tenant_id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  token: string
  invited_by: string          // ✅ ADD
  created_at: string
  expires_at: string
  accepted_at?: string        // ✅ ADD
  status?: 'pending' | 'accepted' | 'expired'  // ✅ ADD
}
```

---

## Alternative: Supabase Auth Invitations (Simpler)

If you want to avoid SendGrid entirely, use Supabase's built-in invitation system:

### Implementation

**Update Edge Function** to use Supabase Auth:

```typescript
// Instead of SendGrid, use Supabase Auth
const { data: authInvite, error: authError } = await supabase.auth.admin.inviteUserByEmail(
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

**Pros**:
- No SendGrid needed
- Uses Supabase's email infrastructure
- Automatic email delivery

**Cons**:
- Less control over email template
- Requires Supabase email configuration (SMTP or built-in)

---

## Testing Checklist

After implementation:

- [ ] Admin can click "Invite User" in Admin Tree
- [ ] Modal opens with email/role/expiry fields
- [ ] Submitting creates invite record in database
- [ ] `invited_by` is set to current admin's user_id
- [ ] Email is sent to invited user (check spam folder)
- [ ] Email contains correct facility name and role
- [ ] Invitation link works: `/accept-invite?token=...`
- [ ] Accept page shows facility name and role
- [ ] Accepting creates `tenant_members` record
- [ ] `accepted_at` is set in invites table
- [ ] Status changes from 'pending' to 'accepted'
- [ ] Expired invitations show error message
- [ ] Invalid tokens show error message
- [ ] Audit trail: Can query who invited whom

---

## Security Considerations

✅ **Token Security**: 48-byte cryptographically secure random tokens  
✅ **Expiration**: Default 7 days, max 30 days  
✅ **RLS Policies**: Only tenant admins can create invites  
✅ **Role Restrictions**: Cannot invite as OWNER (reserved)  
✅ **Email Validation**: Emails are trimmed and lowercased  
✅ **Auth Required**: Must be authenticated to accept  
✅ **Tenant Isolation**: Invites scoped to specific tenant  

---

## Next Steps

**Immediate Actions**:
1. ✅ Fix database schema (add missing columns)
2. ✅ Update Edge Function (add `invited_by`)
3. ⏳ Deploy Edge Function to Supabase
4. ⏳ Configure email service (SendGrid or Supabase Auth)
5. ✅ Update accept flow (mark as accepted, don't delete)
6. ✅ Test end-to-end invitation flow

**Future Enhancements**:
- Resend invitation functionality
- Bulk invite (CSV upload)
- Invitation analytics dashboard
- Custom email templates
- Invitation reminders (3 days before expiry)
- Revoke invitation functionality

