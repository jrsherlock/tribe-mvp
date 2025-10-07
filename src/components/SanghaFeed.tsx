import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../lib/tenant'
import { listGroupFeed } from '../lib/services/checkins'
import { listByCheckinIds, addEmoji as svcAddEmoji, addComment as svcAddComment } from '../lib/services/interactions'
import { listMembershipsByUser } from '../lib/services/groups'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import PublicProfile from './PublicProfile'
import CheckInCard from './CheckInCard'
import AvatarFilterBar from './AvatarFilterBar'
import DateSeparator from './DateSeparator'

interface DailyCheckin {
  _id?: string
  user_id: string
  checkin_date: string
  mental_rating: number
  emotional_rating: number
  physical_rating: number
  social_rating: number
  spiritual_rating: number
  mental_notes?: string
  emotional_notes?: string
  physical_notes?: string
  social_notes?: string
  spiritual_notes?: string
  mental_emojis?: string[]
  emotional_emojis?: string[]
  physical_emojis?: string[]
  social_emojis?: string[]
  spiritual_emojis?: string[]
  gratitude?: string[]
  is_private: boolean
  mood_emoji: string
  created_at: string
  updated_at: string
  user_profile?: {
    user_id: string
    display_name: string
    avatar_url: string
    is_public: boolean
  }
}

interface UserGroup {
  id: string
  name: string
  description?: string
}

interface UserProfile {
  _id?: string
  user_id: string
  display_name: string
  avatar_url: string
  is_public: boolean
}

interface FeedInteraction {
  _id?: string
  user_id: string
  checkin_id: string
  interaction_type: 'comment' | 'emoji_reaction'
  content?: string
  emoji?: string
  created_at: string
  updated_at: string
}

