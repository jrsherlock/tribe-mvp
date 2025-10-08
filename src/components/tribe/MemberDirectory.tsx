import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Grid, List, MoreVertical, Shield, UserMinus, User } from 'lucide-react'
import { listGroupMembers, adminUpdateGroupMembershipRole, removeGroupMember, type GroupMembership } from '../../lib/services/groups'
import { getUserProfiles, type UserProfile } from '../../lib/services/users'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

interface MemberDirectoryProps {
  groupId: string
  isAdmin: boolean
}

type MemberWithProfile = GroupMembership & {
  profile?: UserProfile
}

type ViewMode = 'grid' | 'list'

const MemberDirectory: React.FC<MemberDirectoryProps> = ({ groupId, isAdmin }) => {
  const { user } = useAuth()
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [groupId])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      
      // Fetch memberships
      const { data: memberships, error: membershipsError } = await listGroupMembers(groupId)
      if (membershipsError) throw membershipsError

      if (!memberships || memberships.length === 0) {
        setMembers([])
        return
      }

      // Fetch user profiles
      const userIds = memberships.map((m: any) => m.user_id)
      const { data: profiles, error: profilesError } = await getUserProfiles(userIds)
      if (profilesError) throw profilesError

      // Merge memberships with profiles
      const membersWithProfiles = memberships.map((membership: any) => ({
        ...membership,
        profile: profiles?.find((p: any) => p.user_id === membership.user_id),
      }))

      setMembers(membersWithProfiles as MemberWithProfile[])
    } catch (error) {
      console.error('Failed to fetch members:', error)
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      const { error } = await adminUpdateGroupMembershipRole({
        group_id: groupId,
        user_id: userId,
        role: newRole,
      })

      if (error) throw error

      toast.success(`Role updated to ${newRole}`)
      fetchMembers()
      setActiveMenu(null)
    } catch (error) {
      console.error('Failed to update role:', error)
      toast.error('Failed to update role')
    }
  }

  const handleRemoveMember = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to remove ${displayName} from this group?`)) {
      return
    }

    try {
      const { error } = await removeGroupMember({
        group_id: groupId,
        user_id: userId,
      })

      if (error) throw error

      toast.success('Member removed successfully')
      fetchMembers()
      setActiveMenu(null)
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members

    const query = searchQuery.toLowerCase()
    return members.filter((member) => {
      const name = member.profile?.display_name?.toLowerCase() || ''
      const email = member.profile?.email?.toLowerCase() || ''
      return name.includes(query) || email.includes(query)
    })
  }, [members, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-primary-600">Loading members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-accent-600 text-white'
                : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-accent-600 text-white'
                : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Member Count */}
      <div className="flex items-center gap-2 text-primary-600">
        <Users className="w-5 h-5" />
        <span className="font-medium">
          {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-12 bg-primary-50 rounded-2xl border-2 border-dashed border-primary-200">
          <Users className="w-12 h-12 text-primary-400 mx-auto mb-3" />
          <p className="text-primary-700 font-medium">
            {searchQuery ? 'No members found' : 'No members yet'}
          </p>
          <p className="text-sm text-primary-600 mt-1">
            {searchQuery ? 'Try a different search term' : 'Members will appear here once they join'}
          </p>
        </div>
      )}

      {/* Members Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.user_id}
              member={member}
              isAdmin={isAdmin}
              isCurrentUser={member.user_id === user?.userId}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              onRoleChange={handleRoleChange}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              isAdmin={isAdmin}
              isCurrentUser={member.user_id === user?.userId}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              onRoleChange={handleRoleChange}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Member Card Component (Grid View)
const MemberCard: React.FC<{
  member: MemberWithProfile
  isAdmin: boolean
  isCurrentUser: boolean
  activeMenu: string | null
  setActiveMenu: (id: string | null) => void
  onRoleChange: (userId: string, role: 'ADMIN' | 'MEMBER') => void
  onRemove: (userId: string, displayName: string) => void
}> = ({ member, isAdmin, isCurrentUser, activeMenu, setActiveMenu, onRoleChange, onRemove }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-primary-200 rounded-2xl p-4 hover:shadow-md transition-shadow relative"
    >
      {/* Admin Menu */}
      {isAdmin && !isCurrentUser && (
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setActiveMenu(activeMenu === member.user_id ? null : member.user_id)}
            className="p-1 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-primary-600" />
          </button>

          {activeMenu === member.user_id && (
            <div className="absolute right-0 top-8 bg-white border border-primary-200 rounded-xl shadow-lg py-2 z-10 min-w-[160px]">
              <button
                onClick={() => onRoleChange(member.user_id, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                className="w-full px-4 py-2 text-left hover:bg-primary-50 flex items-center gap-2 text-primary-700"
              >
                <Shield className="w-4 h-4" />
                {member.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
              </button>
              <button
                onClick={() => onRemove(member.user_id, member.profile?.display_name || 'this member')}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
              >
                <UserMinus className="w-4 h-4" />
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center text-center mb-3">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-3">
          {member.profile?.avatar_url ? (
            <img
              src={member.profile.avatar_url}
              alt={member.profile.display_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-primary-400" />
          )}
        </div>

        <h3 className="font-semibold text-primary-800">
          {member.profile?.display_name || 'Anonymous'}
        </h3>
        {member.profile?.email && (
          <p className="text-sm text-primary-600 truncate w-full">{member.profile.email}</p>
        )}
      </div>

      {/* Role Badge */}
      <div className="flex justify-center">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            member.role === 'ADMIN'
              ? 'bg-accent-100 text-accent-800'
              : 'bg-primary-100 text-primary-700'
          }`}
        >
          {member.role === 'ADMIN' ? '⚙️ Admin' : '👤 Member'}
        </span>
      </div>
    </motion.div>
  )
}

