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

// Facility-specific album functions
export async function listFacilityAlbums(tenantId: string) {
  return supabase
    .from('photo_albums')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('user_id', null) // Facility albums have no user_id
    .order('created_at', { ascending: false })
}

export async function createFacilityAlbum(payload: any) {
  return supabase.from('photo_albums').insert({ ...payload, user_id: null }).select().single()
}

// Cover photo management functions

/**
 * Set a photo as the cover photo for an album
 * This will automatically unset any other cover photos in the same album
 */
export async function setCoverPhoto(photoId: string, albumId: string) {
  return supabase
    .from('album_photos')
    .update({ is_cover_photo: true })
    .eq('id', photoId)
    .eq('album_id', albumId)
}

/**
 * Get the cover photo for an album
 */
export async function getCoverPhoto(albumId: string) {
  return supabase
    .from('album_photos')
    .select('*')
    .eq('album_id', albumId)
    .eq('is_cover_photo', true)
    .single()
}

/**
 * Unset the cover photo for an album
 */
export async function unsetCoverPhoto(photoId: string) {
  return supabase
    .from('album_photos')
    .update({ is_cover_photo: false })
    .eq('id', photoId)
}

/**
 * Delete a single photo from an album
 * This will delete the photo record from the database
 * Note: Storage deletion should be handled separately using deletePhotos from storage.ts
 */
export async function deletePhoto(photoId: string) {
  return supabase
    .from('album_photos')
    .delete()
    .eq('id', photoId)
}
