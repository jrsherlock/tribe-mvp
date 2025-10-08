import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Lock, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { createGoal, type GoalFrequency } from '../lib/services/goals'
import { useTenant } from '../lib/tenant'
import { Input } from './ui/Input'

/**
 * Props for the AddGoalModal component
 */
export interface AddGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onGoalCreated?: () => void
  initialTitle?: string
  initialDescription?: string
  initialIsPublic?: boolean
}

/**
 * AddGoalModal Component
 * Modal for creating a new personal goal
 * Uses framer-motion AnimatePresence for smooth entry/exit animations
 * Uses Shadcn/UI-style form elements
 * Provides user feedback via react-hot-toast
 */
export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  isOpen,
  onClose,
  onGoalCreated,
  initialTitle = '',
  initialDescription = '',
  initialIsPublic = false,
}) => {
  const { currentTenantId } = useTenant()
  const [saving, setSaving] = useState(false)

  // Form state - initialize with props if provided
  const [formData, setFormData] = useState({
    title: initialTitle,
    description: initialDescription,
    frequency: 'daily' as GoalFrequency,
    target_count: 1,
    is_public: initialIsPublic,
  })

  // Update form data when initial values change
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        title: initialTitle,
        description: initialDescription,
        frequency: 'daily',
        target_count: 1,
        is_public: initialIsPublic,
      })
    }
  }, [isOpen, initialTitle, initialDescription, initialIsPublic])

  // Generate goal_key from title
  const generateGoalKey = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Please enter a goal title')
      return
    }

    try {
      setSaving(true)
      
      const goalKey = generateGoalKey(formData.title)
      
      await createGoal({
        goal_key: goalKey,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        frequency: formData.frequency,
        target_count: formData.target_count,
        is_public: formData.is_public,
        tenant_id: currentTenantId || undefined,
      })

      toast.success('Goal created successfully! 🎯')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        frequency: 'daily',
        target_count: 1,
        is_public: false,
      })
      
      // Notify parent and close
      onGoalCreated?.()
      onClose()
    } catch (error) {
      console.error('Failed to create goal:', error)
      toast.error('Failed to create goal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (!saving) {
      setFormData({
        title: '',
        description: '',
        frequency: 'daily',
        target_count: 1,
        is_public: false,
      })
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-primary-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-primary-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-primary-800">Create New Goal</h2>
              </div>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="text-primary-500 hover:text-primary-700 transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <Input
                  label="Goal Title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Daily Meditation"
                  disabled={saving}
                  className="w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-primary-800 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this goal mean to you?"
                  disabled={saving}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-primary-200 rounded-lg font-body text-base text-primary-800 bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 placeholder:text-primary-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-primary-50"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-semibold text-primary-800 mb-2">
                  Check-in Frequency
                </label>
                <p className="text-sm text-primary-600 mb-3">
                  Choose how often you want to track progress. This cannot be changed after creation.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: 'daily' })}
                    disabled={saving}
                    className={`
                      flex flex-col items-start px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 border-2
                      ${formData.frequency === 'daily'
                        ? 'bg-accent-500 border-accent-500 text-white shadow-lg ring-2 ring-accent-500/30'
                        : 'bg-white border-primary-300 text-primary-700 hover:bg-accent-50 hover:border-accent-300'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <span className={`font-bold text-base ${formData.frequency === 'daily' ? 'text-white' : 'text-primary-700'}`}>
                      Daily
                    </span>
                    <span className={`text-xs mt-1 ${formData.frequency === 'daily' ? 'text-white/90' : 'text-primary-600'}`}>
                      Track progress every day
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: 'weekly' })}
                    disabled={saving}
                    className={`
                      flex flex-col items-start px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 border-2
                      ${formData.frequency === 'weekly'
                        ? 'bg-accent-500 border-accent-500 text-white shadow-lg ring-2 ring-accent-500/30'
                        : 'bg-white border-primary-300 text-primary-700 hover:bg-accent-50 hover:border-accent-300'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <span className={`font-bold text-base ${formData.frequency === 'weekly' ? 'text-white' : 'text-primary-700'}`}>
                      Weekly
                    </span>
                    <span className={`text-xs mt-1 ${formData.frequency === 'weekly' ? 'text-white/90' : 'text-primary-600'}`}>
                      Track progress once per week
                    </span>
                  </button>
                </div>
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-sm font-semibold text-primary-800 mb-2">
                  Privacy
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_public: false })}
                    disabled={saving}
                    className={`
                      flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 border-2
                      ${!formData.is_public
                        ? 'bg-accent-500 border-accent-500 text-white shadow-lg ring-2 ring-accent-500/30'
                        : 'bg-white border-primary-300 text-primary-700 hover:bg-accent-50 hover:border-accent-300'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Lock size={18} />
                    <span className="font-semibold">Private</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_public: true })}
                    disabled={saving}
                    className={`
                      flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 border-2
                      ${formData.is_public
                        ? 'bg-accent-500 border-accent-500 text-white shadow-lg ring-2 ring-accent-500/30'
                        : 'bg-white border-primary-300 text-primary-700 hover:bg-accent-50 hover:border-accent-300'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Globe size={18} />
                    <span className="font-semibold">Public</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-primary-100 text-primary-700 rounded-xl font-semibold hover:bg-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.title.trim()}
                  className="flex-1 px-4 py-3 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AddGoalModal

