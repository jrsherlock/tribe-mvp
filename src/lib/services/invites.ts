import { supabase } from '../supabase'

export type Invite = {
  id: string
  tenant_id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  token: string
  created_at: string
  expires_at: string
}

/**
 * Invite a user to join a tenant
 * Calls the invite_user Edge Function
 */
export async function inviteUser(params: {
  email: string
  tenant_id: string
  role?: 'ADMIN' | 'MEMBER'
  expires_in_days?: number
}) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({
        email: params.email,
        tenant_id: params.tenant_id,
        role: params.role || 'MEMBER',
        expires_in_days: params.expires_in_days || 7,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to send invitation')
  }

  return response.json()
}

/**
 * Get pending invites for a tenant
 */
export async function listInvites(tenantId: string) {
  return supabase
    .from('invites')
    .select('*')
    .eq('tenant_id', tenantId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
}

/**
 * Verify an invite token
 */
export async function verifyInvite(token: string) {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  return { data, error }
}

/**
 * Accept an invite and create membership
 */
export async function acceptInvite(token: string) {
  const { data: invite, error: inviteError } = await verifyInvite(token)
  if (inviteError || !invite) {
    throw new Error('Invalid or expired invitation')
  }

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    throw new Error('Must be logged in to accept invitation')
  }

  // Create tenant membership
  const { error: memberError } = await supabase
    .from('tenant_members')
    .insert({
      user_id: session.session.user.id,
      tenant_id: invite.tenant_id,
      role: invite.role,
    })

  if (memberError) throw memberError

  // Delete the invite
  await supabase.from('invites').delete().eq('id', invite.id)

  return invite
}

/**
 * Cancel/delete an invite
 */
export async function cancelInvite(inviteId: string) {
  return supabase.from('invites').delete().eq('id', inviteId)
}

