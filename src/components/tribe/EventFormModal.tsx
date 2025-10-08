import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Calendar, MapPin, Clock } from 'lucide-react'
import { createEvent, type EventLocationType } from '../../lib/services/events'
import toast from 'react-hot-toast'

interface EventFormModalProps {
  groupId: string
  onClose: () => void
  onSuccess: () => void
}

const EventFormModal: React.FC<EventFormModalProps> = ({ groupId, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location_type: 'virtual' as EventLocationType,
    location_details: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      toast.error('Event title is required')
      return
    }

    if (!formData.start_date || !formData.start_time) {
      toast.error('Start date and time are required')
      return
    }

    if (!formData.end_date || !formData.end_time) {
      toast.error('End date and time are required')
      return
    }

    // Combine date and time
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
    const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`)

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time')
      return
    }

    try {
      setSaving(true)

      const { error } = await createEvent({
        group_id: groupId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location_type: formData.location_type,
        location_details: formData.location_details.trim() || undefined,
      })

      if (error) throw error

      toast.success('Event created successfully!')
      onSuccess()
    } catch (error) {
      console.error('Failed to create event:', error)
      toast.error('Failed to create event')
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
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
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
            <Calendar className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Create Event</h2>
              <p className="text-white/90 text-sm">Schedule a new group activity</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g., Weekly Group Meeting"
              maxLength={200}
              required
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
              placeholder="Add event details..."
              rows={3}
            />
          </div>

          {/* Date and Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                End Time *
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>
          </div>

          {/* Location Type */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Location Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, location_type: 'virtual' })}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                  ${formData.location_type === 'virtual'
                    ? 'bg-accent-600 text-white shadow-lg'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  }
                `}
              >
                🌐 Virtual
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, location_type: 'physical' })}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                  ${formData.location_type === 'physical'
                    ? 'bg-accent-600 text-white shadow-lg'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  }
                `}
              >
                📍 In-Person
              </button>
            </div>
          </div>

          {/* Location Details */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              {formData.location_type === 'virtual' ? 'Meeting Link' : 'Address'}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
              <input
                type="text"
                value={formData.location_details}
                onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={
                  formData.location_type === 'virtual'
                    ? 'https://zoom.us/j/...'
                    : '123 Main St, City, State'
                }
              />
            </div>
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
              className="flex-1 px-4 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </span>
              ) : (
                'Create Event'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default EventFormModal

