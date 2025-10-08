import { supabase } from '../supabase'
import { getCentralTimeToday } from '../utils/timezone'

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
  // Use Central Time to match Dashboard query logic and prevent timezone mismatches
  const today = getCentralTimeToday()
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

/**
 * Fetch check-ins shared with the user's groups, with user profile information
 * This is the proper way to fetch the group feed for a user
 */
export async function listGroupFeed(_userId: string, sinceIso?: string) {
  try {
    // Query daily_checkins directly. RLS will ensure we only see rows
    // that are shared with any groups the current user is a member of.
    let q = supabase
      .from('daily_checkins')
      .select(`
        id,
        user_id,
        tenant_id,
        checkin_date,
        mental_rating,
        emotional_rating,
        physical_rating,
        social_rating,
        spiritual_rating,
        mental_notes,
        emotional_notes,
        physical_notes,
        social_notes,
        spiritual_notes,
        mental_emojis,
        emotional_emojis,
        physical_emojis,
        social_emojis,
        spiritual_emojis,
        gratitude,
        is_private,
        mood_emoji,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (sinceIso) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(sinceIso)) {
        q = q.gte('checkin_date', sinceIso)
      } else {
        q = q.gte('created_at', sinceIso)
      }
    }

    const { data: rows, error } = await q
    if (error) throw error
    console.log('[listGroupFeed] fetched rows count:', rows?.length || 0)
    if (!rows || rows.length === 0) return { data: [], error: null }

    // Fetch profiles for authors
    const userIds = [...new Set((rows as Checkin[]).map((c) => c.user_id))]
    type UserProfileRow = { user_id: string; display_name: string | null; avatar_url: string | null; is_public: boolean | null }
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar_url, is_public')
      .in('user_id', userIds)

    if (profilesError) {
      console.warn('[listGroupFeed] Error fetching user profiles:', profilesError)
    }

    const profileMap = new Map((profiles as UserProfileRow[] | null ?? []).map((p) => [p.user_id, p]))
    const result = (rows as Checkin[]).map((checkin) => ({
      ...checkin,
      _id: checkin.id as string,
      user_profile: profileMap.get(checkin.user_id) || {
        user_id: checkin.user_id,
        display_name: 'Anonymous',
        avatar_url: '',
        is_public: false
      }
    }))

    return { data: result, error: null }
  } catch (error) {
    console.error('Error fetching group feed:', error)
    return { data: null, error }
  }
}

