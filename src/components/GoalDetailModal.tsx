import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Flame, Award, TrendingUp, Plus, Edit3, Trash2, Lock, Globe, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useGoalStreak } from '../hooks/useGoalStreak'
import { createGoalProgress, deleteGoal, updateGoal, type UserGoal } from '../lib/services/goals'
import { Confetti } from './ui/Confetti'

/**
 * Props for GoalDetailModal component
 */
export interface GoalDetailModalProps {
  goal: UserGoal | null
  isOpen: boolean
  onClose: () => void
  onGoalUpdated?: () => void
  onGoalDeleted?: () => void
}

/**
 * GoalDetailModal Component
 * Displays detailed information about a goal and allows logging progress
 */
export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goal,
  isOpen,
  onClose,
  onGoalUpdated,
  onGoalDeleted,
}) => {
  const [loggingProgress, setLoggingProgress] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [progressNote, setProgressNote] = useState('')
  const [showEditDescription, setShowEditDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
  const [updatingDescription, setUpdatingDescription] = useState(false)
  const [localGoal, setLocalGoal] = useState<UserGoal | null>(goal)
  const [showConfetti, setShowConfetti] = useState(false)

  const { currentStreak, bestStreak, totalDays, isActiveToday, loading, refetch } = useGoalStreak(localGoal?.id || null)

  // Update local goal when prop changes
  React.useEffect(() => {
    setLocalGoal(goal)
  }, [goal])

  if (!localGoal) return null

  // Get frequency label
  const getFrequencyLabel = () => {
    switch (localGoal.frequency) {
      case 'daily':
        return 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'monthly':
        return 'Monthly'
      default:
        return 'Daily'
    }
  }

  // Handle edit description
  const handleEditDescription = () => {
    setEditedDescription(localGoal?.description || '')
    setShowEditDescription(true)
  }

  const handleSaveDescription = async () => {
    if (!localGoal) return

    try {
      setUpdatingDescription(true)

      const trimmedDescription = editedDescription.trim()

      await updateGoal(localGoal.id, {
        description: trimmedDescription || undefined
      })

      // Update local state
      setLocalGoal({
        ...localGoal,
        description: trimmedDescription
      })

      toast.success('Goal description updated!')
      setShowEditDescription(false)
      onGoalUpdated?.()
    } catch (error) {
      console.error('Failed to update description:', error)
      toast.error('Failed to update description. Please try again.')
    } finally {
      setUpdatingDescription(false)
    }
  }

  const handleCancelEditDescription = () => {
    setShowEditDescription(false)
    setEditedDescription('')
  }

  // Handle log progress
  const handleLogProgress = async () => {
    if (!localGoal) return

    try {
      setLoggingProgress(true)

      // Store current streak before logging
      const previousStreak = currentStreak

      // Call with correct signature: goal_id as first param, options as second
      await createGoalProgress(localGoal.id, {
        note: progressNote.trim() || undefined
      })

      // Refresh streak data
      await refetch()

      // Check for milestone achievements and trigger confetti
      const newStreak = previousStreak + 1
      const milestones = [7, 14, 30, 60, 90, 180, 365]

      if (milestones.includes(newStreak)) {
        setShowConfetti(true)
        toast.success(`🎉 Amazing! ${newStreak} day streak! Keep it up!`, {
          duration: 5000,
          icon: '🔥',
        })
      } else {
        toast.success('Progress logged! 🎯')
      }

      // Reset note input
      setProgressNote('')
      setShowNoteInput(false)

      onGoalUpdated?.()
    } catch (error: unknown) {
      console.error('Failed to log progress:', error)

      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        toast.error('You already logged progress today!')
      } else {
        toast.error('Failed to log progress. Please try again.')
      }
    } finally {
      setLoggingProgress(false)
    }
  }

  // Handle delete goal
  const handleDeleteGoal = async () => {
    if (!localGoal) return

    try {
      setDeleting(true)

      await deleteGoal(localGoal.id)

      toast.success('Goal deleted successfully')

      onGoalDeleted?.()
      onClose()
    } catch (error) {
      console.error('Failed to delete goal:', error)
      toast.error('Failed to delete goal. Please try again.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
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
          onClick={onClose}
        >
          {/* Confetti Celebration */}
          <Confetti
            active={showConfetti}
            duration={3000}
            particleCount={80}
            onComplete={() => setShowConfetti(false)}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-primary-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-primary-200 p-6 rounded-t-2xl z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-primary-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-primary-800 break-words">{localGoal.title}</h2>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-sm text-primary-600">{getFrequencyLabel()} Goal</span>
                      <span className="text-sm text-primary-500">•</span>
                      <div className="flex items-center space-x-1">
                        {localGoal.is_public ? (
                          <>
                            <Globe className="w-3 h-3 text-primary-500" />
                            <span className="text-sm text-primary-600">Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-primary-500" />
                            <span className="text-sm text-primary-600">Private</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-primary-500 hover:text-primary-700 transition-colors ml-4 flex-shrink-0"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              {!showEditDescription ? (
                localGoal.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary-700 mb-2">Description</h3>
                    <p className="text-primary-600 leading-relaxed">{localGoal.description}</p>
                  </div>
                )
              ) : (
                <div>
                  <h3 className="text-sm font-semibold text-primary-700 mb-2">Edit Description</h3>
                  <div className="space-y-3">
                    {/* Read-only title */}
                    <div>
                      <label className="block text-xs font-medium text-primary-500 mb-1">
                        Goal Name (cannot be changed)
                      </label>
                      <input
                        type="text"
                        value={localGoal.title}
                        disabled
                        className="w-full px-4 py-2 border-2 border-primary-200 rounded-lg bg-primary-50 text-primary-400 cursor-not-allowed"
                      />
                    </div>

                    {/* Editable description */}
                    <div>
                      <label className="block text-xs font-medium text-primary-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder="Add a description for your goal (optional)"
                        maxLength={500}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-primary-200 rounded-lg font-body text-primary-600 bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 placeholder:text-primary-400 resize-none"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-primary-500">
                          {editedDescription.length}/500 characters
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSaveDescription}
                        disabled={updatingDescription}
                        className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg font-semibold hover:bg-accent-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingDescription ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEditDescription}
                        disabled={updatingDescription}
                        className="flex-1 px-4 py-2 bg-white text-primary-700 border-2 border-primary-300 rounded-lg font-semibold hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Streak Stats */}
              <div>
                <h3 className="text-sm font-semibold text-primary-700 mb-3">Your Progress</h3>
                <div className="grid grid-cols-3 gap-4">
                  {/* Current Streak */}
                  <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4 text-center border border-accent/20">
                    <Flame className="w-6 h-6 text-accent-600 mx-auto mb-2" />
                    {loading ? (
                      <div className="text-2xl font-bold text-primary-800">...</div>
                    ) : (
                      <div className="text-3xl font-bold text-primary-800">{currentStreak}</div>
                    )}
                    <div className="text-xs text-primary-600 mt-1">Current Streak</div>
                    {isActiveToday && currentStreak > 0 && (
                      <div className="text-xs text-accent-600 font-medium mt-1">🔥 Active!</div>
                    )}
                  </div>

                  {/* Best Streak */}
                  <div className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl p-4 text-center border border-primary-200">
                    <Award className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                    {loading ? (
                      <div className="text-2xl font-bold text-primary-800">...</div>
                    ) : (
                      <div className="text-3xl font-bold text-primary-800">{bestStreak}</div>
                    )}
                    <div className="text-xs text-primary-600 mt-1">Best Streak</div>
                  </div>

                  {/* Total Days */}
                  <div className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl p-4 text-center border border-primary-200">
                    <TrendingUp className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                    {loading ? (
                      <div className="text-2xl font-bold text-primary-800">...</div>
                    ) : (
                      <div className="text-3xl font-bold text-primary-800">{totalDays}</div>
                    )}
                    <div className="text-xs text-primary-600 mt-1">Total Days</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-semibold text-primary-700 mb-3">Log Progress</h3>

                {/* Show info if already logged today */}
                {isActiveToday && (
                  <div className="mb-3 bg-accent/10 border border-accent/30 rounded-lg p-3">
                    <p className="text-sm text-primary-700">
                      ✅ You've already logged progress today! Come back tomorrow to continue your streak.
                    </p>
                  </div>
                )}

                {/* Optional Note Input - Only show if not logged today */}
                {!isActiveToday && (
                  <div className="mb-3">
                    {!showNoteInput ? (
                      <button
                        onClick={() => setShowNoteInput(true)}
                        className="text-sm text-primary-600 hover:text-accent-600 transition-colors underline decoration-dotted"
                      >
                        + Add a note (optional)
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={progressNote}
                          onChange={(e) => setProgressNote(e.target.value)}
                          placeholder="Add a note about today's progress (optional)"
                          maxLength={1000}
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-primary-200 rounded-lg font-body text-primary-600 bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 placeholder:text-primary-400 resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-primary-500">
                            {progressNote.length}/1000 characters
                          </span>
                          <button
                            onClick={() => {
                              setShowNoteInput(false)
                              setProgressNote('')
                            }}
                            className="text-xs text-primary-600 hover:text-primary-800 transition-colors"
                          >
                            Remove note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {/* Log Progress Button */}
                  <button
                    onClick={handleLogProgress}
                    disabled={loggingProgress || isActiveToday}
                    className="flex-1 min-w-[200px] flex items-center justify-center space-x-2 px-6 py-3 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loggingProgress ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Logging...</span>
                      </>
                    ) : isActiveToday ? (
                      <>
                        <Calendar size={20} />
                        <span>Logged Today ✓</span>
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        <span>Log Progress</span>
                      </>
                    )}
                  </button>

                  {/* Edit Description Button */}
                  <button
                    onClick={handleEditDescription}
                    disabled={showEditDescription}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-100 text-primary-600 rounded-xl font-medium hover:bg-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit goal description"
                  >
                    <Edit3 size={20} />
                    <span>Edit Description</span>
                  </button>
                </div>
              </div>

              {/* Delete Section */}
              <div className="pt-4 border-t border-primary-200">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors text-sm"
                  >
                    <Trash2 size={16} />
                    <span>Delete Goal</span>
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800 mb-3">
                      Are you sure you want to delete this goal? This will also delete all progress history. This action cannot be undone.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleDeleteGoal}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 bg-white text-primary-700 border border-primary-300 rounded-lg font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-primary-200 text-xs text-primary-500">
                <p>Created {format(new Date(localGoal.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GoalDetailModal

