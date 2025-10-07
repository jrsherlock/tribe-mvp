import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Target, TrendingUp, Flame, Award, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { listUserGoals, deleteGoal, type UserGoal } from '../lib/services/goals'
import { useGoalStreak } from '../hooks/useGoalStreak'
import GoalCard from './GoalCard'
import AddGoalModal from './AddGoalModal'
import GoalTemplates from './GoalTemplates'
import GoalDetailModal from './GoalDetailModal'
import { Confetti } from './ui/Confetti'
import type { GoalTemplate } from '../lib/goalTemplates'

/**
 * ProgressOverview Component
 * Shows high-level stats about user's goals
 */
const ProgressOverview: React.FC<{ goals: UserGoal[] }> = ({ goals }) => {
  // Calculate active streaks (goals with current streak > 0)
  const activeStreaksCount = goals.filter(goal => {
    // We'll need to check each goal's streak - for now use a simple count
    return true // This will be refined with actual streak data
  }).length

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-accent/10 via-primary-50 to-accent/5 rounded-2xl p-6 mb-6 border-2 border-accent/20"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-primary-800">Your Progress Overview</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-primary-200">
          <div className="flex items-center justify-center mb-2">
            <Flame className="w-5 h-5 text-accent-600" />
          </div>
          <div className="text-3xl font-bold text-primary-800">{goals.length}</div>
          <div className="text-xs text-primary-600 mt-1">Active Goals</div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-primary-200">
          <div className="flex items-center justify-center mb-2">
            <Target className="w-5 h-5 text-accent-600" />
          </div>
          <div className="text-3xl font-bold text-primary-800">
            {goals.filter(g => g.frequency === 'daily').length}
          </div>
          <div className="text-xs text-primary-600 mt-1">Daily Goals</div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-primary-200 col-span-2 md:col-span-1">
          <div className="flex items-center justify-center mb-2">
            <Award className="w-5 h-5 text-accent-600" />
          </div>
          <div className="text-3xl font-bold text-primary-800">
            {goals.filter(g => g.is_public).length}
          </div>
          <div className="text-xs text-primary-600 mt-1">Shared Goals</div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * GoalsTab Component
 * Modern redesigned goals view with progress overview and better UX
 * Features integrated templates, cleaner layout, and celebration animations
 */
export const GoalsTab: React.FC = () => {
  const [goals, setGoals] = useState<UserGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Fetch goals on mount
  useEffect(() => {
    fetchGoals()
  }, [])

  // Fetch user's goals
  const fetchGoals = async () => {
    try {
      setLoading(true)
      const { data, error } = await listUserGoals()
      
      if (error) {
        throw error
      }

      setGoals((data as UserGoal[]) || [])
    } catch (error) {
      console.error('Failed to fetch goals:', error)
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }

  // Handle goal created
  const handleGoalCreated = () => {
    fetchGoals()
  }

  // Handle goal click - Open detail modal
  const handleGoalClick = (goal: UserGoal) => {
    setSelectedGoal(goal)
    setShowDetailModal(true)
  }

  // Handle goal updated
  const handleGoalUpdated = () => {
    fetchGoals()
  }

  // Handle goal deleted
  const handleGoalDeleted = () => {
    fetchGoals()
    setShowDetailModal(false)
    setSelectedGoal(null)
  }

  // Handle template selected - Open modal with pre-filled data
  const handleTemplateSelected = (template: GoalTemplate) => {
    setSelectedTemplate(template)
    setShowAddModal(true)
  }

  // Handle modal close - Clear template selection
  const handleModalClose = () => {
    setShowAddModal(false)
    setSelectedTemplate(null)
  }

  return (
    <div className="space-y-6">
      {/* Confetti Celebration */}
      <Confetti
        active={showConfetti}
        duration={3000}
        particleCount={60}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-800">My Goals Journey</h2>
            <p className="text-sm text-primary-600">Build streaks, celebrate progress</p>
          </div>
        </div>

        {/* Add Custom Goal Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus size={20} />
          <span>Add Goal</span>
        </motion.button>
      </div>

      {/* Progress Overview - Only show if user has goals */}
      {!loading && goals.length > 0 && (
        <ProgressOverview goals={goals} />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      )}

      {/* Empty State - Simplified */}
      {!loading && goals.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-accent/5 to-primary-50 rounded-3xl p-12 text-center border-2 border-dashed border-accent/30"
        >
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-accent-600" />
          </div>
          <h3 className="text-xl font-bold text-primary-800 mb-2">Start Your Journey</h3>
          <p className="text-primary-600 mb-6 max-w-md mx-auto">
            Choose a template below or create a custom goal to begin tracking your progress.
          </p>
        </motion.div>
      )}

      {/* Your Active Goals Section */}
      {!loading && goals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary-800">Your Active Goals</h3>
            <span className="text-sm text-primary-600">{goals.length} {goals.length === 1 ? 'goal' : 'goals'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GoalCard
                  goal={goal}
                  onClick={() => handleGoalClick(goal)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Goal Templates Section - Integrated */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent-600" />
          <h3 className="text-lg font-bold text-primary-800">
            {goals.length === 0 ? 'Get Started with Templates' : 'Add More Goals'}
          </h3>
        </div>
        <GoalTemplates
          onGoalAdded={fetchGoals}
          onTemplateSelected={handleTemplateSelected}
        />
      </div>

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onGoalCreated={handleGoalCreated}
        initialTitle={selectedTemplate?.title}
        initialDescription={selectedTemplate?.description}
        initialIsPublic={selectedTemplate?.is_public}
      />

      {/* Goal Detail Modal */}
      <GoalDetailModal
        goal={selectedGoal}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedGoal(null)
        }}
        onGoalUpdated={handleGoalUpdated}
        onGoalDeleted={handleGoalDeleted}
      />
    </div>
  )
}

export default GoalsTab

