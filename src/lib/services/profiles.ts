import { supabase } from '../supabase'

export async function listProfilesByUserIds(userIds: string[]) {
  if (!userIds.length) return { data: [], error: null }
  return supabase.from('user_profiles').select('*').in('user_id', userIds)
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

