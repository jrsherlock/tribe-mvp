import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing')
  throw new Error('Missing required Supabase environment variables')
}

// Singleton pattern to prevent multiple client instances
let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    console.log('[Supabase] Creating new client instance')
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        // Use a unique storage key to prevent conflicts with admin client
        storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
        flowType: 'pkce', // Use PKCE flow for better security
      },
      global: {
        headers: {
          'X-Client-Info': 'tribe-web-app',
        },
      },
    })
    console.log('[Supabase] Client initialized with storage key:', `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`)
  }
  return supabaseInstance
}

export const supabase = getSupabaseClient()

