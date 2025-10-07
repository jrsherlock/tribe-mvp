import { supabase } from '../supabase'
import { createClient } from '@supabase/supabase-js'

export type Invite = {
  id: string
  tenant_id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  token: string
  invited_by?: string
  created_at: string
  expires_at: string
  accepted_at?: string
  status?: 'pending' | 'accepted' | 'expired'
  group_id?: string // Optional group assignment
}

// Singleton admin client for invite operations
let adminClientInstance: ReturnType<typeof createClient> | null = null

function getAdminClient() {
  if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    )
  }

  return adminClientInstance
}

/**
 * Generate a secure random token for invitations
 */
function generateSecureToken(size = 48): string {
  const array = new Uint8Array(size)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Invite a user to join a tenant (and optionally a group)
 * Uses Supabase Admin API to send invitation emails
 */
export async function inviteUser(params: {
  email: string
  tenant_id: string
  role?: 'ADMIN' | 'MEMBER'
  expires_in_days?: number
  group_id?: string // Optional: auto-assign to group on acceptance
}) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  const adminClient = getAdminClient()
  if (!adminClient) {
    throw new Error('Admin privileges required. Please contact your system administrator.')
  }

  const targetEmail = params.email.trim().toLowerCase()
  const role = params.role || 'MEMBER'
  const expiresDays = Math.min(Math.max(params.expires_in_days || 7, 1), 30)

  // Verify caller has ADMIN or OWNER role in the tenant
  const { data: membership, error: membershipError } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', session.session.user.id)
    .eq('tenant_id', params.tenant_id)
    .maybeSingle()

  if (membershipError || !membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error('You must be a Facility Admin to invite users')
  }

  // Get tenant name for the invitation
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', params.tenant_id)
    .single()

  // Generate secure token
  const token = generateSecureToken(48)
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()

  // Create invite record in database
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .insert({
      tenant_id: params.tenant_id,
      email: targetEmail,
      role: role,
      token: token,
      expires_at: expiresAt,
      invited_by: session.session.user.id,
      group_id: params.group_id || null,
    })
    .select()
    .single()

  if (inviteError) {
    console.error('Failed to create invite:', inviteError)
    throw new Error('Failed to create invitation. Please try again.')
  }

  // Build the accept URL
  const appBaseUrl = window.location.origin
  const acceptUrl = `${appBaseUrl}/accept-invite?token=${encodeURIComponent(token)}`

  // Send invitation email using Supabase Admin API
  try {
    const { data: authInvite, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
      targetEmail,
      {
        data: {
          tenant_id: params.tenant_id,
          tenant_name: tenant?.name || 'The Tribe',
          role: role,
          invited_by: session.session.user.id,
          invite_token: token,
          group_id: params.group_id,
        },
        redirectTo: acceptUrl,
      }
    )

    if (authError) {
      console.error('Supabase Auth invite error:', authError)
      // Return the invite with manual link if email fails
      return {
        success: true,
        invite,
        accept_url: acceptUrl,
        email_sent: false,
        message: 'Invitation created but email sending failed. Share the link manually.',
      }
    }

    return {
      success: true,
      invite,
      auth_invite: authInvite,
      email_sent: true,
      message: 'Invitation sent successfully!',
    }
  } catch (error: any) {
    console.error('Error sending invitation email:', error)
    // Still return success with manual link
    return {
      success: true,
      invite,
      accept_url: acceptUrl,
      email_sent: false,
      message: 'Invitation created but email sending failed. Share the link manually.',
    }
  }
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
 * Enforces one-tenant-per-user rule
 * Optionally assigns user to a group if specified in the invite
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

  const userId = session.session.user.id

  // ONE-TENANT-PER-USER RULE: Check if user is already a member of a tenant
  const { data: existingMembership, error: checkError } = await supabase
    .from('tenant_members')
    .select('tenant_id, tenants(name)')
    .eq('user_id', userId)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    throw checkError
  }

  if (existingMembership) {
    const currentTenantName = (existingMembership.tenants as any)?.name || 'another facility'
    throw new Error(
      `You are already a member of "${currentTenantName}". ` +
      `Users can only belong to one facility at a time. ` +
      `Please contact your administrator if you need to switch facilities.`
    )
  }

  // Create tenant membership
  const { error: memberError } = await supabase
    .from('tenant_members')
    .insert({
      user_id: userId,
      tenant_id: invite.tenant_id,
      role: invite.role,
    })

  if (memberError) {
    // Handle database constraint violations with user-friendly messages
    if (memberError.code === '23505') {
      // Unique constraint violation
      throw new Error(
        'You are already a member of a facility. ' +
        'Users can only belong to one facility at a time.'
      )
    }
    throw memberError
  }

  // If invite includes a group assignment, add user to that group
  if (invite.group_id) {
    const { error: groupError } = await supabase
      .from('group_memberships')
      .insert({
        user_id: userId,
        group_id: invite.group_id,
        role: 'MEMBER', // Default to MEMBER role in group
      })

    if (groupError) {
      console.error('Failed to add user to group:', groupError)
      // Don't fail the entire invitation if group assignment fails
      // The user is still added to the tenant
    }
  }

  // Mark invite as accepted (keep for audit trail)
  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return invite
}

/**
 * Cancel/delete an invite
 */
export async function cancelInvite(inviteId: string) {
  return supabase.from('invites').delete().eq('id', inviteId)
}

