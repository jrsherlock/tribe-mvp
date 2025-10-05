# Development User Impersonation Feature

## Overview

This feature allows developers to quickly log in as any existing user during development, bypassing normal authentication. This is extremely useful for testing different user roles, tenant configurations, and user-specific features.

## ⚠️ Security Notice

**CRITICAL:** This feature is **ONLY** available in development mode and is completely disabled in production builds.

- The component checks `import.meta.env.DEV` and returns `null` if not in development
- The service role key should **NEVER** be committed to version control
- The service role key should **NEVER** be used in production environments

## Features

### 1. User Account Selector
- Displays all existing users from the database
- Shows user-identifiable information (email, display name, tenant, role)
- Sorted alphabetically by display name
- Shows tenant membership and role for context

### 2. Two Authentication Modes

#### Mode 1: Magic Link (Default)
- Works without any additional configuration
- Sends a magic link to the selected user's email
- User must check email and click the link to complete sign-in
- Slower but requires no special permissions

#### Mode 2: Instant Impersonation (Recommended)
- Requires `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Instantly signs in as the selected user
- No email required
- Page automatically reloads with the new session
- Indicated by a green "Instant" badge in the UI

### 3. Complete Session Management
- When signing out, the session is completely destroyed
- User is automatically redirected to the landing page
- Can immediately select and log in as a different user

## Setup Instructions

### Basic Setup (Magic Link Mode)

No additional setup required! The feature works out of the box in development mode.

1. Start the development server: `npm run dev`
2. Navigate to the landing page
3. Look for the purple "DEV: User Impersonation" panel in the bottom-right corner
4. Select a user and click "Send Magic Link"
5. Check the user's email for the magic link

### Advanced Setup (Instant Impersonation Mode)

For instant impersonation without email verification:

1. **Get your Service Role Key:**
   - Go to your Supabase project dashboard
   - Navigate to: Settings > API
   - Copy the `service_role` key (NOT the `anon` key)

2. **Add to .env.local:**
   ```bash
   # Add this line to your .env.local file
   VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

4. **Verify it's working:**
   - The impersonation panel should now show a green "Instant" badge
   - The button text changes to "Instant Sign In"
   - Clicking it will immediately sign you in without email

## Usage

### Logging In as a User

1. **Open the landing page** in development mode
2. **Locate the impersonation panel** in the bottom-right corner
3. **Select a user** from the dropdown:
   - Users are listed with their display name and email
   - Tenant membership and role are shown if applicable
   - Solo users are marked as "Solo User"
4. **Click the sign-in button:**
   - With service key: Instant sign-in (page reloads)
   - Without service key: Magic link sent to email
5. **You're now logged in** as that user with full context

### Logging Out and Switching Users

1. **Sign out** using the normal sign-out button in the app
2. **You'll be redirected** to the landing page automatically
3. **The impersonation panel** will still be visible
4. **Select a different user** and sign in again

## Technical Details

### Files Created/Modified

#### New Files:
- `src/components/DevUserImpersonation.tsx` - Main impersonation component
- `src/lib/devAuth.ts` - Development authentication utilities
- `DEV_USER_IMPERSONATION.md` - This documentation

#### Modified Files:
- `src/components/Welcome.tsx` - Added DevUserImpersonation component
- `.env.example` - Added service role key documentation

### How It Works

#### Without Service Role Key:
1. Component fetches users from `user_profiles` table
2. User selects an account
3. Component calls `supabase.auth.signInWithOtp()` with the user's email
4. Supabase sends a magic link email
5. User clicks the link to complete authentication

#### With Service Role Key:
1. Component creates an admin client with service role key
2. Fetches all users using `admin.auth.admin.listUsers()`
3. User selects an account
4. Component calls `admin.auth.admin.generateLink()` to create a magic link
5. Extracts the token from the generated link
6. Calls `supabase.auth.verifyOtp()` to create a session
7. Page reloads with the new authenticated session

### Environment Variables

```bash
# Required (already in .env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional (for instant impersonation)
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Component Props

The `DevUserImpersonation` component takes no props and is self-contained.

### Styling

The component uses:
- Fixed positioning (bottom-right corner)
- Purple color scheme to distinguish it as a dev tool
- High z-index (50) to stay on top
- Responsive design (max-width on mobile)
- Tailwind CSS classes

## Testing Different Scenarios

### Test Solo Users
1. Select a user with no tenant membership
2. Verify they see only their own check-ins
3. Verify they don't see tenant/group features

### Test Tenant Members
1. Select a user with tenant membership
2. Verify they see their tenant's data
3. Verify role-based permissions work correctly

### Test Different Roles
1. **SuperUser:** Can create facilities, see all data
2. **Facility Admin (OWNER/ADMIN):** Can manage groups and users
3. **Group Admin:** Can manage group members
4. **Basic User (MEMBER):** Limited to viewing and creating own content

### Test Multi-Group Membership
1. Select a user in multiple groups
2. Verify they see check-ins from all their groups
3. Verify group switching works correctly

## Troubleshooting

### Panel Not Visible
- **Check:** Are you in development mode? (`npm run dev`)
- **Check:** Is `import.meta.env.DEV` true?
- **Solution:** Make sure you're not running a production build

### "Failed to load users" Error
- **Check:** Database connection
- **Check:** RLS policies allow reading user_profiles
- **Solution:** Check browser console for detailed error

### Magic Link Not Received
- **Check:** User's email address is correct
- **Check:** Supabase email settings are configured
- **Check:** Spam folder
- **Solution:** Use instant impersonation mode instead

### Instant Impersonation Not Working
- **Check:** Service role key is in `.env.local`
- **Check:** Development server was restarted after adding the key
- **Check:** Key is correct (starts with `eyJ...`)
- **Solution:** Verify the key in Supabase dashboard

### "Could not extract token" Error
- **Check:** Service role key is valid
- **Check:** User exists in auth.users
- **Solution:** Try magic link mode or check console for details

## Best Practices

1. **Never commit the service role key** to version control
2. **Add `.env.local` to `.gitignore`** (already done)
3. **Use instant mode for rapid testing** of different user contexts
4. **Test with various user types** (solo, tenant member, different roles)
5. **Sign out between tests** to ensure clean state
6. **Check the console** for any errors or warnings

## Future Enhancements

Potential improvements for this feature:

- [ ] Remember last selected user in localStorage
- [ ] Quick-switch between recently used accounts
- [ ] Filter users by tenant or role
- [ ] Search functionality for large user lists
- [ ] Keyboard shortcuts for common actions
- [ ] Display current impersonated user info
- [ ] One-click return to your own account
- [ ] Session duration indicator

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [RBAC Developer Guide](./RBAC_DEVELOPER_GUIDE.md)
- [Multi-tenancy Documentation](./migration-plan.md)

## Support

If you encounter issues with this feature:

1. Check this documentation
2. Review the browser console for errors
3. Verify your environment variables
4. Check Supabase dashboard for auth logs
5. Consult the team or create an issue

---

**Remember:** This is a development tool. It should never be accessible in production environments.

