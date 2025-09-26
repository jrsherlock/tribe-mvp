import { supabase } from '../supabase'

export async function listAlbums(filter: { user_id: string, tenant_id: string | null, isOwnProfile: boolean }) {
  let q = supabase.from('photo_albums').select('*').eq('user_id', filter.user_id)
  if (filter.tenant_id) q = q.eq('tenant_id', filter.tenant_id); else q = q.is('tenant_id', null)
  if (!filter.isOwnProfile) q = q.eq('is_public', true)
  return q.order('created_at', { ascending: false })
}

export async function listPhotos(filter: { album_id: string, tenant_id: string | null, isOwnProfile: boolean }) {
  let q = supabase.from('album_photos').select('*').eq('album_id', filter.album_id)
  if (filter.tenant_id) q = q.eq('tenant_id', filter.tenant_id); else q = q.is('tenant_id', null)
  if (!filter.isOwnProfile) q = q.eq('is_public', true)
  return q.order('created_at', { ascending: false })
}

export async function createAlbum(payload: any) {
  return supabase.from('photo_albums').insert(payload).select().single()
}

export async function updateAlbum(id: string, payload: any) {
  return supabase.from('photo_albums').update(payload).eq('id', id)
}

export async function deleteAlbum(id: string) {
  return supabase.from('photo_albums').delete().eq('id', id)
}

