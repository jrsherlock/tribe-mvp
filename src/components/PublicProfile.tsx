
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {User, Calendar, Award, TrendingUp, MapPin, Globe, Lock} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSobrietyStreak } from '../hooks/useSobrietyStreak'
import { lumi } from '../lib/lumi'
import PhotoAlbums from './PhotoAlbums'
import toast from 'react-hot-toast'

interface UserProfile {
  _id?: string
  user_id: string
  display_name: string
  bio: string
  avatar_url: string
  sobriety_date: string
  location: string
  is_public: boolean
  created_at: string
  updated_at: string
}

interface PublicProfileProps {
  userId: string
  onClose: () => void
}

const PublicProfile: React.FC<PublicProfileProps> = ({ userId, onClose }) => {
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'about' | 'albums'>('about')

  const sobrietyStats = useSobrietyStreak(profile?.sobriety_date)
  const streak = sobrietyStats?.totalDays || 0

  useEffect(() => {
    fetchProfile()
  }, [userId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { list: profiles } = await lumi.entities.user_profiles.list({
        filter: { user_id: userId, is_public: true }
      })

      if (profiles && profiles.length > 0) {
        setProfile(profiles[0])
      } else {
        toast.error('Profile not found or not public')
        onClose()
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Failed to load profile')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-secondary rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-secondary rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-accent p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-primary-200 text-xl"
          >
            ×
          </button>
          
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{profile.display_name}</h2>
              <p className="text-white/90 mb-2">{profile.bio}</p>
              {profile.location && (
                <div className="flex items-center space-x-1 text-white/80">
                  <MapPin size={14} />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{streak}</div>
              <div className="text-sm text-white/80">Days Sober</div>
              {sobrietyStats?.formattedStreak && (
                <div className="text-xs text-white/70 mt-1">{sobrietyStats.formattedStreak}</div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-primary-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'about'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-primary-600 hover:text-primary-800'
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab('albums')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'albums'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-primary-600 hover:text-primary-800'
              }`}
            >
              Photo Albums
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'about' ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary-50 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-primary-800 mb-1">{streak}</div>
                  <div className="text-primary-600 text-sm">Days Sober</div>
                </div>

                <div className="bg-primary-50 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-lg font-bold text-primary-800 mb-1">
                    {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-primary-600 text-sm">Member Since</div>
                </div>

                <div className="bg-primary-50 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-lg font-bold text-primary-800 mb-1">Growing</div>
                  <div className="text-primary-600 text-sm">Journey Status</div>
                </div>
              </div>

              {/* Bio Section */}
              {profile.bio && (
                <div className="bg-primary-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-primary-800 mb-3">About</h3>
                  <p className="text-primary-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Journey Info */}
              <div className="bg-primary-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-primary-800 mb-3">Recovery Journey</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-primary-600">Sobriety Date:</span>
                    <span className="font-medium text-primary-800">
                      {new Date(profile.sobriety_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-primary-600">Total Days:</span>
                    <span className="font-medium text-primary-800">{streak} days</span>
                  </div>
                  {sobrietyStats?.formattedStreak && (
                    <div className="flex justify-between items-center">
                      <span className="text-primary-600">Duration:</span>
                      <span className="font-medium text-primary-800">{sobrietyStats.formattedStreak}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <PhotoAlbums isOwnProfile={false} userId={userId} />
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default PublicProfile
