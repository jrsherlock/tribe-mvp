import React from 'react'
import { motion } from 'framer-motion'
import { Target, Lock, Globe, CheckCircle2, Circle } from 'lucide-react'
import { useGoalStreak } from '../hooks/useGoalStreak'
import { CircularProgress } from './ui/CircularProgress'
import type { UserGoal } from '../lib/services/goals'

/**
 * Props for the GoalCard component
 */
export interface GoalCardProps {
  goal: UserGoal
  onClick?: () => void
  className?: string
}



/**
 * GoalCard Component
 * Modern redesigned goal card with circular progress ring
 * Features cleaner layout, better visual hierarchy, and motivating feedback
 */
export const GoalCard: React.FC<GoalCardProps> = ({ goal, onClick, className = '' }) => {
  const { currentStreak, bestStreak, totalDays, isActiveToday, loading } = useGoalStreak(goal.id)

  // Get frequency label
  const getFrequencyLabel = () => {
    switch (goal.frequency) {
      case 'daily':
        return 'Daily Goal'
      case 'weekly':
        return 'Weekly Goal'
      case 'monthly':
        return 'Monthly Goal'
      default:
        return 'Daily Goal'
    }
  }

  // Get progress ring color based on streak
  const getProgressColor = () => {
    if (currentStreak === 0) return '#9CA3AF' // gray-400
    if (currentStreak < 7) return '#2A9D90' // accent-500
    if (currentStreak < 30) return '#F4A462' // accent-400
    return '#E76E50' // accent-600 - hot streak!
  }

  // Calculate progress percentage (max out at 30 days for visual purposes)
  const progressMax = 30
  const progressValue = Math.min(currentStreak, progressMax)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        relative group
        bg-white rounded-2xl p-6 shadow-lg border-2
        ${isActiveToday ? 'border-accent-400 bg-gradient-to-br from-accent/5 to-white' : 'border-primary-200'}
        hover:shadow-xl hover:border-accent-400
        transition-all duration-200 cursor-pointer
        overflow-hidden
        ${className}
      `}
    >
      {/* Completion Badge */}
      {isActiveToday && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="absolute top-4 right-4 z-20"
        >
          <div className="bg-accent-500 text-white rounded-full p-1.5 shadow-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </motion.div>
      )}

      {/* Content Container */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-bold text-primary-800 group-hover:text-accent-700 transition-colors pr-8">
              {goal.title}
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-600">{getFrequencyLabel()}</p>
            <div className="flex items-center space-x-1.5">
              {goal.is_public ? (
                <Globe className="w-3.5 h-3.5 text-primary-500" title="Public" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-primary-500" title="Private" />
              )}
            </div>
          </div>
        </div>

        {/* Circular Progress Ring - Center Focus */}
        <div className="flex flex-col items-center justify-center mb-6">
          {loading ? (
            <div className="w-32 h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
            </div>
          ) : (
            <CircularProgress
              value={progressValue}
              max={progressMax}
              size={120}
              strokeWidth={10}
              showValue={true}
              valueLabel={currentStreak === 1 ? 'Day' : 'Days'}
              color={getProgressColor()}
              backgroundColor="#E5E7EB"
              animate={true}
            />
          )}

          {/* Streak Label */}
          <div className="mt-3 text-center">
            <p className="text-sm font-semibold text-primary-700">
              {currentStreak === 0 ? 'Start Your Streak' : 'Current Streak'}
            </p>
            {currentStreak > 0 && currentStreak >= progressMax && (
              <p className="text-xs text-accent-600 font-medium mt-1">
                🔥 On Fire! {currentStreak} days!
              </p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-primary-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary-800 tabular-nums">
              {bestStreak}
            </div>
            <div className="text-xs text-primary-600 mt-0.5">Best Streak</div>
          </div>
          <div className="bg-primary-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary-800 tabular-nums">
              {totalDays}
            </div>
            <div className="text-xs text-primary-600 mt-0.5">Total Days</div>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.()
          }}
          className={`
            w-full py-3 rounded-xl font-semibold text-sm
            transition-all duration-200 flex items-center justify-center space-x-2
            ${isActiveToday
              ? 'bg-accent-100 text-accent-700 border-2 border-accent-300'
              : 'bg-accent-500 text-white hover:bg-accent-600 shadow-md hover:shadow-lg'
            }
          `}
        >
          {isActiveToday ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed Today</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4" />
              <span>Mark Complete</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

export default GoalCard

