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
export async function listGroupFeed(userId: string, sinceIso?: string) {
  try {
    // Step 1: Get user's group memberships
    const { data: memberships, error: memError } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', userId)

    if (memError) throw memError
    if (!memberships || memberships.length === 0) {
      return { data: [], error: null }
    }

    const groupIds = memberships.map(m => m.group_id)

    // Step 2: Get check-ins shared with these groups
    let query = supabase
      .from('checkin_group_shares')
      .select(`
        checkin_id,
        group_id,
        daily_checkins!inner (
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
        )
      `)
      .in('group_id', groupIds)
      .eq('daily_checkins.is_private', false)
      .order('daily_checkins(created_at)', { ascending: false })

    if (sinceIso) {
      query = query.gte('daily_checkins.created_at', sinceIso)
    }

    const { data: shares, error: sharesError } = await query

    if (sharesError) throw sharesError
    if (!shares || shares.length === 0) {
      return { data: [], error: null }
    }

    // Step 3: Extract check-ins and get unique user IDs
    const checkins = shares.map((share: any) => ({
      ...share.daily_checkins,
      _id: share.daily_checkins.id
    }))

    // Remove duplicates (same checkin shared to multiple groups user is in)
    const uniqueCheckins = Array.from(
      new Map(checkins.map(c => [c.id, c])).values()
    )

    // Step 4: Fetch user profiles for all check-in authors
    const userIds = [...new Set(uniqueCheckins.map(c => c.user_id))]
    console.log('[listGroupFeed] Fetching profiles for user IDs:', userIds)

    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar_url, is_public')
      .in('user_id', userIds)

    console.log('[listGroupFeed] Profiles fetched:', {
      count: profiles?.length || 0,
      error: profilesError,
      profiles: profiles?.map(p => ({ user_id: p.user_id, display_name: p.display_name }))
    })

    if (profilesError) {
      console.warn('[listGroupFeed] Error fetching user profiles:', profilesError)
      // Continue without profiles rather than failing completely
    }

    // Step 5: Attach profiles to check-ins
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])
    const checkinsWithProfiles = uniqueCheckins.map(checkin => ({
      ...checkin,
      user_profile: profileMap.get(checkin.user_id) || {
        user_id: checkin.user_id,
        display_name: 'Anonymous',
        avatar_url: '',
        is_public: false
      }
    }))

    return { data: checkinsWithProfiles, error: null }
  } catch (error) {
    console.error('Error fetching group feed:', error)
    return { data: null, error }
  }
}