const SanghaFeed: React.FC = () => {
  const { user } = useAuth()
  const { currentTenantId } = useTenant()
  const location = useLocation()
  const [checkins, setCheckins] = useState<DailyCheckin[]>([])
  const [publicProfiles, setPublicProfiles] = useState<Map<string, UserProfile>>(new Map())
  const [interactions, setInteractions] = useState<Map<string, FeedInteraction[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [expandedCheckins, setExpandedCheckins] = useState<Set<string>>(new Set())
  const [commentInputs, setCommentInputs] = useState<Map<string, string>>(new Map())
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'today'>('today')
  const [filteredMemberId, setFilteredMemberId] = useState<string | null>(null)
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)

  const fetchInFlight = useRef(false)
  const lastKey = useRef<string | null>(null)

  // Fetch user's groups on mount
  useEffect(() => {
    fetchUserGroups()
  }, [user?.userId])

  useEffect(() => {
    const key = `${user?.userId ?? 'none'}|${filterMode}`
    if (fetchInFlight.current) return
    if (lastKey.current === key && checkins.length) return
    fetchInFlight.current = true
    ;(async () => {
      await fetchFeed()
      fetchInFlight.current = false
      lastKey.current = key
    })()
  }, [user?.userId, filterMode])

  // Check URL params for filter mode
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const filter = urlParams.get('filter')
    if (filter === 'today') {
      setFilterMode('today')
    }
  }, [location.search])

  // Show welcome message if redirected from check-in
  useEffect(() => {
    if (location.state?.message) {
      setShowWelcomeMessage(true)
      toast.success(location.state.message, {
        duration: 3000,
        icon: '🌟',
        style: {
          borderRadius: '12px',
          background: '#f6f8f6',
          color: '#335533',
          border: '1px solid #22c55e'
        }
      })

      // Clear the message after showing it
      window.history.replaceState({}, document.title)

      // Hide welcome message after 4 seconds
      setTimeout(() => setShowWelcomeMessage(false), 4000)
    }
  }, [location.state])

  const fetchFeed = async () => {
    if (!user?.userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Determine date filter based on mode
      let sinceIso: string | undefined
      if (filterMode === 'today') {
        const today = new Date().toISOString().split('T')[0]
        sinceIso = `${today}T00:00:00.000Z`
      } else {
        // Last 7 days including today
        sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      // Fetch check-ins from user's groups with user profile data already joined
      const { data: groupCheckins, error } = await listGroupFeed(user.userId, sinceIso)
      if (error) throw error

      if (groupCheckins) {
        console.log('[SanghaFeed] Received check-ins:', groupCheckins)
        setCheckins(groupCheckins as any)

        // Build profile map from the embedded user_profile data
        const profileMap = new Map()
        groupCheckins.forEach((checkin: any) => {
          console.log('[SanghaFeed] Processing checkin:', {
            user_id: checkin.user_id,
            user_profile: checkin.user_profile
          })
          if (checkin.user_profile) {
            profileMap.set(checkin.user_id, {
              user_id: checkin.user_profile.user_id,
              display_name: checkin.user_profile.display_name,
              avatar_url: checkin.user_profile.avatar_url,
              is_public: checkin.user_profile.is_public
            })
          }
        })
        console.log('[SanghaFeed] Profile map:', profileMap)
        setPublicProfiles(profileMap)

        // Fetch interactions for these check-ins
        const checkinIds = groupCheckins.map((c: any) => c._id || c.id).filter(Boolean)
        if (checkinIds.length > 0 && currentTenantId) {
          const { data: feedInteractions, error: err2 } = await listByCheckinIds(currentTenantId, checkinIds)
          if (err2) throw err2
          if (feedInteractions) {
            const interactionMap = new Map()
            ;(feedInteractions as any[]).forEach(interaction => {
              const checkinId = interaction.checkin_id
              if (!interactionMap.has(checkinId)) interactionMap.set(checkinId, [])
              interactionMap.get(checkinId).push(interaction)
            })
            setInteractions(interactionMap)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error)
      toast.error('Failed to load group feed')
    } finally {
      setLoading(false)
    }
  }

  // Fetch user's groups for display
  const fetchUserGroups = async () => {
    if (!user?.userId) {
      setGroupsLoading(false)
      return
    }

    try {
      setGroupsLoading(true)

      // Get user's group memberships
      const { data: memberships, error: memError } = await listMembershipsByUser(user.userId)
      if (memError) throw memError

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map((m: any) => m.group_id)

        // Fetch group details
        const { data: groups, error: groupsError } = await supabase
          .from('groups')
          .select('id, name, description')
          .in('id', groupIds)

        if (groupsError) throw groupsError
        if (groups) {
          setUserGroups(groups as UserGroup[])
        }
      } else {
        setUserGroups([])
      }
    } catch (error) {
      console.error('Failed to fetch user groups:', error)
      setUserGroups([])
    } finally {
      setGroupsLoading(false)
    }
  }

  const handleUserClick = (userId: string) => {
    const profile = publicProfiles.get(userId)
    if (profile && profile.is_public && userId !== user?.userId) {
      setSelectedUserId(userId)
    }
  }

  const toggleCheckinExpansion = (checkinId: string) => {
    setExpandedCheckins(prev => {
      const newSet = new Set(prev)
      if (newSet.has(checkinId)) {
        newSet.delete(checkinId)
      } else {
        newSet.add(checkinId)
      }
      return newSet
    })
  }

  const addEmojiReaction = async (checkinId: string, emoji: string) => {
    if (!user) return

    try {
      await svcAddEmoji({ tenant_id: currentTenantId || null, user_id: user.userId, checkin_id: checkinId, emoji })

      // Update local state
      setInteractions(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(checkinId) || []
        newMap.set(checkinId, [...existing, {
          user_id: user.userId,
          checkin_id: checkinId,
          interaction_type: 'emoji_reaction',
          emoji: emoji,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        return newMap
      })

      toast.success('Reaction added! 💝')
    } catch (error) {
      console.error('Failed to add reaction:', error)
      toast.error('Failed to add reaction')
    }
  }

  const addComment = async (checkinId: string) => {
    if (!user) return
    
    const comment = commentInputs.get(checkinId)?.trim()
    if (!comment) return

    try {
      await svcAddComment({ tenant_id: currentTenantId || null, user_id: user.userId, checkin_id: checkinId, content: comment })

      // Update local state
      setInteractions(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(checkinId) || []
        newMap.set(checkinId, [...existing, {
          user_id: user.userId,
          checkin_id: checkinId,
          interaction_type: 'comment',
          content: comment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        return newMap
      })

      // Clear comment input
      setCommentInputs(prev => {
        const newMap = new Map(prev)
        newMap.set(checkinId, '')
        return newMap
      })

      toast.success('Comment added! 💬')
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const updateCommentInput = (checkinId: string, value: string) => {
    setCommentInputs(prev => {
      const newMap = new Map(prev)
      newMap.set(checkinId, value)
      return newMap
    })
  }

  const getCheckinInteractions = (checkinId: string) => {
    return interactions.get(checkinId) || []
  }

  const handleFilterModeChange = (mode: 'all' | 'today') => {
    setFilterMode(mode)
    if (mode === 'today') {
      setFilteredMemberId(null)
    }
  }

  const handleMemberSelect = (userId: string | null) => {
    setFilteredMemberId(userId)
  }

  // Memoize filtered and grouped check-ins
  const processedCheckins = useMemo(() => {
    // Step 1: Filter by member if selected
    let filtered = checkins
    if (filterMode === 'all' && filteredMemberId) {
      filtered = checkins.filter(c => c.user_id === filteredMemberId)
    }

    // Step 2: Group by date if in 'all' mode
    if (filterMode === 'all') {
      const grouped = new Map<string, DailyCheckin[]>()
      filtered.forEach(checkin => {
        const date = checkin.checkin_date || checkin.created_at.split('T')[0]
        if (!grouped.has(date)) {
          grouped.set(date, [])
        }
        grouped.get(date)!.push(checkin)
      })

      // Sort dates descending (most recent first)
      const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))
      return { mode: 'grouped' as const, grouped, sortedDates }
    }

    return { mode: 'list' as const, list: filtered }
  }, [checkins, filterMode, filteredMemberId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-bold text-slate-800">My Tribe Feed</h1>

          {/* Group Context */}
          {!groupsLoading && userGroups.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Users className="w-5 h-5 text-blue-600" />
              <p className="text-slate-700 font-medium">
                {userGroups.length === 1 ? (
                  <>Viewing: <span className="text-blue-700 font-semibold">{userGroups[0].name}</span></>
                ) : (
                  <>Your Groups: <span className="text-blue-700 font-semibold">{userGroups.map(g => g.name).join(', ')}</span></>
                )}
              </p>
            </div>
          )}

          {!groupsLoading && userGroups.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-yellow-800 font-medium">You're not in any groups yet</p>
              <p className="text-sm text-yellow-700 mt-1">Join a group to see check-ins from your tribe</p>
            </div>
          )}

          <p className="text-slate-600">
            {filterMode === 'today' ? "Today's check-ins from your group" : "Last 7 days of check-ins from your group"}
          </p>

          {/* Filter Toggle */}
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => handleFilterModeChange('today')}
              className={`px-4 py-2 rounded-xl font-medium transition-all border ${
                filterMode === 'today'
                  ? 'bg-blue-500 text-white shadow-md border-blue-500'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-sm'
              }`}
            >
              Today Only
            </button>
            <button
              onClick={() => handleFilterModeChange('all')}
              className={`px-4 py-2 rounded-xl font-medium transition-all border ${
                filterMode === 'all'
                  ? 'bg-blue-500 text-white shadow-md border-blue-500'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-sm'
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </motion.div>

        {/* Avatar Filter Bar - Only show in 'all' mode */}
        {filterMode === 'all' && (
          <AvatarFilterBar
            checkins={checkins}
            profiles={publicProfiles}
            selectedId={filteredMemberId}
            onSelectMember={handleMemberSelect}
          />
        )}

        {/* Welcome Message */}
        <AnimatePresence>
          {showWelcomeMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Welcome to the Tribe Feed!</h3>
                  <p className="text-sm text-green-700">
                    Your check-in has been shared with your tribe. See how others are doing on their recovery journey.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check-ins */}
        <div className="space-y-4">
          {processedCheckins.mode === 'list' ? (
            // Today mode - simple list
            processedCheckins.list.map((checkin, index) => {
              const profile = publicProfiles.get(checkin.user_id)
              const checkinInteractions = getCheckinInteractions(checkin._id || '')
              const isExpanded = expandedCheckins.has(checkin._id || '')

              return (
                <CheckInCard
                  key={checkin._id}
                  checkin={checkin}
                  profile={profile}
                  interactions={checkinInteractions}
                  isExpanded={isExpanded}
                  currentUserId={user?.userId}
                  commentInput={commentInputs.get(checkin._id || '') || ''}
                  animationIndex={index}
                  onToggleExpand={toggleCheckinExpansion}
                  onUserClick={handleUserClick}
                  onAddEmoji={addEmojiReaction}
                  onAddComment={addComment}
                  onUpdateCommentInput={updateCommentInput}
                />
              )
            })
          ) : (
            // Last 7 Days mode - grouped by date
            processedCheckins.sortedDates.map(date => {
              const dateCheckins = processedCheckins.grouped.get(date) || []

              return (
                <React.Fragment key={date}>
                  <DateSeparator date={date} />
                  {dateCheckins.map((checkin, index) => {
                    const profile = publicProfiles.get(checkin.user_id)
                    const checkinInteractions = getCheckinInteractions(checkin._id || '')
                    const isExpanded = expandedCheckins.has(checkin._id || '')

                    return (
                      <CheckInCard
                        key={checkin._id}
                        checkin={checkin}
                        profile={profile}
                        interactions={checkinInteractions}
                        isExpanded={isExpanded}
                        currentUserId={user?.userId}
                        commentInput={commentInputs.get(checkin._id || '') || ''}
                        animationIndex={index}
                        onToggleExpand={toggleCheckinExpansion}
                        onUserClick={handleUserClick}
                        onAddEmoji={addEmojiReaction}
                        onAddComment={addComment}
                        onUpdateCommentInput={updateCommentInput}
                      />
                    )
                  })}
                </React.Fragment>
              )
            })
          )}
        </div>

        {checkins.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No check-ins shared yet</h3>
            <p className="text-slate-500">Complete your daily check-in and share it with the community!</p>
          </motion.div>
        )}
      </div>

      {/* Public Profile Modal */}
      <AnimatePresence>
        {selectedUserId && (
          <PublicProfile
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default SanghaFeed
