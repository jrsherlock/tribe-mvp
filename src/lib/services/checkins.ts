import { supabase } from '../supabase'

export type Checkin = {
  id?: string
  user_id: string
  tenant_id: string | null
  checkin_date: string
  mental_rating: number
  emotional_rating: number
  physical_rating: number
  social_rating: number
  spiritual_rating: number
  mental_notes?: string
  emotional_notes?: string
  physical_notes?: string
  social_notes?: string
  spiritual_notes?: string
  mental_emojis?: string[]
  emotional_emojis?: string[]
  physical_emojis?: string[]
  social_emojis?: string[]
  spiritual_emojis?: string[]
  gratitude?: string[]
  is_private: boolean
  mood_emoji: string
  created_at?: string
  updated_at?: string
}

export async function getTodayForUser(userId: string, tenantId: string | null) {
  const today = new Date().toISOString().split('T')[0]
  let q = supabase.from('daily_checkins').select('*').eq('user_id', userId)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  else q = q.is('tenant_id', null)
  return q.gte('checkin_date', `${today}`).lte('checkin_date', `${today}`).limit(1)
}

export async function upsert(checkin: Checkin) {
  if (checkin.id) return supabase.from('daily_checkins').update(checkin).eq('id', checkin.id).select().single()
  return supabase.from('daily_checkins').insert(checkin).select().single()
}

export async function listTenantFeed(tenantId: string | null, sinceIso?: string) {
  let q = supabase.from('daily_checkins').select('*').eq('is_private', false).order('created_at', { ascending: false })
  if (tenantId) q = q.eq('tenant_id', tenantId); else q = q.is('tenant_id', null)
  if (sinceIso) q = q.gte('created_at', sinceIso)
  return q
}

