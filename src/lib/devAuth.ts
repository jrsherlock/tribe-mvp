/**
 * Development-only authentication utilities
 * Provides user impersonation capabilities for testing
 * 
 * SECURITY WARNING: These functions should NEVER be available in production
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Creates an admin Supabase client with service role privileges
 * Only works if VITE_SUPABASE_SERVICE_ROLE_KEY is set in environment
 */
function getAdminClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'VITE_SUPABASE_SERVICE_ROLE_KEY not found. Add it to .env.local for instant impersonation.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Sign in as any user by their user ID (development only)
 * This bypasses normal authentication and creates a session for the specified user
 * 
 * @param userId - The UUID of the user to impersonate
 * @returns Promise that resolves when the session is created
 */
export async function devSignInAsUser(userId: string): Promise<void> {
  // Double-check we're in development
  if (!import.meta.env.DEV) {
    throw new Error('devSignInAsUser can only be used in development mode')
  }

  try {
    const adminClient = getAdminClient()

    // Generate an access token for the user
    // This uses the admin API to create a session without password
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: '', // We'll get the email from the user ID
    })

    if (error) {
      // If the above doesn't work, try a different approach
      // We'll create a custom token using the admin client
      console.warn('generateLink failed, trying alternative method:', error)
      
      // Alternative: Use the admin client to get user details and create a session
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
      
      if (userError || !userData.user) {
        throw new Error(`Failed to get user: ${userError?.message || 'User not found'}`)
      }

      // For Supabase, we need to use signInWithPassword or signInWithOtp
      // Since we're in dev mode, we can use a workaround:
      // 1. Get the user's email
      // 2. Use admin to update their email_confirmed_at if needed
      // 3. Generate a magic link
      
      const userEmail = userData.user.email
      if (!userEmail) {
        throw new Error('User has no email address')
      }

      // Generate a magic link for this user
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      })

      if (linkError) throw linkError

      // The magic link contains a token we can use
      // Extract the token from the URL and use it to create a session
      if (linkData.properties?.action_link) {
        const url = new URL(linkData.properties.action_link)
        const token = url.searchParams.get('token')
        
        if (token) {
          // Use the regular client to verify the OTP token
          const { createClient: createRegularClient } = await import('@supabase/supabase-js')
          const regularClient = createRegularClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          )
          
          const { error: verifyError } = await regularClient.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink',
          })
          
          if (verifyError) throw verifyError
          
          // Session should now be created
          return
        }
      }
      
      throw new Error('Could not extract token from magic link')
    }
  } catch (error) {
    console.error('Dev impersonation error:', error)
    throw error
  }
}

/**
 * Alternative approach: Sign in using email and a development bypass
 * This sends a magic link to the user's email
 * 
 * @param email - The email of the user to impersonate
 */
export async function devSignInWithEmail(email: string): Promise<void> {
  if (!import.meta.env.DEV) {
    throw new Error('devSignInWithEmail can only be used in development mode')
  }

  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    }
  })

  if (error) throw error
}

/**
 * Check if service role key is configured
 */
export function hasServiceRoleKey(): boolean {
  return !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
}

/**
 * Get all users from the database (admin only)
 * This requires service role key
 */
export async function devListAllUsers() {
  if (!import.meta.env.DEV) {
    throw new Error('devListAllUsers can only be used in development mode')
  }

  try {
    const adminClient = getAdminClient()
    
    // List all users using admin API
    const { data, error } = await adminClient.auth.admin.listUsers()
    
    if (error) throw error
    
    return data.users
  } catch (error) {
    console.error('Error listing users:', error)
    throw error
  }
}

