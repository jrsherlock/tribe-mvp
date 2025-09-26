
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface User {
  userId: string
  email?: string
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function load() {
      const { data } = await supabase.auth.getSession()
      const s = data.session
      if (!ignore) {
        const u = s?.user ? { userId: s.user.id, email: s.user.email ?? undefined } : null
        setUser(u)
        setIsAuthenticated(!!u)
        setLoading(false)
      }
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ? { userId: session.user.id, email: session.user.email ?? undefined } : null
      setUser(u)
      setIsAuthenticated(!!u)
      setLoading(false)
    })
    return () => { ignore = true; sub.subscription.unsubscribe() }
  }, [])

  const signIn = async (email?: string) => {
    try {
      setLoading(true)
      const target = email ?? window.prompt('Enter your email for a magic link') ?? ''
      if (!target) throw new Error('Email is required')
      const { error } = await supabase.auth.signInWithOtp({ email: target, emailRedirectTo: window.location.origin })
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
      setLoading(false)
    } catch (error) {
      console.error('Sign out failed:', error)
      setLoading(false)
      throw error
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    signIn,
    signOut,
  }
}
