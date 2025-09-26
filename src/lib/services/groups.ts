import { supabase } from '../supabase'

export type Group = {
  id: string
  tenant_id: string
  name: string
  description?: string | null
  created_at?: string
}

export type GroupMembership = {
  user_id: string
  group_id: string
  role: 'ADMIN' | 'MEMBER'
  created_at?: string
}

export async function listGroups(tenantId: string) {
  return supabase
    .from('groups')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
}

export async function createGroup(params: { tenant_id: string; name: string; description?: string }) {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      tenant_id: params.tenant_id,
      name: params.name,
      description: params.description ?? null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  return { data, error }
}

export async function deleteGroup(groupId: string) {
  return supabase.from('groups').delete().eq('id', groupId)
}

export async function listMembershipsByUser(userId: string) {
  return supabase.from('group_memberships').select('*').eq('user_id', userId)
}

export async function listGroupMembers(groupId: string) {
  return supabase.from('group_memberships').select('*').eq('group_id', groupId)
}

export async function adminAddUserToGroup(params: { group_id: string; user_id: string; role?: 'ADMIN' | 'MEMBER' }) {
  const { data, error } = await supabase
    .from('group_memberships')
    .insert({ group_id: params.group_id, user_id: params.user_id, role: params.role ?? 'MEMBER', created_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

export async function adminUpdateGroupMembershipRole(params: { group_id: string; user_id: string; role: 'ADMIN' | 'MEMBER' }) {
  return supabase.from('group_memberships')
    .update({ role: params.role })
    .eq('group_id', params.group_id)
    .eq('user_id', params.user_id)
}

export async function joinGroup(params: { group_id: string; user_id: string }) {
  const { data, error } = await supabase
    .from('group_memberships')
    .insert({ group_id: params.group_id, user_id: params.user_id, created_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

export async function leaveGroup(params: { group_id: string; user_id: string }) {
  return supabase.from('group_memberships').delete().eq('group_id', params.group_id).eq('user_id', params.user_id)
}

