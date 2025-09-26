import { supabase } from '../supabase'

export async function listByCheckinIds(tenantId: string, checkinIds: string[]) {
  if (!checkinIds.length) return { data: [], error: null }

  // Filter out invalid UUIDs (like mock data) to prevent database errors
  const validUUIDs = checkinIds.filter(id => {
    // Basic UUID format check: 8-4-4-4-12 characters
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  })

  if (!validUUIDs.length) return { data: [], error: null }

  return supabase.from('feed_interactions').select('*').eq('tenant_id', tenantId).in('checkin_id', validUUIDs)
}

export async function addComment(params: { tenant_id: string | null, user_id: string, checkin_id: string, content: string }) {
  const now = new Date().toISOString()
  return supabase.from('feed_interactions').insert({
    tenant_id: params.tenant_id,
    user_id: params.user_id,
    checkin_id: params.checkin_id,
    interaction_type: 'comment',
    content: params.content,
    created_at: now,
    updated_at: now,
  }).select().single()
}

export async function addEmoji(params: { tenant_id: string | null, user_id: string, checkin_id: string, emoji: string }) {
  const now = new Date().toISOString()
  return supabase.from('feed_interactions').insert({
    tenant_id: params.tenant_id,
    user_id: params.user_id,
    checkin_id: params.checkin_id,
    interaction_type: 'emoji_reaction',
    emoji: params.emoji,
    created_at: now,
    updated_at: now,
  }).select().single()
}

