import { supabase } from '../supabase'

/**
 * Fetch user profiles by user IDs
 *
 * IMPORTANT: Each user has exactly ONE profile (enforced by unique constraint on user_id)
 * The profile's tenant_id field indicates if they're solo (null) or belong to a facility (uuid)
 *
 * @param userIds - Array of user IDs to fetch profiles for
 * @returns Supabase query result with user profiles
 */
export async function listProfilesByUserIds(userIds: string[]) {
  if (!userIds.length) {
    console.log('[listProfilesByUserIds] No user IDs provided')
    return { data: [], error: null }
  }

  console.log('[listProfilesByUserIds] Fetching profiles for user IDs:', userIds)

  const result = await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', userIds)

  console.log('[listProfilesByUserIds] Result:', {
    count: result.data?.length || 0,
    error: result.error,
    profiles: result.data?.map(p => ({ user_id: p.user_id, display_name: p.display_name }))
  })

  return result
}

export async function getOwnProfile(userId: string, tenantId: string | null) {
  // Try to find the tenant-specific profile first; if not found, fall back to tenant_id IS NULL
  if (tenantId) {
    const exact = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (exact.data && exact.data.length) return { data: exact.data[0], error: null }

    const fallback = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .is('tenant_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (fallback.data && fallback.data.length) return { data: fallback.data[0], error: null }
    return { data: null, error: exact.error || fallback.error }
  }

  // TenantId not set: prefer tenant_id IS NULL, else any latest profile for user
  const solo = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .is('tenant_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (solo.data && solo.data.length) return { data: solo.data[0], error: null }

  const any = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (any.data && any.data.length) return { data: any.data[0], error: null }
  return { data: null, error: solo.error || any.error }
}

export async function upsertOwnProfile(payload: any) {
  // expects payload.user_id present
  if (payload.id) return supabase.from('user_profiles').update(payload).eq('id', payload.id).select().single()
  return supabase.from('user_profiles').insert(payload).select().single()
}

