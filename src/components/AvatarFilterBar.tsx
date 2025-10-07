import React, { useMemo } from 'react'
import { User, X } from 'lucide-react'

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
      
      <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        {uniqueUsers.map(({ userId, profile, count }) => {
          const isSelected = selectedId === userId
          
          return (
            <button
              key={userId}
              onClick={() => onSelectMember(userId)}
              className={`flex-shrink-0 flex flex-col items-center space-y-1 transition-all ${
                isSelected ? 'scale-105' : 'hover:scale-105'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-all ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : 'ring-1 ring-slate-200 hover:ring-blue-300'
                } ${profile?.avatar_url ? '' : 'bg-blue-500'}`}
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
              <div className="text-center">
                <p className={`text-xs font-medium truncate max-w-[60px] ${
                  isSelected ? 'text-blue-600' : 'text-slate-600'
                }`}>
                  {profile?.display_name || 'Anonymous'}
                </p>
                <p className="text-xs text-slate-400">{count}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AvatarFilterBar

