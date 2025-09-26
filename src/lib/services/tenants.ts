import { supabase } from '../supabase'

export type Tenant = {
  id: string
  name: string
  slug: string
  created_at?: string
}

export type Membership = {
  user_id: string
  tenant_id: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  created_at?: string
}

export async function isSuperuser(userId: string) {
  const { data, error } = await supabase
    .from('superusers')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return { data: !!data, error }
}

export async function listTenants() {
  return supabase.from('tenants').select('*').order('created_at', { ascending: false })
}

export async function listMyTenants() {
  // Select tenants restricted by RLS
  return supabase.from('tenants').select('*').order('created_at', { ascending: false })
}

export async function createTenantRPC(params: { name: string; slug: string }) {
  return supabase.rpc('create_tenant', { p_name: params.name, p_slug: params.slug })
}

export async function updateTenant(tenantId: string, fields: Partial<Pick<Tenant, 'name' | 'slug'>>) {
  return supabase.from('tenants').update(fields).eq('id', tenantId)
}

export async function deleteTenant(tenantId: string) {
  return supabase.from('tenants').delete().eq('id', tenantId)
}

export async function listMembershipsByTenant(tenantId: string) {
  return supabase.from('memberships').select('*').eq('tenant_id', tenantId)
}

export async function upsertMembership(params: { user_id: string; tenant_id: string; role?: Membership['role'] }) {
  // Insert or update role for a user in a tenant
  const { data, error } = await supabase
    .from('memberships')
    .upsert({ user_id: params.user_id, tenant_id: params.tenant_id, role: params.role ?? 'MEMBER' })
    .select()
    .single()
  return { data, error }
}

export async function updateMembershipRole(params: { user_id: string; tenant_id: string; role: Membership['role'] }) {
  return supabase.from('memberships')
    .update({ role: params.role })
    .eq('user_id', params.user_id)
    .eq('tenant_id', params.tenant_id)
}

export async function deleteMembership(params: { user_id: string; tenant_id: string }) {
  return supabase.from('memberships')
    .delete()
    .eq('user_id', params.user_id)
    .eq('tenant_id', params.tenant_id)
}

