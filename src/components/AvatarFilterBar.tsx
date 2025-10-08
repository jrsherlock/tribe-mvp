import React, { useMemo, useState } from 'react'
import { User, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface UserProfile {
  _id?: string
  user_id: string
  display_name: string
  avatar_url: string
  is_public: boolean
}

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

interface AvatarFilterBarProps {
  checkins: DailyCheckin[]
  profiles: Map<string, UserProfile>
  selectedId: string | null
  onSelectMember: (userId: string | null) => void
}

const AvatarFilterBar: React.FC<AvatarFilterBarProps> = ({
  checkins,
  profiles,
  selectedId,
  onSelectMember
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Derive unique users from checkins
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, { userId: string; profile: UserProfile | undefined; count: number }>()

    checkins.forEach(checkin => {
      const existing = userMap.get(checkin.user_id)
      if (existing) {
        existing.count++
      } else {
        userMap.set(checkin.user_id, {
          userId: checkin.user_id,
          profile: profiles.get(checkin.user_id),
          count: 1
        })
      }
    })

    return Array.from(userMap.values()).sort((a, b) => b.count - a.count)
  }, [checkins, profiles])

  if (uniqueUsers.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Filter by Member</h3>
        {selectedId && (
          <button
            onClick={() => onSelectMember(null)}
            className="flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <X size={14} />
            <span>Show All</span>
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible pb-2 pt-14 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        {uniqueUsers.map(({ userId, profile, count }) => {
          const isSelected = selectedId === userId
          const isHovered = hoveredId === userId

          return (
            <div key={userId} className="relative flex-shrink-0">
              <motion.button
                onClick={() => onSelectMember(userId)}
                onMouseEnter={() => setHoveredId(userId)}
                onMouseLeave={() => setHoveredId(null)}
                className="flex flex-col items-center gap-1 focus:outline-none"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Avatar Container with macOS Dock-style magnification */}
                <motion.div
                  className="relative"
                  animate={{
                    scale: isHovered ? 1.2 : isSelected ? 1.05 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {/* Avatar - clean design like Dashboard */}
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Check-in count badge */}
                  <motion.div
                    className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {count}
                  </motion.div>
                </motion.div>

                {/* Name label */}
                <div className="text-center max-w-[70px]">
                  <p className={`text-xs font-medium truncate transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-slate-600'
                  }`}>
                    {profile?.display_name || 'Anonymous'}
                  </p>
                </div>
              </motion.button>

              {/* Tooltip on hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
                  >
                    <div className="bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                      {profile?.display_name || 'Anonymous'}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AvatarFilterBar

