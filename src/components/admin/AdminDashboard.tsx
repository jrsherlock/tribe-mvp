import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../lib/tenant'
import { supabase } from '../../lib/supabase'
import { listGroups, createGroup, deleteGroup, listGroupMembers, adminAddUserToGroup, adminUpdateGroupMembershipRole, type Group, type GroupMembership } from '../../lib/services/groups'
import { isSuperuser, listTenants, createTenantRPC, updateTenant, deleteTenant, listMembershipsByTenant, upsertMembership, updateMembershipRole, deleteMembership, type Tenant, type Membership } from '../../lib/services/tenants'

const Tab = {
  Facilities: 'Facilities',
  Groups: 'Groups',
  Memberships: 'Memberships',
} as const

type TabKey = typeof Tab[keyof typeof Tab]

const roleBadge = (role?: string) => {
  if (!role) return 'bg-sand-200 text-sand-800'
  if (role === 'OWNER') return 'bg-purple-100 text-purple-800'
  if (role === 'ADMIN') return 'bg-blue-100 text-blue-800'
  return 'bg-sand-200 text-sand-800'
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const { currentTenantId } = useTenant()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>(Tab.Facilities)
  const [superuser, setSuperuser] = useState(false)

  // Facilities
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [newFacility, setNewFacility] = useState({ name: '', slug: '' })

  // Groups
  const [groups, setGroups] = useState<Group[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMembership[]>>({})

  // Memberships
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [newMember, setNewMember] = useState<{ user_id: string; role: Membership['role'] }>({ user_id: '', role: 'MEMBER' })



  useEffect(() => {
    const init = async () => {
      if (!user) return
      try {
        setLoading(true)
        const { data: isSu } = await isSuperuser(user.userId)
        setSuperuser(!!isSu)

        if (isSu) {
          const { data: allTenants } = await listTenants()
          setTenants(allTenants ?? [])
          if (allTenants && allTenants.length) setSelectedTenantId(allTenants[0].id)
        } else if (currentTenantId) {
          // Non-superuser: scope to own tenant only (RLS already restricts selects)
          const { data: myTenants } = await listTenants()
          setTenants(myTenants ?? [])
          setSelectedTenantId(currentTenantId)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user, currentTenantId])

  // Load memberships and groups for selected tenant
  useEffect(() => {
    const loadTenantData = async () => {
      if (!selectedTenantId) return
      const [{ data: mems }, { data: grps }] = await Promise.all([
        listMembershipsByTenant(selectedTenantId),
        listGroups(selectedTenantId)
      ])
      setMemberships(mems ?? [])
      setGroups(grps ?? [])
    }
    loadTenantData()
  }, [selectedTenantId])

  const refreshGroupMembers = async (groupId: string) => {
    const { data: members } = await listGroupMembers(groupId)
    setGroupMembers(prev => ({ ...prev, [groupId]: members ?? [] }))
  }

  const onCreateFacility = async () => {
    if (!newFacility.name.trim() || !newFacility.slug.trim()) return
    const { error } = await createTenantRPC({ name: newFacility.name.trim(), slug: newFacility.slug.trim() })
    if (!error) {
      setNewFacility({ name: '', slug: '' })
      const { data: all } = await listTenants()
      setTenants(all ?? [])
      if (all && all.length) setSelectedTenantId(all[0].id)
    }
  }

  const onUpdateFacility = async (tenantId: string, fields: Partial<Pick<Tenant, 'name' | 'slug'>>) => {
    await updateTenant(tenantId, fields)
    const { data: all } = await listTenants()
    setTenants(all ?? [])
  }

  const onDeleteFacility = async (tenantId: string) => {
    await deleteTenant(tenantId)
    const { data: all } = await listTenants()
    setTenants(all ?? [])
    setSelectedTenantId(all && all.length ? all[0].id : null)
  }

  const onCreateGroup = async () => {
    if (!selectedTenantId || !newGroupName.trim()) return
    await createGroup({ tenant_id: selectedTenantId, name: newGroupName.trim() })
    setNewGroupName('')
    const { data: grps } = await listGroups(selectedTenantId)
    setGroups(grps ?? [])
  }

  const onDeleteGroup = async (groupId: string) => {
    await deleteGroup(groupId)
    const { data: grps } = await listGroups(selectedTenantId!)
    setGroups(grps ?? [])
  }

  const onAddMemberToTenant = async () => {
    if (!selectedTenantId || !newMember.user_id.trim()) return
    await upsertMembership({ user_id: newMember.user_id.trim(), tenant_id: selectedTenantId, role: newMember.role })
    setNewMember({ user_id: '', role: 'MEMBER' })
    const { data: mems } = await listMembershipsByTenant(selectedTenantId)
    setMemberships(mems ?? [])
  }

  const onUpdateMemberRole = async (m: Membership, role: Membership['role']) => {
    await updateMembershipRole({ user_id: m.user_id, tenant_id: m.tenant_id, role })
    const { data: mems } = await listMembershipsByTenant(m.tenant_id)
    setMemberships(mems ?? [])
  }

  const onRemoveMember = async (m: Membership) => {
    await deleteMembership({ user_id: m.user_id, tenant_id: m.tenant_id })
    const { data: mems } = await listMembershipsByTenant(m.tenant_id)
    setMemberships(mems ?? [])
  }

  const onAddUserToGroup = async (groupId: string, user_id: string, role: GroupMembership['role']) => {
    await adminAddUserToGroup({ group_id: groupId, user_id, role })
    await refreshGroupMembers(groupId)
  }

  const onUpdateGroupMemberRole = async (groupId: string, user_id: string, role: GroupMembership['role']) => {
    await adminUpdateGroupMembershipRole({ group_id: groupId, user_id, role })
    await refreshGroupMembers(groupId)
  }

  if (!user) return <div className="p-6">Please sign in.</div>
  if (loading) return <div className="p-6">Loading admin...</div>

  // Access guard: must be superuser or have a tenant role (OWNER/ADMIN) or be group-admin somewhere
  // For MVP, show the page but scoped; RLS will enforce server-side permissions.

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="text-sm">{superuser ? 'SuperUser' : 'Scoped Admin'}</div>
      </div>

      <div className="flex gap-2 border-b">
        {Object.values(Tab).map(t => (
          <button key={t} className={`px-3 py-2 ${activeTab===t?'border-b-2 border-black font-semibold':''}`} onClick={()=>setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* Facilities Tab */}
      {activeTab===Tab.Facilities && (
        <div className="space-y-4">
          {superuser && (
            <div className="border p-3 rounded">
              <div className="font-semibold mb-2">Create Facility</div>
              <div className="flex gap-2">
                <input className="border px-2 py-1 rounded" placeholder="Name" value={newFacility.name} onChange={e=>setNewFacility(prev=>({...prev,name:e.target.value}))} />
                <input className="border px-2 py-1 rounded" placeholder="Slug" value={newFacility.slug} onChange={e=>setNewFacility(prev=>({...prev,slug:e.target.value}))} />
                <button className="px-3 py-1 bg-black text-white rounded" onClick={onCreateFacility}>Create</button>
              </div>
            </div>
          )}

          <div className="border p-3 rounded">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Facilities</div>
              <select className="border px-2 py-1 rounded" value={selectedTenantId ?? ''} onChange={(e)=>setSelectedTenantId(e.target.value || null)}>
                <option value="">Select facility</option>
                {tenants.map(t=> (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3">
              {tenants.map(t => (
                <div key={t.id} className={`border rounded p-3 ${selectedTenantId===t.id?'bg-sand-50':''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-sand-600">{t.slug}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-2 py-1 border rounded" onClick={()=>onUpdateFacility(t.id, { name: prompt('New name', t.name) || t.name })}>Rename</button>
                      {superuser && <button className="px-2 py-1 border rounded" onClick={()=>onUpdateFacility(t.id, { slug: prompt('New slug', t.slug) || t.slug })}>Edit Slug</button>}
                      {superuser && <button className="px-2 py-1 border rounded text-red-600" onClick={()=>onDeleteFacility(t.id)}>Delete</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab===Tab.Groups && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Groups in Facility</div>
            <div className="flex items-center gap-2">
              <select className="border px-2 py-1 rounded" value={selectedTenantId ?? ''} onChange={(e)=>setSelectedTenantId(e.target.value || null)}>
                <option value="">Select facility</option>
                {tenants.map(t=> (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
              <input className="border px-2 py-1 rounded" placeholder="New group name" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} />
              <button className="px-3 py-1 bg-black text-white rounded" onClick={onCreateGroup} disabled={!selectedTenantId || !newGroupName.trim()}>Create</button>
            </div>
          </div>

          <div className="grid gap-3">
            {groups.map(g => (
              <div key={g.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{g.name}</div>
                  <button className="px-2 py-1 border rounded text-red-600" onClick={()=>onDeleteGroup(g.id)}>Delete</button>
                </div>

                {/* Group members */}
                <div className="mt-2">
                  <button className="text-sm underline" onClick={()=>refreshGroupMembers(g.id)}>Load members</button>
                  <div className="mt-2 space-y-2">
                    {(groupMembers[g.id] ?? []).map(m => (
                      <div key={m.user_id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded ${m.role==='ADMIN'?'bg-blue-100 text-blue-800':'bg-sand-200 text-sand-800'}`}>{m.role}</span>
                          <span className="font-mono">{m.user_id}</span>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-2 py-0.5 border rounded" onClick={()=>onUpdateGroupMemberRole(g.id, m.user_id, m.role==='ADMIN'?'MEMBER':'ADMIN')}>{m.role==='ADMIN'?'Make Member':'Make Admin'}</button>
                          <button className="px-2 py-0.5 border rounded text-red-600" onClick={()=>supabase.from('group_memberships').delete().eq('group_id', g.id).eq('user_id', m.user_id).then(()=>refreshGroupMembers(g.id))}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add user to group */}
                  <div className="mt-3 flex gap-2">
                    <input className="border px-2 py-1 rounded flex-1" placeholder="User ID to add" id={`add-${g.id}`} />
                    <select className="border px-2 py-1 rounded" id={`role-${g.id}`}>
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button className="px-3 py-1 border rounded" onClick={()=>{
                      const uid = (document.getElementById(`add-${g.id}`) as HTMLInputElement)?.value?.trim()
                      const role = ((document.getElementById(`role-${g.id}`) as HTMLSelectElement)?.value as GroupMembership['role'])
                      if (uid) onAddUserToGroup(g.id, uid, role)
                    }}>Add</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memberships Tab */}
      {activeTab===Tab.Memberships && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Facility Members</div>
            <select className="border px-2 py-1 rounded" value={selectedTenantId ?? ''} onChange={(e)=>setSelectedTenantId(e.target.value || null)}>
              <option value="">Select facility</option>
              {tenants.map(t=> (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div className="grid gap-2">
            {memberships.map(m => (
              <div key={`${m.user_id}-${m.tenant_id}`} className="border rounded p-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${roleBadge(m.role)}`}>{m.role}</span>
                  <span className="font-mono">{m.user_id}</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-0.5 border rounded" onClick={()=>onUpdateMemberRole(m, m.role==='ADMIN'?'MEMBER':'ADMIN')}>{m.role==='ADMIN'?'Make Member':'Make Admin'}</button>
                  <button className="px-2 py-0.5 border rounded" onClick={()=>onUpdateMemberRole(m, 'OWNER')}>Make Owner</button>
                  <button className="px-2 py-0.5 border rounded text-red-600" onClick={()=>onRemoveMember(m)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* Add to tenant */}
          <div className="border p-3 rounded">
            <div className="font-semibold mb-2">Add user to facility</div>
            <div className="flex gap-2">
              <input className="border px-2 py-1 rounded flex-1" placeholder="User ID" value={newMember.user_id} onChange={e=>setNewMember(prev=>({...prev,user_id:e.target.value}))} />
              <select className="border px-2 py-1 rounded" value={newMember.role} onChange={e=>setNewMember(prev=>({...prev,role:e.target.value as Membership['role']}))}>
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
              </select>
              <button className="px-3 py-1 bg-black text-white rounded" disabled={!selectedTenantId || !newMember.user_id.trim()} onClick={onAddMemberToTenant}>Add</button>
            </div>
            <div className="text-xs text-sand-600 mt-1">Tip: For now, enter a user_id. We can add email lookup later.</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

