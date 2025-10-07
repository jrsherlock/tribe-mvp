import { useState, useEffect, useCallback } from 'react'
import { differenceInDays, parseISO, startOfDay, subDays, isEqual } from 'date-fns'
import { getGoalProgress } from '../lib/services/goals'
import type { GoalProgress } from '../lib/services/goals'

/**
 * Streak calculation result
 */
export interface StreakData {
  currentStreak: number
  bestStreak: number
  totalDays: number
  lastLoggedDate: Date | null
  isActiveToday: boolean
}

/**
 * Custom hook to calculate goal streaks
 * Uses date-fns for robust date comparisons
 * 
 * @param goalId - The ID of the goal to calculate streaks for
 * @returns Streak data and loading state
 */
export function useGoalStreak(goalId: string | null) {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    bestStreak: 0,
    totalDays: 0,
    lastLoggedDate: null,
    isActiveToday: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Calculate streaks from progress entries
   */
  const calculateStreaks = useCallback((progressEntries: GoalProgress[]): StreakData => {
    if (!progressEntries || progressEntries.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        totalDays: 0,
        lastLoggedDate: null,
        isActiveToday: false,
      }
    }

    // Parse and normalize all dates to start of day for accurate comparison
    const dates = progressEntries
      .map(entry => startOfDay(parseISO(entry.logged_at)))
      .sort((a, b) => b.getTime() - a.getTime()) // Sort descending (newest first)

    // Remove duplicates (same day entries)
    const uniqueDates = dates.filter((date, index, arr) => {
      if (index === 0) return true
      return !isEqual(date, arr[index - 1])
    })

    const totalDays = uniqueDates.length
    const today = startOfDay(new Date())
    const lastLoggedDate = uniqueDates[0]
    const isActiveToday = isEqual(lastLoggedDate, today)

    // Calculate current streak
    let currentStreak = 0
    let checkDate = today

    // If not logged today, check if logged yesterday to continue streak
    if (!isActiveToday) {
      checkDate = subDays(today, 1)
    }

    // Count consecutive days backwards from checkDate
    for (const date of uniqueDates) {
      const daysDiff = differenceInDays(checkDate, date)
      
      if (daysDiff === 0) {
        // Found the expected date
        currentStreak++
        checkDate = subDays(checkDate, 1)
      } else if (daysDiff > 0) {
        // Gap found, streak broken
        break
      }
      // If daysDiff < 0, this date is in the future (shouldn't happen), skip it
    }

    // Calculate best streak
    let bestStreak = 0
    let tempStreak = 0
    let expectedDate = uniqueDates[0]

    for (const date of uniqueDates) {
      const daysDiff = differenceInDays(expectedDate, date)
      
      if (daysDiff === 0) {
        // Consecutive day found
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
        expectedDate = subDays(expectedDate, 1)
      } else {
        // Gap found, reset temp streak
        tempStreak = 1
        expectedDate = subDays(date, 1)
      }
    }

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      totalDays,
      lastLoggedDate,
      isActiveToday,
    }
  }, [])

  /**
   * Fetch progress and calculate streaks
   */
  const fetchStreakData = useCallback(async () => {
    if (!goalId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: progressEntries, error: fetchError } = await getGoalProgress(goalId)

      if (fetchError) {
        throw fetchError
      }

      const calculatedStreaks = calculateStreaks(progressEntries || [])
      setStreakData(calculatedStreaks)
    } catch (err) {
      console.error('Error fetching goal progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch goal progress')
      setStreakData({
        currentStreak: 0,
        bestStreak: 0,
        totalDays: 0,
        lastLoggedDate: null,
        isActiveToday: false,
      })
    } finally {
      setLoading(false)
    }
  }, [goalId, calculateStreaks])

  // Fetch on mount and when goalId changes
  useEffect(() => {
    fetchStreakData()
  }, [fetchStreakData])

  return {
    ...streakData,
    loading,
    error,
    refetch: fetchStreakData,
  }
}

