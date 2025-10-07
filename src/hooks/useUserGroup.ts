import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface UserGroup {
  id: string
  name: string
  description?: string | null
  tenant_id: string
  created_at?: string
}

export interface UseUserGroupReturn {
  group: UserGroup | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching the user's primary group
 * Returns the first group the user belongs to, or null if user is in solo mode
 */
export function useUserGroup(): UseUserGroupReturn {
  const { user } = useAuth()
  const [group, setGroup] = useState<UserGroup | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserGroup = async () => {
    if (!user?.userId) {
      setGroup(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch user's group memberships with group details
      const { data: memberships, error: membershipError } = await supabase
        .from('group_memberships')
        .select(`
          group_id,
          role,
          groups (
            id,
            name,
            description,
            tenant_id,
            created_at
          )
        `)
        .eq('user_id', user.userId)
        .limit(1)
        .single()

      if (membershipError) {
        // PGRST116 means no rows found - user is in solo mode
        if (membershipError.code === 'PGRST116') {
          setGroup(null)
          setError(null)
        } else {
          throw membershipError
        }
      } else if (memberships && memberships.groups) {
        // Extract group data from the nested structure
        const groupData = Array.isArray(memberships.groups) 
          ? memberships.groups[0] 
          : memberships.groups
        
        setGroup(groupData as UserGroup)
      } else {
        setGroup(null)
      }
    } catch (err) {
      console.error('Failed to fetch user group:', err)
      setError(err instanceof Error ? err.message : 'Failed to load group data')
      setGroup(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserGroup()
  }, [user?.userId])

  return {
    group,
    isLoading,
    error,
    refetch: fetchUserGroup
  }
}

