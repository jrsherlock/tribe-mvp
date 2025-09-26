import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../lib/tenant'
import { listGroups, createGroup, deleteGroup, listMembershipsByUser, joinGroup, leaveGroup, Group } from '../lib/services/groups'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const GroupsManager: React.FC = () => {
  const { user } = useAuth()
  const { currentTenantId, memberships } = useTenant()
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const myRole = useMemo(() => {
    if (!currentTenantId) return null
    const m = memberships.find(m => m.tenant_id === currentTenantId)
    return m?.role ?? null
  }, [memberships, currentTenantId])

  const isAdmin = myRole === 'OWNER' || myRole === 'ADMIN'

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
    setCreating(true)
    try {
      const { data, error } = await createGroup({ tenant_id: currentTenantId, name: newName.trim() })
      if (error) throw error
      setGroups(prev => [data as Group, ...prev])
      setNewName('')
      toast.success('Group created')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (groupId: string) => {
    try {
      const { error } = await deleteGroup(groupId)
      if (error) throw error
      setGroups(prev => prev.filter(g => g.id !== groupId))
      toast.success('Group deleted')
    } catch (err: any) {
      console.error(err)
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

  if (!currentTenantId) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-2">No Facility Yet</h2>
        <p className="text-sand-700">Create a facility first to manage groups.</p>
        <a className="text-sage-700 underline" href="/tenant/setup">Create Facility</a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
        Groups
      </motion.h1>

      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Create Group</h2>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-lg px-3 py-2" placeholder="Group name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button disabled={!isAdmin || creating} onClick={handleCreate} className="bg-sage-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Create</button>
        </div>
        {!isAdmin && <p className="text-xs text-sand-600 mt-2">Only admins can create groups.</p>}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div>Loading groups...</div>
        ) : (
          groups.map(g => (
            <div key={g.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{g.name}</div>
                {g.description && <div className="text-sm text-sand-700">{g.description}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggleMembership(g.id)} className="px-3 py-2 rounded-lg border">
                  {myGroupIds.has(g.id) ? 'Leave' : 'Join'}
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(g.id)} className="px-3 py-2 rounded-lg border text-red-600">Delete</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default GroupsManager