// Member Row Component (List View) - Similar structure, different layout
const MemberRow: React.FC<{
  member: MemberWithProfile
  isAdmin: boolean
  isCurrentUser: boolean
  activeMenu: string | null
  setActiveMenu: (id: string | null) => void
  onRoleChange: (userId: string, role: 'ADMIN' | 'MEMBER') => void
  onRemove: (userId: string, displayName: string) => void
}> = ({ member, isAdmin, isCurrentUser, activeMenu, setActiveMenu, onRoleChange, onRemove }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-primary-200 rounded-xl p-4 hover:shadow-md transition-shadow flex items-center justify-between relative"
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          {member.profile?.avatar_url ? (
            <img
              src={member.profile.avatar_url}
              alt={member.profile.display_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-primary-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary-800 truncate">
            {member.profile?.display_name || 'Anonymous'}
          </h3>
          {member.profile?.email && (
            <p className="text-sm text-primary-600 truncate">{member.profile.email}</p>
          )}
        </div>

        {/* Role Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            member.role === 'ADMIN'
              ? 'bg-accent-100 text-accent-800'
              : 'bg-primary-100 text-primary-700'
          }`}
        >
          {member.role === 'ADMIN' ? '⚙️ Admin' : '👤 Member'}
        </span>
      </div>

      {/* Admin Menu */}
      {isAdmin && !isCurrentUser && (
        <div className="ml-2 relative">
          <button
            onClick={() => setActiveMenu(activeMenu === member.user_id ? null : member.user_id)}
            className="p-1 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-primary-600" />
          </button>

          {activeMenu === member.user_id && (
            <div className="absolute right-0 top-8 bg-white border border-primary-200 rounded-xl shadow-lg py-2 z-10 min-w-[160px]">
              <button
                onClick={() => onRoleChange(member.user_id, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                className="w-full px-4 py-2 text-left hover:bg-primary-50 flex items-center gap-2 text-primary-700"
              >
                <Shield className="w-4 h-4" />
                {member.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
              </button>
              <button
                onClick={() => onRemove(member.user_id, member.profile?.display_name || 'this member')}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
              >
                <UserMinus className="w-4 h-4" />
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default MemberDirectory

