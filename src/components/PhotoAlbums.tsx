
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {Camera, Plus, Upload, Lock, Globe, Image, X, Edit3, Trash2, Eye} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../lib/tenant'
import { supabase } from '../lib/supabase'
import { listAlbums as svcListAlbums, listPhotos as svcListPhotos, createAlbum as svcCreateAlbum, updateAlbum as svcUpdateAlbum, deleteAlbum as svcDeleteAlbum } from '../lib/services/albums'
import { uploadPhoto, deletePhotos } from '../lib/services/storage'
import toast from 'react-hot-toast'

interface Album {
  _id?: string
  user_id: string
  title: string
  description: string
  cover_photo_url: string
  is_public: boolean
  photo_count: number
  created_at: string
  updated_at: string
}

interface Photo {
  _id?: string
  user_id: string
  album_id: string
  photo_url: string
  caption: string
  is_public: boolean
  file_size: number
  file_type: string
  created_at: string
}

interface PhotoAlbumsProps {
  isOwnProfile?: boolean
  userId?: string
}

const PhotoAlbums: React.FC<PhotoAlbumsProps> = ({ isOwnProfile = true, userId }) => {
  const { user } = useAuth()
  const { currentTenantId } = useTenant()
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    description: '',
    is_public: false
  })

  const targetUserId = userId || user?.userId

  useEffect(() => {
    fetchAlbums()
  }, [targetUserId])

  useEffect(() => {
    if (selectedAlbum) {
      fetchPhotos(selectedAlbum._id!)
    }
  }, [selectedAlbum])

  const fetchAlbums = async () => {
    if (!targetUserId) return

    try {
      setLoading(true)
      const { data: albumList, error } = await svcListAlbums({ user_id: targetUserId, tenant_id: currentTenantId || null, isOwnProfile })
      if (error) throw error
      setAlbums((albumList as any) || [])
    } catch (error) {
      console.error('Failed to fetch albums:', error)
      toast.error('Failed to load albums')
    } finally {
      setLoading(false)
    }
  }

  const fetchPhotos = async (albumId: string) => {
    try {
      const { data: photoList, error } = await svcListPhotos({ album_id: albumId, tenant_id: currentTenantId || null, isOwnProfile })
      if (error) throw error
      setPhotos((photoList as any) || [])
    } catch (error) {
      console.error('Failed to fetch photos:', error)
      toast.error('Failed to load photos')
    }
  }

  const createAlbum = async () => {
    if (!user || !newAlbum.title.trim()) return

    try {
      const albumData = {
        tenant_id: currentTenantId || null,
        user_id: user.userId,
        title: newAlbum.title.trim(),
        description: newAlbum.description.trim(),
        cover_photo_url: '',
        is_public: newAlbum.is_public,
        photo_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: created, error } = await svcCreateAlbum(albumData)
      if (error) throw error
      setAlbums(prev => [created as any, ...prev])
      setNewAlbum({ title: '', description: '', is_public: false })
      setShowCreateAlbum(false)
      toast.success('Album created successfully! 📸')
    } catch (error) {
      console.error('Failed to create album:', error)
      toast.error('Failed to create album')
    }
  }

  const uploadPhotos = async (files: File[], albumId: string) => {
    if (!user || !files.length) return

    try {
      setUploading(true)
      // Upload to Supabase Storage and insert records
      const inserted: any[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = `${currentTenantId || 'solo'}/${user.userId}/${albumId}/${Date.now()}-${i}-${file.name}`
        const publicUrl = await uploadPhoto(file, path)
        const { data: photoRow, error } = await supabase.from('album_photos').insert({
          tenant_id: currentTenantId || null,
          user_id: user.userId,
          album_id: albumId,
          photo_url: publicUrl,
          caption: '',
          is_public: selectedAlbum?.is_public || false,
          file_size: file.size,
          file_type: file.type,
          created_at: new Date().toISOString()
        }).select().single()
        if (error) throw error
        inserted.push(photoRow)
      }
      setPhotos(prev => [...inserted as any[], ...prev])

      // Update album photo count and cover photo if needed
      const updatedCount = (selectedAlbum?.photo_count || 0) + inserted.length
      const updateData: any = {
        photo_count: updatedCount,
        updated_at: new Date().toISOString()
      }

      if (!selectedAlbum?.cover_photo_url && inserted[0]) {
        updateData.cover_photo_url = (inserted[0] as any).photo_url
      }

      await svcUpdateAlbum(albumId, updateData)
      
      // Update local state
      setAlbums(prev => prev.map(album => 
        album._id === albumId 
          ? { ...album, ...updateData }
          : album
      ))

      if (selectedAlbum) {
        setSelectedAlbum(prev => prev ? { ...prev, ...updateData } : null)
      }

      toast.success(`${successfulUploads.length} photos uploaded successfully! 🎉`)
      setShowPhotoUpload(false)
    } catch (error) {
      console.error('Failed to upload photos:', error)
      toast.error('Failed to upload photos')
    } finally {
      setUploading(false)
    }
  }

  const deleteAlbum = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album? All photos will be removed.')) return

    try {
      // Delete all photos in the album
      const { data: albumPhotos, error } = await svcListPhotos({ album_id: albumId, tenant_id: currentTenantId || null, isOwnProfile: true })
      if (!error && albumPhotos && (albumPhotos as any[]).length > 0) {
        const paths = (albumPhotos as any[]).map(p => {
          try { return new URL(p.photo_url).pathname.split('/object/public/photos/')[1] } catch { return '' }
        }).filter(Boolean)
        if (paths.length) await deletePhotos(paths)
        for (const photo of albumPhotos as any[]) {
          if (photo.id || photo._id) {
            await supabase.from('album_photos').delete().eq('id', photo.id || photo._id)
          }
        }
      }

      // Delete the album
      await svcDeleteAlbum(albumId)
      setAlbums(prev => prev.filter(album => album._id !== albumId))
      
      if (selectedAlbum?._id === albumId) {
        setSelectedAlbum(null)
        setPhotos([])
      }

      toast.success('Album deleted successfully')
    } catch (error) {
      console.error('Failed to delete album:', error)
      toast.error('Failed to delete album')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-primary-800">
          {isOwnProfile ? 'My Photo Albums' : 'Photo Albums'}
        </h3>
        {isOwnProfile && (
          <button
            onClick={() => setShowCreateAlbum(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors"
          >
            <Plus size={16} />
            <span>New Album</span>
          </button>
        )}
      </div>

      {/* Albums Grid */}
      {!selectedAlbum ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <motion.div
              key={album._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary rounded-2xl overflow-hidden shadow-lg border border-primary-200 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setSelectedAlbum(album)}
            >
              <div className="aspect-square bg-primary-100 relative">
                {album.cover_photo_url ? (
                  <img 
                    src={album.cover_photo_url} 
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-12 h-12 text-primary-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {album.is_public ? (
                    <Globe size={16} className="text-white bg-black/50 rounded-full p-1" />
                  ) : (
                    <Lock size={16} className="text-white bg-black/50 rounded-full p-1" />
                  )}
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-primary-800 mb-1">{album.title}</h4>
                <p className="text-sm text-primary-600 mb-2">{album.description}</p>
                <div className="flex justify-between items-center text-xs text-primary-500">
                  <span>{album.photo_count} photos</span>
                  {isOwnProfile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteAlbum(album._id!)
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {albums.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Camera className="w-16 h-16 text-primary-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-primary-600 mb-2">
                {isOwnProfile ? 'No albums yet' : 'No public albums'}
              </h4>
              <p className="text-primary-500">
                {isOwnProfile ? 'Create your first album to start sharing memories' : 'This user hasn\'t shared any albums yet'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Album View */
        <div className="space-y-6">
          {/* Album Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-primary-600 hover:text-primary-800"
              >
                ← Back to Albums
              </button>
              <div>
                <h3 className="text-xl font-bold text-primary-800">{selectedAlbum.title}</h3>
                <p className="text-primary-600">{selectedAlbum.description}</p>
              </div>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors"
              >
                <Upload size={16} />
                <span>Add Photos</span>
              </button>
            )}
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <motion.div
                key={photo._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-square bg-primary-100 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <img 
                  src={photo.photo_url} 
                  alt={photo.caption}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                />
              </motion.div>
            ))}
          </div>

          {photos.length === 0 && (
            <div className="text-center py-12">
              <Image className="w-16 h-16 text-primary-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-primary-600 mb-2">No photos yet</h4>
              <p className="text-primary-500">
                {isOwnProfile ? 'Upload some photos to get started' : 'No photos in this album'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Album Modal */}
      <AnimatePresence>
        {showCreateAlbum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateAlbum(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-secondary rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-primary-800">Create New Album</h3>
                <button
                  onClick={() => setShowCreateAlbum(false)}
                  className="text-primary-500 hover:text-primary-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">Album Title</label>
                  <input
                    type="text"
                    value={newAlbum.title}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary"
                    placeholder="Enter album title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">Description</label>
                  <textarea
                    value={newAlbum.description}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent resize-none bg-secondary"
                    rows={3}
                    placeholder="Describe your album..."
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newAlbum.is_public}
                    onChange={(e) => setNewAlbum(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="w-4 h-4 text-accent focus:ring-accent border-primary-300 rounded"
                  />
                  <label htmlFor="isPublic" className="text-sm text-primary-700">
                    Make this album public
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={createAlbum}
                    disabled={!newAlbum.title.trim()}
                    className="flex-1 py-3 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Album
                  </button>
                  <button
                    onClick={() => setShowCreateAlbum(false)}
                    className="flex-1 py-3 bg-primary-200 text-primary-700 rounded-xl hover:bg-primary-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Upload Modal */}
      <AnimatePresence>
        {showPhotoUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPhotoUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-secondary rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-primary-800">Upload Photos</h3>
                <button
                  onClick={() => setShowPhotoUpload(false)}
                  className="text-primary-500 hover:text-primary-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-primary-300 rounded-xl p-8 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && selectedAlbum?._id) {
                        uploadPhotos(Array.from(e.target.files), selectedAlbum._id)
                      }
                    }}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                    <p className="text-primary-600 font-medium mb-2">Choose photos to upload</p>
                    <p className="text-sm text-primary-500">Select multiple images at once</p>
                  </label>
                </div>

                {uploading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-accent mx-auto mb-2"></div>
                    <p className="text-primary-600">Uploading photos...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PhotoAlbums
