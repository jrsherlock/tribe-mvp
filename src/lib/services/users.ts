import { supabase } from '../supabase'

export type UserProfile = {
  user_id: string
  email?: string
  display_name?: string
  avatar_url?: string
}

/**
 * Get user profiles for a list of user IDs
 * Useful for displaying user details in membership lists
 */
export async function getUserProfiles(userIds: string[]) {
  if (userIds.length === 0) return { data: [], error: null }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, avatar_url, email')
    .in('user_id', userIds)

  return { data, error }
}

/**
 * Get a single user profile by user ID
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, avatar_url, email')
    .eq('user_id', userId)
    .single()

  return { data, error }
}

/**
 * Search users by email or display name within a tenant
 * Useful for adding existing users to groups
 */
export async function searchUsers(query: string, tenantId?: string) {
  let queryBuilder = supabase
    .from('user_profiles')
    .select('user_id, display_name, email, avatar_url')
    .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20)

  if (tenantId) {
    queryBuilder = queryBuilder.eq('tenant_id', tenantId)
  }

  return queryBuilder
}

/**
 * Get all users in a tenant (via tenant_members)
 */
export async function getTenantUsers(tenantId: string) {
  const { data: memberships, error: memberError } = await supabase
    .from('tenant_members')
    .select('user_id, role')
    .eq('tenant_id', tenantId)

  if (memberError || !memberships) {
    return { data: [], error: memberError }
  }

  const userIds = memberships.map(m => m.user_id)
  if (userIds.length === 0) {
    return { data: [], error: null }
  }

  const { data: profiles, error: profileError } = await getUserProfiles(userIds)

  if (profileError) {
    return { data: [], error: profileError }
  }

  // Merge membership data with profile data
  const users = memberships.map(membership => {
    const profile = profiles?.find(p => p.user_id === membership.user_id)
    return {
      user_id: membership.user_id,
      role: membership.role,
      display_name: profile?.display_name || 'Unknown User',
      email: profile?.email || '',
      avatar_url: profile?.avatar_url || '',
    }
  })

  return { data: users, error: null }
}

