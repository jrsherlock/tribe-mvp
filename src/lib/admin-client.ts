/**
 * Admin Client - Supabase client with service role privileges
 * Used for SuperUser operations that bypass RLS policies
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Singleton admin client to prevent multiple instances
let adminClientInstance: SupabaseClient | null = null

/**
 * Get or create an admin Supabase client with service role privileges
 * Only works if VITE_SUPABASE_SERVICE_ROLE_KEY is set in environment
 * 
 * @returns SupabaseClient with service role key, or null if key not available
 */
export function getAdminClient(): SupabaseClient | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.warn('Service role key not available. Admin operations will not work.')
    return null
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return adminClientInstance
}

