import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Save, X, Calendar, Users as UsersIcon } from 'lucide-react'
import { type Group, updateGroup } from '../../lib/services/groups'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface GroupProfileProps {
  group: Group
  isAdmin: boolean
  onUpdate: () => void
}

const GroupProfile: React.FC<GroupProfileProps> = ({ group, isAdmin, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || '',
  })

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Group name is required')
      return
    }

    try {
      setSaving(true)
      const { error } = await updateGroup(group.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      })

      if (error) throw error

      toast.success('Group updated successfully!')
      setEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to update group:', error)
      toast.error('Failed to update group')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: group.name,
      description: group.description || '',
    })
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Edit Controls (Admin Only) */}
      {isAdmin && !editing && (
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-600 text-white rounded-xl font-medium transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Group
          </button>
        </div>
      )}

      {/* Group Details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary-50 rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-primary-800 mb-4">Group Information</h2>

        {editing ? (
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter group name"
                maxLength={100}
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Enter group description"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-primary-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-primary-300 text-primary-700 hover:bg-primary-100 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Name Display */}
            <div>
              <h3 className="text-sm font-medium text-primary-600 mb-1">Name</h3>
              <p className="text-lg font-semibold text-primary-800">{group.name}</p>
            </div>

            {/* Description Display */}
            <div>
              <h3 className="text-sm font-medium text-primary-600 mb-1">Description</h3>
              <p className="text-primary-700">
                {group.description || 'No description provided'}
              </p>
            </div>

            {/* Created Date */}
            {group.created_at && (
              <div>
                <h3 className="text-sm font-medium text-primary-600 mb-1">Created</h3>
                <div className="flex items-center gap-2 text-primary-700">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(group.created_at), 'MMMM d, yyyy')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* About Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-primary-50 rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-primary-800 mb-4">About This Group</h2>
        <div className="space-y-3 text-primary-700">
          <p className="flex items-start gap-2">
            <UsersIcon className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <span>
              This is a community space for group members to connect, share experiences, 
              and support each other on their recovery journey.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <span>
              Use the Events tab to stay updated on group activities and meetings.
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default GroupProfile

