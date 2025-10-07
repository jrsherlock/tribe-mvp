import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, TrendingUp, Eye, Send, User, Brain, HeartHandshake, Activity, Users, Sparkles } from 'lucide-react'

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

interface CheckInCardProps {
  checkin: DailyCheckin
  profile: UserProfile | undefined
  interactions: FeedInteraction[]
  isExpanded: boolean
  currentUserId?: string
  commentInput: string
  animationIndex: number
  onToggleExpand: (id: string) => void
  onUserClick: (userId: string) => void
  onAddEmoji: (checkinId: string, emoji: string) => void
  onAddComment: (checkinId: string) => void
  onUpdateCommentInput: (checkinId: string, value: string) => void
}

const mepssCategories = [
  { key: 'mental', label: 'Mental', icon: Brain, color: 'text-blue-600' },
  { key: 'emotional', label: 'Emotional', icon: HeartHandshake, color: 'text-purple-600' },
  { key: 'physical', label: 'Physical', icon: Activity, color: 'text-green-600' },
  { key: 'social', label: 'Social', icon: Users, color: 'text-orange-600' },
  { key: 'spiritual', label: 'Spiritual', icon: Sparkles, color: 'text-indigo-600' }
]

const reactionEmojis = ['❤️', '💪', '🙏', '👏', '🌟', '🤗', '✨', '🎉']

