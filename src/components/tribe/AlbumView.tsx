import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, Trash2, X, Image as ImageIcon } from 'lucide-react'
import { listAlbumPhotos, uploadPhotoToAlbum, deletePhoto, type GroupPhotoAlbum, type GroupPhoto } from '../../lib/services/groupPhotos'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

interface AlbumViewProps {
  album: GroupPhotoAlbum
  groupId: string
  isAdmin: boolean
  onBack: () => void
}

const AlbumView: React.FC<AlbumViewProps> = ({ album, groupId, isAdmin, onBack }) => {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<GroupPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<GroupPhoto | null>(null)

  useEffect(() => {
    fetchPhotos()
  }, [album.id])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const { data, error } = await listAlbumPhotos(album.id)
      
      if (error) throw error
      setPhotos((data || []) as GroupPhoto[])
    } catch (error) {
      console.error('Failed to fetch photos:', error)
      toast.error('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    try {
      setUploading(true)
      
      const { error } = await uploadPhotoToAlbum({
        album_id: album.id,
        group_id: groupId,
        file,
      })

      if (error) throw error

      toast.success('Photo uploaded successfully!')
      fetchPhotos()
    } catch (error) {
      console.error('Failed to upload photo:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photoId: string, photoUserId: string) => {
    // Only allow deletion if user is admin or photo owner
    if (!isAdmin && photoUserId !== user?.userId) {
      toast.error('You can only delete your own photos')
      return
    }

    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const { error } = await deletePhoto(photoId)
      if (error) throw error

      toast.success('Photo deleted successfully')
      fetchPhotos()
      setSelectedPhoto(null)
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-primary-600">Loading photos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-primary-800">{album.title}</h2>
            {album.description && (
              <p className="text-primary-600 mt-1">{album.description}</p>
            )}
          </div>
        </div>

        <label
          htmlFor="photo-upload"
          className={`
            flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-600 
            text-white rounded-xl font-medium cursor-pointer transition-colors shadow-lg
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload Photo
            </>
          )}
        </label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </div>

      {/* Empty State */}
      {photos.length === 0 && (
        <div className="text-center py-12 bg-primary-50 rounded-2xl border-2 border-dashed border-primary-200">
          <ImageIcon className="w-12 h-12 text-primary-400 mx-auto mb-3" />
          <p className="text-primary-700 font-medium">No photos yet</p>
          <p className="text-sm text-primary-600 mt-1">
            Upload the first photo to this album!
          </p>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="aspect-square bg-primary-100 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow relative group cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || 'Group photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />

              {/* Delete Button (visible to photo owner and admins) */}
              {(isAdmin || photo.user_id === user?.userId) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo.id, photo.user_id)
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all hover:scale-110"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Caption Overlay */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="line-clamp-2">{photo.caption}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.photo_url}
              alt={selectedPhoto.caption || 'Group photo'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {selectedPhoto.caption && (
              <div className="bg-white rounded-b-lg p-4 mt-2">
                <p className="text-primary-800">{selectedPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AlbumView

