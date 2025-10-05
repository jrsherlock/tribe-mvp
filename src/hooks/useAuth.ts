
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface User {
  userId: string
  email?: string
  tenant_id?: string | null
}

// Utility to clear all auth-related storage
export function clearAuthStorage() {
  console.log('[useAuth] Clearing all auth storage...')
  try {
    // Clear Supabase auth tokens, but preserve admin client storage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      // Only clear main client storage, not admin client storage
      if ((key.startsWith('supabase.auth') || key.startsWith('sb-')) && !key.includes('admin')) {
        localStorage.removeItem(key)
        console.log('[useAuth] Removed:', key)
      }
    })
    console.log('[useAuth] Auth storage cleared (admin storage preserved)')
  } catch (err) {
    console.error('[useAuth] Error clearing storage:', err)
  }
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    let sessionTimeout: NodeJS.Timeout | null = null
    let profileFetchController: AbortController | null = null

    async function load() {
      console.log('[useAuth] Starting to load session...')
      try {
        // Add a reasonable timeout (3 seconds) with better error handling
        const sessionPromise = supabase.auth.getSession()

        const timeoutPromise = new Promise<never>((_, reject) => {
          sessionTimeout = setTimeout(() => {
            console.warn('[useAuth] getSession() timed out after 3s - treating as no session')
            reject(new Error('Session load timeout'))
          }, 3000)
        })

        let data, error
        try {
          const result = await Promise.race([sessionPromise, timeoutPromise])
          data = result.data
          error = result.error
          if (sessionTimeout) clearTimeout(sessionTimeout)
        } catch (timeoutError) {
          // Timeout occurred - treat as no session (don't clear storage, might be temporary)
          console.warn('[useAuth] Timeout - treating as no session')
          if (!ignore) {
            setUser(null)
            setIsAuthenticated(false)
            setLoading(false)
          }
          return
        }

        if (error) {
          console.error('[useAuth] Error getting session:', error)
          // Clear potentially corrupted session data
          clearAuthStorage()
          throw error
        }

        const s = data.session
        console.log('[useAuth] Session loaded:', s ? 'User found' : 'No user')

        if (!ignore) {
          if (s?.user) {
            console.log('[useAuth] Fetching user profile for tenant_id...')
            // Fetch tenant_id from user_profiles with abort controller
            let profile = null
            try {
              profileFetchController = new AbortController()
              const { data: profileData, error } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('user_id', s.user.id)
                .abortSignal(profileFetchController.signal)
                .single()

              if (error && error.message !== 'AbortError') {
                console.warn('[useAuth] Could not fetch user profile:', error.message)
              } else if (!error) {
                profile = profileData
                console.log('[useAuth] Profile loaded, tenant_id:', profile?.tenant_id)
              }
            } catch (err: any) {
              if (err.name !== 'AbortError') {
                console.warn('[useAuth] Profile fetch failed:', err)
              }
            }

            const u = {
              userId: s.user.id,
              email: s.user.email ?? undefined,
              tenant_id: profile?.tenant_id ?? null
            }
            console.log('[useAuth] Setting user:', u)
            setUser(u)
            setIsAuthenticated(true)
          } else {
            console.log('[useAuth] No session, setting user to null')
            setUser(null)
            setIsAuthenticated(false)
          }
          console.log('[useAuth] Setting loading to false')
          setLoading(false)
        }
      } catch (err) {
        console.error('[useAuth] Error loading auth session:', err)
        // Clear potentially corrupted session data
        clearAuthStorage()
        if (!ignore) {
          console.log('[useAuth] Setting loading to false after error')
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
        }
      }
    }

    load()

    // Debounce auth state changes to prevent rapid-fire updates
    let authChangeTimeout: NodeJS.Timeout | null = null
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      console.log('[useAuth] Auth state changed:', _e, session ? 'User present' : 'No user')

      // Clear any pending auth change processing
      if (authChangeTimeout) {
        clearTimeout(authChangeTimeout)
      }

      // Debounce to prevent race conditions during rapid auth changes
      authChangeTimeout = setTimeout(async () => {
        if (ignore) return

        try {
          if (session?.user) {
            // Fetch tenant_id from user_profiles - no timeout needed
            let profile = null
            try {
              const { data: profileData, error } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('user_id', session.user.id)
                .single()

              if (error) {
                console.warn('[useAuth] Could not fetch user profile on auth change:', error.message)
              } else {
                profile = profileData
              }
            } catch (err) {
              console.warn('[useAuth] Profile fetch failed on auth change:', err)
            }

            const u = {
              userId: session.user.id,
              email: session.user.email ?? undefined,
              tenant_id: profile?.tenant_id ?? null
            }
            setUser(u)
            setIsAuthenticated(true)
          } else {
            setUser(null)
            setIsAuthenticated(false)
          }
          setLoading(false)
        } catch (err) {
          console.error('[useAuth] Error in auth state change:', err)
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
        }
      }, 100) // 100ms debounce
    })

    return () => {
      console.log('[useAuth] Cleanup')
      ignore = true
      if (sessionTimeout) clearTimeout(sessionTimeout)
      if (authChangeTimeout) clearTimeout(authChangeTimeout)
      if (profileFetchController) profileFetchController.abort()
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email?: string) => {
    try {
      setLoading(true)
      const target = email ?? window.prompt('Enter your email for a magic link') ?? ''
      if (!target) throw new Error('Email is required')

      // Use the current origin for redirect, Supabase will handle the auth callback
      const { error } = await supabase.auth.signInWithOtp({
        email: target,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      })

      if (error) throw error

      // Keep loading=false so the Welcome screen remains responsive
      setLoading(false)
      alert('Check your email for the sign-in link.')
    } catch (error) {
      console.error('Sign in failed:', error)
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Clear all auth storage to ensure clean state
      clearAuthStorage()

      setUser(null)
      setIsAuthenticated(false)
      setLoading(false)
    } catch (error) {
      console.error('Sign out failed:', error)
      // Even if sign out fails, clear local storage
      clearAuthStorage()
      setUser(null)
      setIsAuthenticated(false)
      setLoading(false)
      throw error
    }
  }

  const resetAuth = async () => {
    console.log('[useAuth] Manual auth reset triggered')
    try {
      setLoading(true)
      // Sign out from Supabase
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[useAuth] Error during sign out:', err)
    }

    // Clear all storage regardless of sign out success
    clearAuthStorage()

    // Reset state
    setUser(null)
    setIsAuthenticated(false)
    setLoading(false)

    // Reload the page to get a fresh start
    window.location.reload()
  }

  return {
    user,
    isAuthenticated,
    loading,
    signIn,
    signOut,
    resetAuth, // Expose reset function for debugging
  }
}