const CheckInCard: React.FC<CheckInCardProps> = memo(({
  checkin,
  profile,
  interactions,
  isExpanded,
  currentUserId,
  commentInput,
  animationIndex,
  onToggleExpand,
  onUserClick,
  onAddEmoji,
  onAddComment,
  onUpdateCommentInput
}) => {
  // Check if there's expandable content (notes or extra gratitude items)
  const hasExpandableContent = () => {
    // Check for any MEPSS notes
    const hasNotes = mepssCategories.some(category => {
      const notes = checkin[`${category.key}_notes` as keyof DailyCheckin] as string
      const emojis = checkin[`${category.key}_emojis` as keyof DailyCheckin] as string[] || []
      return notes || emojis.length > 0
    })

    // Check for extra gratitude items (more than 2)
    const hasExtraGratitude = (checkin.gratitude?.length || 0) > 2

    return hasNotes || hasExtraGratitude
  }

  const formatTimeAgo = (dateString: string) => {
    // Convert both dates to Central Time for accurate comparison
    const now = new Date()
    const nowCentral = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))

    const checkDate = new Date(dateString)
    const checkDateCentral = new Date(checkDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }))

    const diffInMs = nowCentral.getTime() - checkDateCentral.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'Yesterday'
    return `${diffInDays}d ago`
  }

  const getEmojiCounts = () => {
    const emojiReactions = interactions.filter(i => i.interaction_type === 'emoji_reaction')
    const counts: Record<string, number> = {}
    
    emojiReactions.forEach(reaction => {
      if (reaction.emoji) {
        counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1
      }
    })
    
    return counts
  }

  const getComments = () => {
    return interactions.filter(i => i.interaction_type === 'comment')
  }

  const getUserDisplayName = (userId: string) => {
    if (userId === currentUserId) return 'You'
    return profile?.display_name || 'Anonymous'
  }

  const emojiCounts = getEmojiCounts()
  const comments = getComments()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + animationIndex * 0.05 }}
      className="bg-white rounded-xl shadow-md overflow-hidden"
    >
      {/* Card Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-start space-x-3">
          <div
            className="w-12 h-12 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all flex-shrink-0"
            onClick={() => onUserClick(checkin.user_id)}
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
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onUserClick(checkin.user_id)}
                className="font-semibold text-slate-800 hover:text-blue-600 transition-colors truncate"
              >
                {profile?.display_name || 'Anonymous'}
              </button>
              {profile?.is_public && checkin.user_id !== currentUserId && (
                <Eye size={14} className="text-slate-400 flex-shrink-0" />
              )}
              <span className="text-2xl flex-shrink-0">{checkin.mood_emoji}</span>
            </div>
            <div className="text-sm text-slate-500">
              {formatTimeAgo(checkin.created_at)} • Daily Check-in
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* MEPSS Ratings Summary */}
        <div className="flex items-center justify-between mb-4 gap-2">
          {mepssCategories.map(category => {
            const IconComponent = category.icon
            const rating = checkin[`${category.key}_rating` as keyof DailyCheckin] as number
            const emojis = checkin[`${category.key}_emojis` as keyof DailyCheckin] as string[] || []
            
            return (
              <div key={category.key} className="flex flex-col items-center flex-1">
                <div className={`w-6 h-6 mb-1 ${category.color}`}>
                  <IconComponent className="w-full h-full" />
                </div>
                <div className="text-lg font-bold text-slate-800">{rating}</div>
                <div className="text-xs text-slate-500 truncate max-w-full">{category.label}</div>
                {emojis.length > 0 && (
                  <div className="text-xs mt-0.5">
                    {emojis.slice(0, 2).join('')}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Gratitude Preview */}
        {checkin.gratitude && checkin.gratitude.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Grateful for:</span>
            </div>
            <div className="text-sm text-slate-700">
              {checkin.gratitude.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex items-start space-x-1">
                  <span className="text-blue-600 flex-shrink-0">•</span>
                  <span>{item}</span>
                </div>
              ))}
              {checkin.gratitude.length > 2 && (
                <button
                  onClick={() => onToggleExpand(checkin._id || '')}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-1 font-medium"
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
                  <div key={category.key} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <category.icon className={`w-4 h-4 ${category.color}`} />
                      <span className="text-sm font-medium text-slate-700">{category.label}</span>
                      {emojis.length > 0 && (
                        <div className="text-sm">
                          {emojis.join(' ')}
                        </div>
                      )}
                    </div>
                    {notes && (
                      <p className="text-sm text-slate-600">{notes}</p>
                    )}
                  </div>
                )
              })}
              
              {checkin.gratitude && checkin.gratitude.length > 2 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">All Gratitude</span>
                  </div>
                  <div className="space-y-1">
                    {checkin.gratitude.map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-1 text-sm text-slate-700">
                        <span className="text-blue-600 flex-shrink-0">•</span>
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
                className="bg-slate-100 rounded-full px-3 py-1 text-sm flex items-center space-x-1"
              >
                <span>{emoji}</span>
                <span className="text-slate-600 font-medium">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Comments Section */}
        {comments.length > 0 && (
          <div className="space-y-2 mb-4">
            {comments.map((comment, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-slate-800 text-sm">
                    {getUserDisplayName(comment.user_id)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatTimeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onToggleExpand(checkin._id || '')}
              className={`flex items-center space-x-2 transition-colors relative ${
                hasExpandableContent()
                  ? 'text-blue-600 hover:text-blue-700 font-semibold'
                  : 'text-slate-500 hover:text-blue-500'
              }`}
            >
              <TrendingUp size={18} className={hasExpandableContent() ? 'animate-pulse' : ''} />
              <span className="text-sm font-medium">{isExpanded ? 'Less' : 'Details'}</span>
              {hasExpandableContent() && !isExpanded && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              )}
            </button>

            <button className="flex items-center space-x-2 text-slate-500 hover:text-blue-500 transition-colors">
              <MessageCircle size={18} />
              <span className="text-sm font-medium">{comments.length}</span>
            </button>
          </div>

          {/* Quick Emoji Reactions */}
          <div className="flex items-center space-x-1">
            {reactionEmojis.slice(0, 4).map(emoji => (
              <button
                key={emoji}
                onClick={() => onAddEmoji(checkin._id || '', emoji)}
                className="text-lg hover:scale-125 transition-transform p-1"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Comment Input */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Add a supportive comment..."
            value={commentInput}
            onChange={(e) => onUpdateCommentInput(checkin._id || '', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onAddComment(checkin._id || '')}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
          />
          <button
            onClick={() => onAddComment(checkin._id || '')}
            disabled={!commentInput.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  )
})

CheckInCard.displayName = 'CheckInCard'

export default CheckInCard

