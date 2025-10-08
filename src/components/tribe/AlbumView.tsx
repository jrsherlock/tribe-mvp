import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, Trash2, Image as ImageIcon, Star } from 'lucide-react'
import { listAlbumPhotos, uploadPhotoToAlbum, deletePhoto, setAlbumCover, type GroupPhotoAlbum, type GroupPhoto } from '../../lib/services/groupPhotos'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import ImageLightbox from '../ImageLightbox'

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [localAlbum, setLocalAlbum] = useState<GroupPhotoAlbum>(album)

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
      setLightboxOpen(false)
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  const handleDeletePhotoByIndex = async (index: number) => {
    const photo = photos[index]
    if (!photo) return
    await handleDelete(photo.id, photo.user_id)
  }

  const handleSetAlbumCover = async (index: number) => {
    if (!isAdmin) {
      toast.error('Only group admins can set the album cover')
      return
    }

    const photo = photos[index]
    if (!photo) return

    try {
      const { error } = await setAlbumCover(album.id, photo.photo_url)
      if (error) throw error

      // Update local album state
      setLocalAlbum(prev => ({ ...prev, cover_photo_url: photo.photo_url }))

      toast.success('Album cover updated! ⭐')
    } catch (error) {
      console.error('Failed to set album cover:', error)
      toast.error('Failed to set album cover')
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
            flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700
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
              onClick={() => {
                setLightboxIndex(index)
                setLightboxOpen(true)
              }}
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || 'Group photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />

              {/* Cover Photo Badge */}
              {localAlbum.cover_photo_url === photo.photo_url && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-lg">
                  <Star className="w-3 h-3 fill-current" />
                  Cover
                </div>
              )}

              {/* Delete Button (visible to photo owner and admins) */}
              {(isAdmin || photo.user_id === user?.userId) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo.id, photo.user_id)
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
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

      {/* Image Lightbox */}
      <ImageLightbox
        images={photos.map(photo => ({
          src: photo.photo_url,
          alt: photo.caption || 'Group photo',
          caption: photo.caption || undefined
        }))}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
        onDelete={(isAdmin || photos[lightboxIndex]?.user_id === user?.userId) ? handleDeletePhotoByIndex : undefined}
        canDelete={isAdmin || photos[lightboxIndex]?.user_id === user?.userId}
        onSetCover={isAdmin ? handleSetAlbumCover : undefined}
        canSetCover={isAdmin}
      />
    </div>
  )
}

export default AlbumView

