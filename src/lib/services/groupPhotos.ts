import { supabase } from '../supabase'
import { uploadPhoto as uploadToStorage, deletePhotos as deleteFromStorage } from './storage'

export type GroupPhotoAlbum = {
  id: string
  group_id: string
  title: string
  description?: string | null
  cover_photo_url?: string | null
  created_by: string
  created_at?: string
  updated_at?: string
}

export type GroupPhoto = {
  id: string
  album_id: string
  user_id: string
  photo_url: string
  caption?: string | null
  created_at?: string
}

/**
 * List all albums for a specific group
 */
export async function listGroupAlbums(groupId: string) {
  return supabase
    .from('group_photo_albums')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
}

/**
 * Get a single album by ID
 */
export async function getAlbum(albumId: string) {
  return supabase
    .from('group_photo_albums')
    .select('*')
    .eq('id', albumId)
    .single()
}

/**
 * Create a new album
 */
export async function createAlbum(params: {
  group_id: string
  title: string
  description?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('group_photo_albums')
    .insert({
      group_id: params.group_id,
      title: params.title,
      description: params.description ?? null,
      created_by: session.session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Update an album
 */
export async function updateAlbum(
  albumId: string,
  updates: Partial<Pick<GroupPhotoAlbum, 'title' | 'description' | 'cover_photo_url'>>
) {
  return supabase
    .from('group_photo_albums')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', albumId)
    .select()
    .single()
}

/**
 * Delete an album (and all its photos)
 */
export async function deleteAlbum(albumId: string) {
  // First, get all photos in the album to delete from storage
  const { data: photos } = await supabase
    .from('group_photos')
    .select('photo_url')
    .eq('album_id', albumId)

  // Delete the album (cascade will delete photos from DB)
  const result = await supabase
    .from('group_photo_albums')
    .delete()
    .eq('id', albumId)

  // Delete photos from storage
  if (photos && photos.length > 0) {
    try {
      const paths = photos.map(p => {
        const url = new URL(p.photo_url)
        return url.pathname.split('/').slice(-1)[0] // Extract filename
      })
      await deleteFromStorage(paths)
    } catch (err) {
      console.error('Failed to delete photos from storage:', err)
    }
  }

  return result
}

/**
 * List all photos in an album
 */
export async function listAlbumPhotos(albumId: string) {
  return supabase
    .from('group_photos')
    .select('*')
    .eq('album_id', albumId)
    .order('created_at', { ascending: false })
}

/**
 * Upload a photo to an album
 */
export async function uploadPhotoToAlbum(params: {
  album_id: string
  group_id: string
  file: File
  caption?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  // Upload to Supabase Storage
  const path = `groups/${params.group_id}/${params.album_id}/${Date.now()}-${params.file.name}`
  const publicUrl = await uploadToStorage(params.file, path)

  // Insert photo record
  const { data, error } = await supabase
    .from('group_photos')
    .insert({
      album_id: params.album_id,
      user_id: session.session.user.id,
      photo_url: publicUrl,
      caption: params.caption ?? null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Update photo caption
 */
export async function updatePhotoCaption(photoId: string, caption: string) {
  return supabase
    .from('group_photos')
    .update({ caption })
    .eq('id', photoId)
    .select()
    .single()
}

/**
 * Delete a photo
 */
export async function deletePhoto(photoId: string) {
  // Get photo URL first
  const { data: photo } = await supabase
    .from('group_photos')
    .select('photo_url')
    .eq('id', photoId)
    .single()

  // Delete from database
  const result = await supabase
    .from('group_photos')
    .delete()
    .eq('id', photoId)

  // Delete from storage
  if (photo) {
    try {
      const url = new URL(photo.photo_url)
      const path = url.pathname.split('/').slice(-1)[0]
      await deleteFromStorage([path])
    } catch (err) {
      console.error('Failed to delete photo from storage:', err)
    }
  }

  return result
}

/**
 * Set album cover photo
 */
export async function setAlbumCover(albumId: string, photoUrl: string) {
  return supabase
    .from('group_photo_albums')
    .update({ cover_photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq('id', albumId)
    .select()
    .single()
}

