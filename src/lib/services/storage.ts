import { supabase } from '../supabase'

const BUCKET = 'photos'

export async function uploadPhoto(file: File, path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return pub.publicUrl
}

export async function deletePhotos(paths: string[]) {
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}

