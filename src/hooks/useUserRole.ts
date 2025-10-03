import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook to get the current user's role in a specific tenant
 * 
 * @param tenantId - The UUID of the tenant to check role for
 * @returns Object containing role information and helper booleans
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { currentTenantId } = useTenant()
 *   const { role, isFacilityAdmin, isSuperUser, loading } = useUserRole(currentTenantId)
 * 
 *   if (loading) return <div>Loading...</div>
 * 
 *   return (
 *     <div>
 *       {isFacilityAdmin && <button>Create Group</button>}
 *       {isSuperUser && <button>Create Facility</button>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useUserRole(tenantId?: string | null) {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchRole() {
      setLoading(true)
      setError(null)

      // If no tenantId provided, user is a Basic User
      if (!tenantId) {
        setRole('BASIC_USER')
        setLoading(false)
        return
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('get_user_tenant_role', {
          p_tenant_id: tenantId
        })

        if (rpcError) throw rpcError

        setRole(data)
      } catch (err) {
        console.error('Error fetching user role:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [tenantId])

  return {
    /** The user's role: 'SUPERUSER', 'OWNER', 'ADMIN', 'MEMBER', or 'BASIC_USER' */
    role,
    
    /** Whether the role data is still loading */
    loading,
    
    /** Any error that occurred while fetching the role */
    error,
    
    /** True if user is a SuperUser (platform administrator) */
    isSuperUser: role === 'SUPERUSER',
    
    /** True if user is a Facility Admin (OWNER or ADMIN) */
    isFacilityAdmin: role === 'OWNER' || role === 'ADMIN',
    
    /** True if user is a Facility Owner (highest facility role) */
    isOwner: role === 'OWNER',
    
    /** True if user is a Facility Admin (not owner) */
    isAdmin: role === 'ADMIN',
    
    /** True if user is a Facility Member (regular member) */
    isMember: role === 'MEMBER',
    
    /** True if user is a Basic User (no tenant membership) */
    isBasicUser: role === 'BASIC_USER',
    
    /** True if user can create groups (SuperUser or Facility Admin) */
    canCreateGroups: role === 'SUPERUSER' || role === 'OWNER' || role === 'ADMIN',
    
    /** True if user can invite users to facility (SuperUser or Facility Admin) */
    canInviteUsers: role === 'SUPERUSER' || role === 'OWNER' || role === 'ADMIN',
    
    /** True if user can edit facility profile (SuperUser or Facility Admin) */
    canEditFacility: role === 'SUPERUSER' || role === 'OWNER' || role === 'ADMIN',
    
    /** True if user can delete facility (SuperUser or Owner only) */
    canDeleteFacility: role === 'SUPERUSER' || role === 'OWNER',
    
    /** True if user can create facilities (SuperUser only) */
    canCreateFacilities: role === 'SUPERUSER'
  }
}

/**
 * Hook to check if the current user is a Group Admin for a specific group
 * 
 * @param groupId - The UUID of the group to check admin status for
 * @returns Object containing admin status and loading state
 * 
 * @example
 * ```typescript
 * function GroupSettings({ groupId }: { groupId: string }) {
 *   const { isGroupAdmin, loading } = useGroupAdmin(groupId)
 * 
 *   if (loading) return <div>Loading...</div>
 * 
 *   return (
 *     <div>
 *       {isGroupAdmin && <button>Invite Member</button>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useGroupAdmin(groupId?: string | null) {
  const [isGroupAdmin, setIsGroupAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function checkGroupAdmin() {
      setLoading(true)
      setError(null)

      if (!groupId) {
        setIsGroupAdmin(false)
        setLoading(false)
        return
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('is_group_admin', {
          p_group_id: groupId
        })

        if (rpcError) throw rpcError

        setIsGroupAdmin(data === true)
      } catch (err) {
        console.error('Error checking group admin status:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setIsGroupAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkGroupAdmin()
  }, [groupId])

  return {
    /** True if user is a Group Admin for this group */
    isGroupAdmin,
    
    /** Whether the admin status is still loading */
    loading,
    
    /** Any error that occurred while checking admin status */
    error,
    
    /** True if user can manage group members (invite, remove, update roles) */
    canManageMembers: isGroupAdmin,
    
    /** True if user can update group settings */
    canUpdateGroup: isGroupAdmin
  }
}

/**
 * Hook to get the current user's role in a specific group
 * 
 * @param groupId - The UUID of the group to check role for
 * @returns Object containing group role information
 * 
 * @example
 * ```typescript
 * function GroupMemberList({ groupId }: { groupId: string }) {
 *   const { groupRole, isGroupAdmin, isGroupMember, loading } = useGroupRole(groupId)
 * 
 *   if (loading) return <div>Loading...</div>
 * 
 *   return (
 *     <div>
 *       <p>Your role: {groupRole}</p>
 *       {isGroupAdmin && <button>Manage Members</button>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useGroupRole(groupId?: string | null) {
  const [groupRole, setGroupRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchGroupRole() {
      setLoading(true)
      setError(null)

      if (!groupId) {
        setGroupRole(null)
        setLoading(false)
        return
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('get_user_group_role', {
          p_group_id: groupId
        })

        if (rpcError) throw rpcError

        setGroupRole(data)
      } catch (err) {
        console.error('Error fetching group role:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setGroupRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchGroupRole()
  }, [groupId])

  return {
    /** The user's role in the group: 'SUPERUSER', 'FACILITY_ADMIN', 'ADMIN', 'MEMBER', or null */
    groupRole,
    
    /** Whether the role data is still loading */
    loading,
    
    /** Any error that occurred while fetching the role */
    error,
    
    /** True if user is a SuperUser */
    isSuperUser: groupRole === 'SUPERUSER',
    
    /** True if user is a Facility Admin of the group's tenant */
    isFacilityAdmin: groupRole === 'FACILITY_ADMIN',
    
    /** True if user is a Group Admin */
    isGroupAdmin: groupRole === 'ADMIN',
    
    /** True if user is a Group Member (regular member) */
    isGroupMember: groupRole === 'MEMBER',
    
    /** True if user has any membership in the group */
    hasGroupMembership: groupRole !== null,
    
    /** True if user can manage group members */
    canManageMembers: groupRole === 'SUPERUSER' || groupRole === 'FACILITY_ADMIN' || groupRole === 'ADMIN',
    
    /** True if user can update group settings */
    canUpdateGroup: groupRole === 'SUPERUSER' || groupRole === 'FACILITY_ADMIN' || groupRole === 'ADMIN'
  }
}

