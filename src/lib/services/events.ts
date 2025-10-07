import { supabase } from '../supabase'

export type EventLocationType = 'virtual' | 'physical'
export type RsvpStatus = 'going' | 'not_going'

export type GroupEvent = {
  id: string
  group_id: string
  title: string
  description?: string | null
  start_time: string
  end_time: string
  location_type: EventLocationType
  location_details?: string | null
  event_image_url?: string | null
  created_by: string
  created_at?: string
  updated_at?: string
}

export type EventRsvp = {
  event_id: string
  user_id: string
  status: RsvpStatus
  created_at?: string
  updated_at?: string
}

export type EventWithRsvps = GroupEvent & {
  rsvp_count?: number
  user_rsvp?: RsvpStatus | null
}

/**
 * List all events for a specific group
 */
export async function listEventsByGroup(groupId: string) {
  return supabase
    .from('group_events')
    .select('*')
    .eq('group_id', groupId)
    .order('start_time', { ascending: true })
}

/**
 * Get a single event by ID
 */
export async function getEvent(eventId: string) {
  return supabase
    .from('group_events')
    .select('*')
    .eq('id', eventId)
    .single()
}

/**
 * Create a new event
 */
export async function createEvent(params: {
  group_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location_type: EventLocationType
  location_details?: string
  event_image_url?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('group_events')
    .insert({
      group_id: params.group_id,
      title: params.title,
      description: params.description ?? null,
      start_time: params.start_time,
      end_time: params.end_time,
      location_type: params.location_type,
      location_details: params.location_details ?? null,
      event_image_url: params.event_image_url ?? null,
      created_by: session.session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<Pick<GroupEvent, 'title' | 'description' | 'start_time' | 'end_time' | 'location_type' | 'location_details' | 'event_image_url'>>
) {
  return supabase
    .from('group_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single()
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string) {
  return supabase.from('group_events').delete().eq('id', eventId)
}

/**
 * Submit or update an RSVP for an event
 */
export async function submitRsvp(eventId: string, userId: string, status: RsvpStatus) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status: status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'event_id,user_id',
      }
    )
    .select()
    .single()

  return { data, error }
}

/**
 * Get RSVP status for a specific user and event
 */
export async function getUserRsvp(eventId: string, userId: string) {
  return supabase
    .from('event_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()
}

/**
 * List all RSVPs for an event
 */
export async function listEventRsvps(eventId: string) {
  return supabase
    .from('event_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
}

/**
 * Get RSVP counts for an event
 */
export async function getEventRsvpCounts(eventId: string) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', eventId)

  if (error) return { data: null, error }

  const counts = {
    going: data?.filter(r => r.status === 'going').length || 0,
    not_going: data?.filter(r => r.status === 'not_going').length || 0,
    total: data?.length || 0,
  }

  return { data: counts, error: null }
}

/**
 * Delete an RSVP
 */
export async function deleteRsvp(eventId: string, userId: string) {
  return supabase
    .from('event_rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)
}

/**
 * Get upcoming events for a group
 */
export async function getUpcomingEvents(groupId: string) {
  const now = new Date().toISOString()
  return supabase
    .from('group_events')
    .select('*')
    .eq('group_id', groupId)
    .gte('start_time', now)
    .order('start_time', { ascending: true })
}

/**
 * Get past events for a group
 */
export async function getPastEvents(groupId: string) {
  const now = new Date().toISOString()
  return supabase
    .from('group_events')
    .select('*')
    .eq('group_id', groupId)
    .lt('end_time', now)
    .order('start_time', { ascending: false })
}

