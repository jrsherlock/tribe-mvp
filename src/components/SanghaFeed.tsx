
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {Heart, MessageCircleDashed as MessageCircle, Share2, Calendar, Award, User, Users, TrendingUp, Eye, Send, Smile, Brain, HeartHandshake, Activity, Sparkles, CheckCircle} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { lumi } from '../lib/lumi'
import toast from 'react-hot-toast'
import PublicProfile from './PublicProfile'

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
  const location = useLocation()
  const [checkins, setCheckins] = useState<DailyCheckin[]>([])
  const [publicProfiles, setPublicProfiles] = useState<Map<string, UserProfile>>(new Map())
  const [interactions, setInteractions] = useState<Map<string, FeedInteraction[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [expandedCheckins, setExpandedCheckins] = useState<Set<string>>(new Set())
  const [commentInputs, setCommentInputs] = useState<Map<string, string>>(new Map())
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'today'>('all')

  const reactionEmojis = ['❤️', '💪', '🙏', '👏', '🌟', '🤗', '✨', '🎉']

  const mepssCategories = [
    { key: 'mental', label: 'Mental', icon: Brain, color: 'text-primary-600' },
    { key: 'emotional', label: 'Emotional', icon: HeartHandshake, color: 'text-accent' },
    { key: 'physical', label: 'Physical', icon: Activity, color: 'text-primary-700' },
    { key: 'social', label: 'Social', icon: Users, color: 'text-accent/80' },
    { key: 'spiritual', label: 'Spiritual', icon: Sparkles, color: 'text-primary-800' }
  ]

  useEffect(() => {
    fetchFeed()
  }, [filterMode])

  // Check URL params for filter mode
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const filter = urlParams.get('filter')
    if (filter === 'today') {
      setFilterMode('today')
    }
  }, [location.search])

  // Fetch profiles after checkins are loaded
  useEffect(() => {
    if (checkins.length > 0) {
      fetchPublicProfiles()
    }
  }, [checkins])

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
    try {
      setLoading(true)

      // Determine date filter based on mode
      let dateFilter = {}
      if (filterMode === 'today') {
        const today = new Date().toISOString().split('T')[0]
        dateFilter = {
          created_at: {
            $gte: `${today}T00:00:00.000Z`,
            $lt: `${today}T23:59:59.999Z`
          }
        }
      } else {
        // Fetch public daily check-ins from the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        dateFilter = { created_at: { $gte: sevenDaysAgo } }
      }

      const { list: publicCheckins } = await lumi.entities.daily_checkins.list({
        filter: {
          is_private: false,
          ...dateFilter
        },
        sort: { created_at: -1 }
      })

      if (publicCheckins) {
        setCheckins(publicCheckins)
        
        // Fetch interactions for these check-ins
        const checkinIds = publicCheckins.map(c => c._id).filter(Boolean)
        if (checkinIds.length > 0) {
          const { list: feedInteractions } = await lumi.entities.feed_interactions.list({
            filter: { checkin_id: { $in: checkinIds } }
          })
          
          if (feedInteractions) {
            const interactionMap = new Map()
            feedInteractions.forEach(interaction => {
              const checkinId = interaction.checkin_id
              if (!interactionMap.has(checkinId)) {
                interactionMap.set(checkinId, [])
              }
              interactionMap.get(checkinId).push(interaction)
            })
            setInteractions(interactionMap)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error)
      toast.error('Failed to load community feed')
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicProfiles = async () => {
    try {
      // First, get all unique user IDs from public check-ins
      const userIds = [...new Set(checkins.map(checkin => checkin.user_id))];

      if (userIds.length === 0) return;

      // Fetch profiles for all users who have public check-ins
      // This ensures we get display names even if their profile is private
      const { list: profiles } = await lumi.entities.user_profiles.list({
        filter: { user_id: { $in: userIds } }
      })

      if (profiles) {
        const profileMap = new Map()
        profiles.forEach(profile => {
          profileMap.set(profile.user_id, profile)
        })
        setPublicProfiles(profileMap)
      }
    } catch (error) {
      console.error('Failed to fetch profiles for check-in authors:', error)
      // Fallback: try to fetch all public profiles
      try {
        const { list: publicProfiles } = await lumi.entities.user_profiles.list({
          filter: { is_public: true }
        })

        if (publicProfiles) {
          const profileMap = new Map()
          publicProfiles.forEach(profile => {
            profileMap.set(profile.user_id, profile)
          })
          setPublicProfiles(profileMap)
        }
      } catch (fallbackError) {
        console.error('Failed to fetch public profiles as fallback:', fallbackError)
      }
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
      await lumi.entities.feed_interactions.create({
        user_id: user.userId,
        checkin_id: checkinId,
        interaction_type: 'emoji_reaction',
        emoji: emoji,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

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
      await lumi.entities.feed_interactions.create({
        user_id: user.userId,
        checkin_id: checkinId,
        interaction_type: 'comment',
        content: comment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const checkDate = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - checkDate.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getCheckinInteractions = (checkinId: string) => {
    return interactions.get(checkinId) || []
  }

  const getEmojiCounts = (checkinId: string) => {
    const checkinInteractions = getCheckinInteractions(checkinId)
    const emojiReactions = checkinInteractions.filter(i => i.interaction_type === 'emoji_reaction')
    const counts: Record<string, number> = {}
    
    emojiReactions.forEach(reaction => {
      if (reaction.emoji) {
        counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1
      }
    })
    
    return counts
  }

  const getComments = (checkinId: string) => {
    const checkinInteractions = getCheckinInteractions(checkinId)
    return checkinInteractions.filter(i => i.interaction_type === 'comment')
  }

  const getUserDisplayName = (userId: string) => {
    const profile = publicProfiles.get(userId)
    return profile?.display_name || 'Anonymous'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-bold text-primary-800">Sangha Feed</h1>
          <p className="text-primary-700">
            {filterMode === 'today' ? "Today's check-ins from your community" : "See how your community is doing"}
          </p>

          {/* Filter Toggle */}
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-xl font-medium transition-all border ${
                filterMode === 'all'
                  ? 'bg-accent text-white shadow-md border-accent'
                  : 'bg-white text-primary-700 hover:bg-primary-50 border-primary-200 shadow-sm'
              }`}
            >
              All Recent
            </button>
            <button
              onClick={() => setFilterMode('today')}
              className={`px-4 py-2 rounded-xl font-medium transition-all border ${
                filterMode === 'today'
                  ? 'bg-accent text-white shadow-md border-accent'
                  : 'bg-white text-primary-700 hover:bg-primary-50 border-primary-200 shadow-sm'
              }`}
            >
              Today Only
            </button>
          </div>
        </motion.div>

        {/* Welcome Message */}
        <AnimatePresence>
          {showWelcomeMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-gradient-to-r from-success-50 to-sage-50 border border-success-200 rounded-xl p-4 shadow-soft"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-success-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-success-800">Welcome to the Sangha Feed!</h3>
                  <p className="text-sm text-success-700">
                    Your check-in has been shared with the community. See how others are doing on their recovery journey.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check-ins */}
        <div className="space-y-4">
          {checkins.map((checkin, index) => {
            const profile = publicProfiles.get(checkin.user_id)
            const isExpanded = expandedCheckins.has(checkin._id || '')
            const emojiCounts = getEmojiCounts(checkin._id || '')
            const comments = getComments(checkin._id || '')
            
            return (
              <motion.div
                key={checkin._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="bg-secondary rounded-2xl p-6 shadow-lg border border-primary-200"
              >
                {/* Check-in Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-full overflow-hidden bg-accent flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all"
                    onClick={() => handleUserClick(checkin.user_id)}
                  >
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUserClick(checkin.user_id)}
                        className="font-semibold text-primary-800 hover:text-accent transition-colors"
                      >
                        {profile?.display_name || 'Anonymous'}
                      </button>
                      {profile?.is_public && checkin.user_id !== user?.userId && (
                        <Eye size={14} className="text-primary-400" />
                      )}
                      <span className="text-2xl">{checkin.mood_emoji}</span>
                    </div>
                    <div className="text-sm text-primary-500">
                      {formatTimeAgo(checkin.created_at)} • Daily Check-in
                    </div>
                  </div>
                </div>

                {/* MEPSS Ratings Summary */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {mepssCategories.map(category => {
                    const IconComponent = category.icon
                    const rating = checkin[`${category.key}_rating` as keyof DailyCheckin] as number
                    const emojis = checkin[`${category.key}_emojis` as keyof DailyCheckin] as string[] || []
                    
                    return (
                      <div key={category.key} className="text-center">
                        <div className={`w-8 h-8 mx-auto mb-1 ${category.color}`}>
                          <IconComponent className="w-full h-full" />
                        </div>
                        <div className="text-lg font-bold text-primary-800">{rating}</div>
                        <div className="text-xs text-primary-600">{category.label}</div>
                        {emojis.length > 0 && (
                          <div className="text-sm mt-1">
                            {emojis.slice(0, 2).join('')}
                            {emojis.length > 2 && '...'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Gratitude Preview */}
                {checkin.gratitude && checkin.gratitude.length > 0 && (
                  <div className="bg-primary-50 rounded-xl p-3 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Heart className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium text-primary-700">Grateful for:</span>
                    </div>
                    <div className="text-sm text-primary-800">
                      {checkin.gratitude.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-1">
                          <span className="text-accent">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                      {checkin.gratitude.length > 2 && (
                        <button
                          onClick={() => toggleCheckinExpansion(checkin._id || '')}
                          className="text-accent hover:text-accent/80 text-sm mt-1"
                        >
                          +{checkin.gratitude.length - 2} more
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 mb-4"
                    >
                      {mepssCategories.map(category => {
                        const notes = checkin[`${category.key}_notes` as keyof DailyCheckin] as string
                        const emojis = checkin[`${category.key}_emojis` as keyof DailyCheckin] as string[] || []
                        
                        if (!notes && emojis.length === 0) return null
                        
                        return (
                          <div key={category.key} className="bg-primary-50 rounded-xl p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <category.icon className={`w-4 h-4 ${category.color}`} />
                              <span className="text-sm font-medium text-primary-700">{category.label}</span>
                              {emojis.length > 0 && (
                                <div className="text-sm">
                                  {emojis.join(' ')}
                                </div>
                              )}
                            </div>
                            {notes && (
                              <p className="text-sm text-primary-800">{notes}</p>
                            )}
                          </div>
                        )
                      })}
                      
                      {checkin.gratitude && checkin.gratitude.length > 2 && (
                        <div className="bg-primary-50 rounded-xl p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Heart className="w-4 h-4 text-accent" />
                            <span className="text-sm font-medium text-primary-700">All Gratitude</span>
                          </div>
                          <div className="space-y-1">
                            {checkin.gratitude.map((item, idx) => (
                              <div key={idx} className="flex items-center space-x-1 text-sm text-primary-800">
                                <span className="text-accent">•</span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emoji Reactions */}
                {Object.keys(emojiCounts).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(emojiCounts).map(([emoji, count]) => (
                      <div
                        key={emoji}
                        className="bg-primary-100 rounded-full px-3 py-1 text-sm flex items-center space-x-1"
                      >
                        <span>{emoji}</span>
                        <span className="text-primary-700">{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-primary-200">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleCheckinExpansion(checkin._id || '')}
                      className="flex items-center space-x-2 text-primary-500 hover:text-blue-500 transition-colors"
                    >
                      <TrendingUp size={18} />
                      <span className="text-sm">{isExpanded ? 'Less' : 'Details'}</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-primary-500 hover:text-blue-500 transition-colors">
                      <MessageCircle size={18} />
                      <span className="text-sm">{comments.length}</span>
                    </button>
                  </div>

                  {/* Quick Emoji Reactions */}
                  <div className="flex items-center space-x-1">
                    {reactionEmojis.slice(0, 4).map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addEmojiReaction(checkin._id || '', emoji)}
                        className="text-lg hover:scale-125 transition-transform p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments Section */}
                {comments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {comments.map((comment, idx) => (
                      <div key={idx} className="bg-primary-50 rounded-xl p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-primary-800 text-sm">
                            {getUserDisplayName(comment.user_id)}
                          </span>
                          <span className="text-xs text-primary-500">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-primary-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="mt-4 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add a supportive comment..."
                    value={commentInputs.get(checkin._id || '') || ''}
                    onChange={(e) => updateCommentInput(checkin._id || '', e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment(checkin._id || '')}
                    className="flex-1 p-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-sm"
                  />
                  <button
                    onClick={() => addComment(checkin._id || '')}
                    disabled={!commentInputs.get(checkin._id || '')?.trim()}
                    className="p-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {checkins.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Users className="w-16 h-16 text-primary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary-600 mb-2">No check-ins shared yet</h3>
            <p className="text-primary-500">Complete your daily check-in and share it with the community!</p>
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
