import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { UserCircle, LogIn, AlertCircle, Zap, RefreshCw } from 'lucide-react'
import { clearAuthStorage } from '../hooks/useAuth'

interface UserAccount {
  id: string
  email: string
  display_name?: string
  platform_role?: string  // SuperUser, Facility Admin, Group Admin, Basic User
  is_superuser?: boolean
}

// Singleton admin client to prevent multiple instances
let adminClientInstance: SupabaseClient | null = null

function getAdminClient(): SupabaseClient | null {
  if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  if (!adminClientInstance) {
    console.log('[DevUserImpersonation] Creating admin client instance')
    adminClientInstance = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          // Use a completely different storage key to prevent conflicts
          storageKey: `sb-admin-${new URL(import.meta.env.VITE_SUPABASE_URL!).hostname.split('.')[0]}-token`,
        }
      }
    )
    console.log('[DevUserImpersonation] Admin client initialized with separate storage key')
  }

  return adminClientInstance
}

/**
 * Development-only component for quick user impersonation
 * Allows developers to log in as any existing user without authentication
 *
 * SECURITY: This component is ONLY rendered in development mode
 */
export const DevUserImpersonation: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasServiceKey, setHasServiceKey] = useState(false)

  // Only show in development
  const isDev = import.meta.env.DEV

  useEffect(() => {
    // Check if service role key is available
    setHasServiceKey(!!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
  }, [])

  useEffect(() => {
    if (!isDev) return

    async function fetchUsers() {
      try {
        setLoading(true)
        setError(null)

        // If we have service key, use admin API to get all users
        const adminClient = getAdminClient()
        if (adminClient) {
          const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
          if (authError) throw authError

          // Get profiles for display names - use admin client to bypass RLS
          const { data: profiles } = await adminClient
            .from('user_profiles')
            .select('user_id, display_name')

          const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || [])

          // Get superusers - use admin client to bypass RLS
          const { data: superusers } = await adminClient
            .from('superusers')
            .select('user_id')

          const superuserSet = new Set(superusers?.map(s => s.user_id) || [])

          // Get tenant memberships - use admin client to bypass RLS
          const { data: memberships } = await adminClient
            .from('tenant_members')
            .select(`
              user_id,
              role,
              tenants (
                name
              )
            `)

          const membershipMap = new Map(
            memberships?.map(m => [
              m.user_id,
              { tenant: (m as any).tenants?.name, role: m.role }
            ]) || []
          )

          // Helper function to determine platform role
          const getPlatformRole = (userId: string): string => {
            const isSuperuser = superuserSet.has(userId)
            const membership = membershipMap.get(userId)

            if (isSuperuser) {
              return 'SuperUser'
            }

            if (membership) {
              // Map tenant_members.role to platform role
              switch (membership.role) {
                case 'OWNER':
                  return 'Facility Admin (Owner)'
                case 'ADMIN':
                  return 'Facility Admin'
                case 'MEMBER':
                  return 'Basic User'
                default:
                  return 'Basic User'
              }
            }

            return 'Solo User'
          }

          const userList: UserAccount[] = authUsers.users.map(user => ({
            id: user.id,
            email: user.email || 'No email',
            display_name: profileMap.get(user.id) || user.email || 'No name',
            platform_role: getPlatformRole(user.id),
            is_superuser: superuserSet.has(user.id)
          }))

          setUsers(userList.sort((a, b) => a.display_name.localeCompare(b.display_name)))
        } else {
          // Fallback: Service key not available
          // Show a helpful message instead of trying to query (which will fail due to RLS)
          console.warn('[DevUserImpersonation] Service key not available - cannot list users when signed out')
          setError('Service key required. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local')
          setUsers([])
        }
      } catch (err) {
        console.error('Error fetching users:', err)
        setError('Failed to load users. Check console for details.')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [isDev])

  const handleResetAuth = () => {
    if (confirm('This will clear all authentication data and reload the page. Continue?')) {
      console.log('[DevUserImpersonation] Manual auth reset')
      clearAuthStorage()
      window.location.reload()
    }
  }

  const handleImpersonate = async () => {
    if (!selectedUserId) {
      setError('Please select a user')
      return
    }

    try {
      setImpersonating(true)
      setError(null)

      const selectedUser = users.find(u => u.id === selectedUserId)
      if (!selectedUser) {
        throw new Error('User not found')
      }

      // If we have service role key, use admin API for instant impersonation
      const adminClient = getAdminClient()
      if (adminClient) {
        console.log('[DevUserImpersonation] Starting impersonation for:', selectedUser.email)

        // Step 1: Generate a magic link for the user using admin API
        const { data, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: selectedUser.email,
        })

        if (linkError) throw linkError

        // Step 2: Extract the token from the action link
        if (data.properties?.action_link) {
          const url = new URL(data.properties.action_link)
          const token = url.searchParams.get('token')
          const type = url.searchParams.get('type')

          if (token) {
            console.log('[DevUserImpersonation] Token extracted, clearing existing session')

            // Step 3: Clear existing session BEFORE verifying new token
            // This prevents race conditions with auth state listeners
            clearAuthStorage()

            // Use a small delay to ensure storage is cleared before proceeding
            await new Promise(resolve => setTimeout(resolve, 100))

            console.log('[DevUserImpersonation] Verifying OTP to create new session')

            // Step 4: Verify the OTP to create a new session
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: type as any || 'magiclink',
            })

            if (verifyError) throw verifyError

            console.log('[DevUserImpersonation] Session created successfully, reloading page')

            // Step 5: Reload the page to initialize with the new session
            // Use a small delay to ensure the session is fully established
            await new Promise(resolve => setTimeout(resolve, 200))
            window.location.reload()
            return
          }
        }

        throw new Error('Could not extract token from magic link')
      } else {
        // Fallback: send magic link email
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: selectedUser.email,
          options: {
            emailRedirectTo: window.location.origin,
          }
        })

        if (signInError) throw signInError

        alert(
          `Magic link sent to ${selectedUser.email}\n\n` +
          `Check the email to complete sign-in.\n\n` +
          `💡 TIP: Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local for instant impersonation!`
        )
      }
    } catch (err) {
      console.error('Impersonation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to impersonate user')
    } finally {
      setImpersonating(false)
    }
  }

  // Don't render anything in production
  if (!isDev) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-purple-900 text-white rounded-lg shadow-2xl p-4 max-w-md border-2 border-purple-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <UserCircle size={20} className="text-purple-300" />
            <h3 className="font-bold text-sm">DEV: User Impersonation</h3>
          </div>
          {hasServiceKey && (
            <div className="flex items-center space-x-1 bg-green-500 bg-opacity-20 px-2 py-1 rounded">
              <Zap size={12} className="text-green-300" />
              <span className="text-xs text-green-300 font-medium">Instant</span>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded p-2 mb-3 flex items-start space-x-2">
          <AlertCircle size={16} className="text-yellow-300 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-100">
            Development only. Not visible in production.
          </p>
        </div>

        {/* Service Key Info */}
        {!hasServiceKey && !loading && (
          <div className="bg-blue-500 bg-opacity-20 border border-blue-500 rounded p-2 mb-3">
            <p className="text-xs text-blue-100">
              💡 Add <code className="bg-blue-900 px-1 rounded">VITE_SUPABASE_SERVICE_ROLE_KEY</code> to .env.local for instant impersonation
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
            <p className="text-xs mt-2 text-purple-200">Loading users...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded p-2 mb-3">
            <p className="text-xs text-red-100">{error}</p>
          </div>
        )}

        {/* User Selection */}
        {!loading && (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 text-purple-200">
                Select User Account
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-purple-800 border border-purple-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                disabled={impersonating}
              >
                <option value="">-- Choose a user --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.display_name} - {user.platform_role}
                  </option>
                ))}
              </select>
            </div>

            {/* Impersonate Button */}
            <button
              onClick={handleImpersonate}
              disabled={!selectedUserId || impersonating}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium text-sm flex items-center justify-center space-x-2 transition-colors"
            >
              {impersonating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{hasServiceKey ? 'Signing in...' : 'Sending magic link...'}</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>{hasServiceKey ? 'Instant Sign In' : 'Send Magic Link'}</span>
                </>
              )}
            </button>

            {/* User Count */}
            <p className="text-xs text-purple-300 mt-2 text-center">
              {users.length} user{users.length !== 1 ? 's' : ''} available
            </p>

            {/* Reset Auth Button */}
            <div className="mt-3 pt-3 border-t border-purple-700">
              <button
                onClick={handleResetAuth}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <RefreshCw size={14} />
                <span>Reset Auth (Clear Session)</span>
              </button>
              <p className="text-xs text-purple-300 mt-1 text-center">
                Use if stuck on loading screen
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

