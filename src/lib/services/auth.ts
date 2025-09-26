import { supabase } from '../supabase'

export async function getSession() {
  return supabase.auth.getSession()
}

export function onAuthChange(cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(cb)
}

export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, emailRedirectTo: window.location.origin })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

