
import { useState, useEffect } from 'react'
import { differenceInDays, differenceInMonths, differenceInYears } from 'date-fns'
import { lumi } from '../lib/lumi'
import { useAuth } from './useAuth'

interface SobrietyStats {
  totalDays: number
  years: number
  months: number
  days: number
  formattedStreak: string
}

export function useSobrietyStreak() {
  const { user } = useAuth()
  const [streak, setStreak] = useState<number>(0)
  const [stats, setStats] = useState<SobrietyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSobrietyData = async () => {
      if (!user?.userId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch user profile to get sobriety date
        const { list: profiles } = await lumi.entities.user_profiles.list({
          filter: { user_id: user.userId },
          limit: 1
        })

        if (profiles && profiles.length > 0) {
          const profile = profiles[0]
          const sobrietyDate = profile.sobriety_date

          if (sobrietyDate) {
            const startDate = new Date(sobrietyDate)
            const today = new Date()
            
            const totalDays = Math.max(0, differenceInDays(today, startDate))
            const years = differenceInYears(today, startDate)
            const months = differenceInMonths(today, startDate) % 12
            const remainingDays = differenceInDays(today, new Date(today.getFullYear(), today.getMonth() - months, startDate.getDate()))

            let formattedStreak = ''
            if (years > 0) {
              formattedStreak += `${years} year${years > 1 ? 's' : ''}`
              if (months > 0) formattedStreak += `, ${months} month${months > 1 ? 's' : ''}`
            } else if (months > 0) {
              formattedStreak += `${months} month${months > 1 ? 's' : ''}`
              if (remainingDays > 0) formattedStreak += `, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`
            } else {
              formattedStreak = `${totalDays} day${totalDays !== 1 ? 's' : ''}`
            }

            setStreak(totalDays)
            setStats({
              totalDays,
              years,
              months,
              days: remainingDays,
              formattedStreak
            })
          } else {
            // No sobriety date set
            setStreak(0)
            setStats(null)
          }
        } else {
          // No profile found
          setStreak(0)
          setStats(null)
        }
      } catch (err) {
        console.error('Failed to fetch sobriety data:', err)
        setError('Failed to load sobriety data')
        setStreak(0)
        setStats(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSobrietyData()
  }, [user?.userId])

  return {
    streak,
    stats,
    isLoading,
    error
  }
}
