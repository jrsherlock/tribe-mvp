import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Edit3, Upload } from 'lucide-react'
import { type Group, updateGroup } from '../../lib/services/groups'
import { uploadPhoto } from '../../lib/services/storage'
import toast from 'react-hot-toast'

interface GroupHeaderProps {
  group: Group
  isAdmin: boolean
  onUpdate: () => void
}

const GroupHeader: React.FC<GroupHeaderProps> = ({ group, isAdmin, onUpdate }) => {
  const [uploading, setUploading] = useState(false)
  const [editingCover, setEditingCover] = useState(false)

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    try {
      setUploading(true)
      
      // Upload to storage
      const path = `groups/${group.id}/cover/${Date.now()}-${file.name}`
      const publicUrl = await uploadPhoto(file, path)

      // Update group
      const { error } = await updateGroup(group.id, { cover_image_url: publicUrl })
      if (error) throw error

      toast.success('Cover image updated!')
      onUpdate()
    } catch (error) {
      console.error('Failed to upload cover image:', error)
      toast.error('Failed to upload cover image')
    } finally {
      setUploading(false)
      setEditingCover(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-500 to-accent rounded-3xl overflow-hidden shadow-xl relative"
      >
        {/* Cover Image */}
        <div className="relative h-48 md:h-64">
          {group.cover_image_url ? (
            <img
              src={group.cover_image_url}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center">
              <Users className="w-24 h-24 text-white/30" />
            </div>
          )}

          {/* Upload Cover Button (Admin Only) */}
          {isAdmin && (
            <div className="absolute top-4 right-4">
              <label
                htmlFor="cover-upload"
                className={`
                  flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white 
                  text-primary-800 rounded-xl font-medium cursor-pointer 
                  transition-all shadow-lg backdrop-blur-sm
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Change Cover</span>
                  </>
                )}
              </label>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Group Info */}
        <div className="p-6 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-primary-800 mb-2">
                {group.name}
              </h1>
              {group.description && (
                <p className="text-primary-600 text-lg">
                  {group.description}
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="ml-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-800 rounded-full text-sm font-semibold">
                  <Edit3 className="w-3 h-3" />
                  Admin
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default GroupHeader

