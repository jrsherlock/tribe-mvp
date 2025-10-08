import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Plus, ArrowLeft, Upload, Trash2, Camera } from 'lucide-react'
import { listGroupAlbums, createAlbum, deleteAlbum, type GroupPhotoAlbum } from '../../lib/services/groupPhotos'
import AlbumView from './AlbumView'
import CreateAlbumModal from './CreateAlbumModal'
import toast from 'react-hot-toast'

interface AlbumGalleryProps {
  groupId: string
  isAdmin: boolean
}

const AlbumGallery: React.FC<AlbumGalleryProps> = ({ groupId, isAdmin }) => {
  const [albums, setAlbums] = useState<GroupPhotoAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState<GroupPhotoAlbum | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchAlbums()
  }, [groupId])

  const fetchAlbums = async () => {
    try {
      setLoading(true)
      const { data, error } = await listGroupAlbums(groupId)
      
      if (error) throw error
      setAlbums((data || []) as GroupPhotoAlbum[])
    } catch (error) {
      console.error('Failed to fetch albums:', error)
      toast.error('Failed to load albums')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlbum = async (albumId: string, albumTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${albumTitle}"? This will delete all photos in the album.`)) {
      return
    }

    try {
      const { error } = await deleteAlbum(albumId)
      if (error) throw error

      toast.success('Album deleted successfully')
      fetchAlbums()
    } catch (error) {
      console.error('Failed to delete album:', error)
      toast.error('Failed to delete album')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-primary-600">Loading albums...</p>
        </div>
      </div>
    )
  }

  // If an album is selected, show AlbumView
  if (selectedAlbum) {
    return (
      <AlbumView
        album={selectedAlbum}
        groupId={groupId}
        isAdmin={isAdmin}
        onBack={() => {
          setSelectedAlbum(null)
          fetchAlbums()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary-800">Photo Albums</h2>
          <p className="text-primary-600 mt-1">Share memories with your group</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Create Album
        </button>
      </div>

      {/* Empty State */}
      {albums.length === 0 && (
        <div className="text-center py-12 bg-primary-50 rounded-2xl border-2 border-dashed border-primary-200">
          <Camera className="w-12 h-12 text-primary-400 mx-auto mb-3" />
          <p className="text-primary-700 font-medium">No albums yet</p>
          <p className="text-sm text-primary-600 mt-1">
            Create your first album to start sharing photos!
          </p>
        </div>
      )}

      {/* Albums Grid */}
      {albums.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album, index) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg border border-primary-200 cursor-pointer hover:shadow-xl transition-shadow group"
              onClick={() => setSelectedAlbum(album)}
            >
              {/* Album Cover */}
              <div className="aspect-square bg-primary-100 relative overflow-hidden">
                {album.cover_photo_url ? (
                  <img
                    src={album.cover_photo_url}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-12 h-12 text-primary-400" />
                  </div>
                )}

                {/* Delete Button (Admin Only) */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteAlbum(album.id, album.title)
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all hover:scale-110"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Album Info */}
              <div className="p-4">
                <h3 className="font-semibold text-primary-800 text-lg mb-1 line-clamp-1">
                  {album.title}
                </h3>
                {album.description && (
                  <p className="text-sm text-primary-600 line-clamp-2">
                    {album.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Album Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAlbumModal
            groupId={groupId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              fetchAlbums()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default AlbumGallery

