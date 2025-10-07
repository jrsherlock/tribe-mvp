import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Camera } from 'lucide-react'
import { createAlbum } from '../../lib/services/groupPhotos'
import toast from 'react-hot-toast'

interface CreateAlbumModalProps {
  groupId: string
  onClose: () => void
  onSuccess: () => void
}

const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ groupId, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Album title is required')
      return
    }

    try {
      setSaving(true)

      const { error } = await createAlbum({
        group_id: groupId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
      })

      if (error) throw error

      toast.success('Album created successfully!')
      onSuccess()
    } catch (error) {
      console.error('Failed to create album:', error)
      toast.error('Failed to create album')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-accent p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-primary-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Create Album</h2>
              <p className="text-white/90 text-sm">Start a new photo collection</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Album Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g., Summer Retreat 2025"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="Add a description for this album..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-primary-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 border border-primary-300 text-primary-700 hover:bg-primary-100 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-accent hover:bg-accent-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </span>
              ) : (
                'Create Album'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default CreateAlbumModal

