import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../lib/tenant'
import { useUserRole } from '../hooks/useUserRole'
import { listGroups, createGroup, deleteGroup, listMembershipsByUser, joinGroup, leaveGroup, Group } from '../lib/services/groups'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Shield, Lock, Users } from 'lucide-react'

const GroupsManager: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentTenantId } = useTenant()
  const { canCreateGroups, canEditFacility, isSuperUser, role, loading: roleLoading } = useUserRole(currentTenantId)
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!user || !currentTenantId) { setGroups([]); setMyGroupIds(new Set()); setLoading(false); return }
      setLoading(true)
      const [{ data: groupRows, error: gErr }, { data: memRows, error: mErr }] = await Promise.all([
        listGroups(currentTenantId),
        listMembershipsByUser(user.userId)
      ])
      if (!mounted) return
      if (gErr) { console.error(gErr); toast.error('Failed to load groups') }
      if (mErr) { console.error(mErr); toast.error('Failed to load memberships') }
      setGroups((groupRows ?? []) as any)
      setMyGroupIds(new Set((memRows ?? []).map((r: any) => r.group_id)))
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [user, currentTenantId])

  const handleCreate = async () => {
    if (!currentTenantId || !newName.trim()) return

    // Check permission before attempting to create
    if (!canCreateGroups) {
      toast.error('Only facility administrators can create groups')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await createGroup({ tenant_id: currentTenantId, name: newName.trim() })
      if (error) {
        // Handle RLS policy violation
        if (error.code === '42501') {
          toast.error('You do not have permission to create groups')
          return
        }
        throw error
      }
      setGroups(prev => [data as Group, ...prev])
      setNewName('')
      toast.success('Group created successfully!')
    } catch (err: any) {
      console.error('Group creation error:', err)
      toast.error(err.message || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (groupId: string) => {
    // Check permission before attempting to delete
    if (!canEditFacility && !isSuperUser) {
      toast.error('Only facility administrators can delete groups')
      return
    }

    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await deleteGroup(groupId)
      if (error) {
        // Handle RLS policy violation
        if (error.code === '42501') {
          toast.error('You do not have permission to delete this group')
          return
        }
        throw error
      }
      setGroups(prev => prev.filter(g => g.id !== groupId))
      toast.success('Group deleted successfully')
    } catch (err: any) {
      console.error('Group deletion error:', err)
      toast.error(err.message || 'Failed to delete group')
    }
  }

  const handleToggleMembership = async (groupId: string) => {
    if (!user) return
    const isMember = myGroupIds.has(groupId)
    try {
      if (isMember) {
        const { error } = await leaveGroup({ group_id: groupId, user_id: user.userId })
        if (error) throw error
        const next = new Set(myGroupIds)
        next.delete(groupId)
        setMyGroupIds(next)
        toast.success('Left group')
      } else {
        const { error } = await joinGroup({ group_id: groupId, user_id: user.userId })
        if (error) throw error
        const next = new Set(myGroupIds)
        next.add(groupId)
        setMyGroupIds(next)
        toast.success('Joined group')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Action failed')
    }
  }

  // Show loading state while checking role
  if (roleLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-sand-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!currentTenantId) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-2">No Facility Yet</h2>
        <p className="text-sand-700 mb-4">You need to join or create a facility first to access groups.</p>
        {isSuperUser && (
          <a className="text-sage-700 underline hover:text-sage-800" href="/tenant/setup">
            Create Facility (SuperUser)
          </a>
        )}
        {!isSuperUser && (
          <p className="text-sm text-sand-600">
            Contact your facility administrator to get invited to a facility.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header with role badge */}
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
          Groups
        </motion.h1>
        {role && (
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            role === 'SUPERUSER' ? 'bg-purple-100 text-purple-800' :
            role === 'OWNER' ? 'bg-blue-100 text-blue-800' :
            role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-800'
          }`}>
            {role === 'SUPERUSER' ? '👑 Super Admin' :
             role === 'OWNER' ? '🏢 Facility Owner' :
             role === 'ADMIN' ? '⚙️ Facility Admin' :
             '👤 Member'}
          </span>
        )}
      </div>

      {/* Create Group Section */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold">Create Group</h2>
          {canCreateGroups && <Shield className="w-4 h-4 text-sage-600" />}
        </div>

        {canCreateGroups ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500"
                placeholder="Enter group name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button
                disabled={creating || !newName.trim()}
                onClick={handleCreate}
                className="bg-sage-600 hover:bg-sage-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
            <p className="text-xs text-sand-600">
              Create a new group to organize members and share check-ins.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 bg-sand-50 rounded-lg border border-sand-200">
            <Lock className="w-5 h-5 text-sand-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-sand-800">
                Only facility administrators can create groups
              </p>
              <p className="text-xs text-sand-600 mt-1">
                Contact your facility owner or admin to request a new group.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-sand-600">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-sand-50">
            <Users className="w-12 h-12 text-sand-400 mx-auto mb-3" />
            <p className="text-sand-700 font-medium">No groups yet</p>
            <p className="text-sm text-sand-600 mt-1">
              {canCreateGroups
                ? 'Create your first group to get started!'
                : 'Groups will appear here once they are created.'}
            </p>
          </div>
        ) : (
          groups.map(g => (
            <div key={g.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-lg">{g.name}</div>
                  {g.description && <div className="text-sm text-sand-700 mt-1">{g.description}</div>}
                </div>
                <div className="flex gap-2">
                  {/* View Tribe button - only show if user is a member */}
                  {myGroupIds.has(g.id) && (
                    <button
                      onClick={() => navigate(`/tribe/${g.id}`)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-600 hover:bg-ocean-700 text-white transition-colors"
                    >
                      <Users size={18} />
                      View Tribe
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleMembership(g.id)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      myGroupIds.has(g.id)
                        ? 'border-red-300 text-red-600 hover:bg-red-50'
                        : 'border-sage-300 text-sage-600 hover:bg-sage-50'
                    }`}
                  >
                    {myGroupIds.has(g.id) ? 'Leave' : 'Join'}
                  </button>
                  {(canEditFacility || isSuperUser) && (
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help text for members */}
      {!canCreateGroups && groups.length > 0 && (
        <div className="text-center text-sm text-sand-600 pt-4 border-t">
          <p>Join a group to share check-ins and connect with others in your facility.</p>
        </div>
      )}
    </div>
  )
}

export default GroupsManager

