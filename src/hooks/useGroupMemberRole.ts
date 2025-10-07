import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook to get the current user's role in a specific group
 * 
 * Modeled after useUserRole.ts for consistency
 * 
 * @param groupId - The UUID of the group to check role for
 * @returns Object containing role information and helper booleans
 * 
 * @example
 * ```typescript
 * function GroupComponent({ groupId }: { groupId: string }) {
 *   const { role, isAdmin, isMember, loading } = useGroupMemberRole(groupId)
 * 
 *   if (loading) return <div>Loading...</div>
 * 
 *   return (
 *     <div>
 *       {isAdmin && <button>Manage Members</button>}
 *       {isMember && <p>You are a member of this group</p>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useGroupMemberRole(groupId?: string | null) {
  const [role, setRole] = useState<'admin' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchRole() {
      if (!groupId) {
        setRole(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Check if user is a SuperUser first (SuperUsers are admins of all groups)
        const { data: isSuperUserData, error: superUserError } = await supabase
          .from('superusers')
          .select('user_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()

        if (superUserError && superUserError.code !== 'PGRST116') {
          throw superUserError
        }

        // If user is a SuperUser, they have admin access to all groups
        if (isSuperUserData) {
          if (mounted) {
            setRole('admin')
            setLoading(false)
          }
          return
        }

        // Get user's role in the specified group
        const { data: membership, error: membershipError } = await supabase
          .from('group_memberships')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()

        if (membershipError && membershipError.code !== 'PGRST116') {
          throw membershipError
        }

        if (mounted) {
          // Convert role to lowercase for consistency
          setRole(membership?.role?.toLowerCase() as 'admin' | 'member' | null)
        }
      } catch (err) {
        console.error('Error fetching group member role:', err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setRole(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchRole()

    return () => {
      mounted = false
    }
  }, [groupId])

  return {
    /** The user's role in the group: 'admin', 'member', or null if not a member */
    role,
    
    /** Whether the role data is still loading */
    loading,
    
    /** Any error that occurred while fetching the role */
    error,
    
    /** True if user is a Group Admin */
    isAdmin: role === 'admin',
    
    /** True if user is a Group Member (includes admins) */
    isMember: role === 'admin' || role === 'member',
    
    /** True if user can manage group members (invite, remove, update roles) */
    canManageMembers: role === 'admin',
    
    /** True if user can update group settings */
    canUpdateGroup: role === 'admin',
    
    /** True if user can create events */
    canCreateEvents: role === 'admin',
    
    /** True if user can delete events */
    canDeleteEvents: role === 'admin',
    
    /** True if user can create albums */
    canCreateAlbums: role === 'admin' || role === 'member',
    
    /** True if user can upload photos */
    canUploadPhotos: role === 'admin' || role === 'member',
  }
}

