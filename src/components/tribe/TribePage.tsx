import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Calendar, Image, Info, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useGroupMemberRole } from '../../hooks/useGroupMemberRole'
import { getGroup, type Group } from '../../lib/services/groups'
import GroupHeader from './GroupHeader'
import GroupProfile from './GroupProfile'
import MemberDirectory from './MemberDirectory'
import EventsDashboard from './EventsDashboard'
import AlbumGallery from './AlbumGallery'
import toast from 'react-hot-toast'

type TabType = 'profile' | 'members' | 'events' | 'photos'

const TribePage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { role, isAdmin, isMember, loading: roleLoading } = useGroupMemberRole(groupId)
  
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  const fetchGroup = useCallback(async () => {
    if (!groupId) {
      toast.error('Invalid group ID')
      navigate('/groups')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await getGroup(groupId)
      
      if (error) throw error
      if (!data) {
        toast.error('Group not found')
        navigate('/groups')
        return
      }

      setGroup(data as Group)
    } catch (error) {
      console.error('Failed to fetch group:', error)
      toast.error('Failed to load group')
      navigate('/groups')
    } finally {
      setLoading(false)
    }
  }, [groupId, navigate])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  // Show loading state while checking role and fetching group
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-primary-600">Loading group...</p>
        </div>
      </div>
    )
  }

  // Check if user is a member
  if (!isMember && !roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <Users className="w-16 h-16 text-primary-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-2">Access Restricted</h2>
          <p className="text-primary-600 mb-6">
            You must be a member of this group to view its content.
          </p>
          <button
            onClick={() => navigate('/groups')}
            className="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Groups
          </button>
        </div>
      </div>
    )
  }

  if (!group) return null

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: Info },
    { id: 'members' as TabType, label: 'Members', icon: Users },
    { id: 'events' as TabType, label: 'Events', icon: Calendar },
    { id: 'photos' as TabType, label: 'Photos', icon: Image },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Groups</span>
        </button>
      </div>

      {/* Group Header */}
      <GroupHeader 
        group={group} 
        isAdmin={isAdmin}
        onUpdate={fetchGroup}
      />

      {/* Tabbed Navigation */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="border-b border-primary-200 bg-white rounded-t-2xl shadow-sm">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-primary-600 hover:text-primary-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl shadow-lg p-6 mb-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profile' && (
              <GroupProfile 
                group={group} 
                isAdmin={isAdmin}
                onUpdate={fetchGroup}
              />
            )}
            
            {activeTab === 'members' && groupId && (
              <MemberDirectory 
                groupId={groupId}
                isAdmin={isAdmin}
              />
            )}
            
            {activeTab === 'events' && groupId && (
              <EventsDashboard 
                groupId={groupId}
                isAdmin={isAdmin}
              />
            )}
            
            {activeTab === 'photos' && groupId && (
              <AlbumGallery 
                groupId={groupId}
                isAdmin={isAdmin}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default TribePage

