
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSobrietyStreak } from '../hooks/useSobrietyStreak'
import { getOwnProfile, upsertOwnProfile } from '../lib/services/profiles'
import { uploadPhoto } from '../lib/services/storage'
import { useTenant } from '../lib/tenant'
import { motion } from 'framer-motion'
import {User, Calendar, Award, TrendingUp, Edit3, Save, X, Camera, Mail, MapPin, Phone, Globe, Lock, Upload} from 'lucide-react'
import toast from 'react-hot-toast'
import PhotoAlbums from './PhotoAlbums'

interface UserProfile {
  id?: string
  user_id: string
  display_name: string
  bio: string
  avatar_url: string
  sobriety_date: string
  location: string
  email: string
  phone: string
  is_public: boolean
  created_at: string
  updated_at: string
}

const UserProfile: React.FC = () => {
  const { user } = useAuth()
  const { currentTenantId, loading: tenantLoading } = useTenant()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'albums'>('profile')
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    sobriety_date: '',
    location: '',
    email: '',
    phone: '',
    is_public: false
  })

  // Use the hook with the profile's sobriety date, and handle null return safely
  const sobrietyStats = useSobrietyStreak(profile?.sobriety_date)
  const streak = sobrietyStats?.totalDays || 0
  const streakLoading = loading // Use the profile loading state

  const fetchInFlight = useRef(false)
  const lastFetchKey = useRef<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const uid = user?.userId
      const tid = currentTenantId || null
      const key = `${uid ?? 'anon'}|${tid ?? 'null'}`
      if (!uid || tenantLoading) return
      if (fetchInFlight.current) return
      if (lastFetchKey.current === key && profile) return
      fetchInFlight.current = true
      lastFetchKey.current = key

      try {
        setLoading(true)
        const { data, error } = await getOwnProfile(user.userId, currentTenantId || null)
        if (error) console.warn('getOwnProfile error', error)
        if (data) {
          const userProfile = data as any
          setProfile(userProfile)
          setEditForm({
            display_name: userProfile.display_name || '',
            bio: userProfile.bio || '',
            avatar_url: userProfile.avatar_url || '',
            sobriety_date: userProfile.sobriety_date ? userProfile.sobriety_date.split('T')[0] : '',
            location: userProfile.location || '',
            email: userProfile.email || '',
            phone: userProfile.phone || '',
            is_public: userProfile.is_public || false
          })
        } else {
          const defaultProfile = {
            user_id: user.userId,
            tenant_id: currentTenantId || null,
            display_name: user.userName || 'Anonymous',
            bio: '',
            avatar_url: '',
            sobriety_date: new Date().toISOString(),
            location: '',
            email: '',
            phone: '',
            is_public: false,
          }
          const { data: created, error: createErr } = await upsertOwnProfile(defaultProfile)
          if (createErr) throw createErr
          const newProf = created as any
          setProfile(newProf)
          setEditForm({
            display_name: newProf.display_name,
            bio: newProf.bio,
            avatar_url: newProf.avatar_url,
            sobriety_date: (newProf.sobriety_date || '').split('T')[0],
            location: newProf.location,
            email: newProf.email,
            phone: newProf.phone,
            is_public: newProf.is_public
          })
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
        fetchInFlight.current = false
      }
    }

    fetchProfile()
  }, [user?.userId, currentTenantId, tenantLoading])

  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return

    try {
      setUploadingAvatar(true)
      const path = `${currentTenantId || 'solo'}/${user.userId}/avatar-${Date.now()}-${file.name}`
      const newAvatarUrl = await uploadPhoto(file, path)

      const updatedData: any = {
        id: (profile as any).id,
        user_id: user.userId,
        tenant_id: currentTenantId || null,
        avatar_url: newAvatarUrl,
      }
      const { data: saved } = await upsertOwnProfile(updatedData)

      if (saved) setProfile(saved as any)
      setEditForm(prev => ({ ...prev, avatar_url: newAvatarUrl }))
      toast.success('Avatar updated successfully! 📸')
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      toast.error('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (!profile || !user) return

    try {
      setSaving(true)
      const updatedProfile = {
        ...editForm,
        sobriety_date: editForm.sobriety_date ? new Date(editForm.sobriety_date).toISOString() : profile.sobriety_date,
        updated_at: new Date().toISOString()
      }

      let saved
      if ((profile as any).id) {
        const { data } = await upsertOwnProfile({ id: (profile as any).id, user_id: user.userId, tenant_id: currentTenantId || null, ...updatedProfile })
        saved = data as any
      } else {
        const { data } = await upsertOwnProfile({ ...updatedProfile, user_id: user.userId, tenant_id: currentTenantId || null })
        saved = data as any
      }

      if (saved) setProfile(saved)
      setIsEditing(false)
      toast.success('Profile updated successfully! 🎉')
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        sobriety_date: profile.sobriety_date ? profile.sobriety_date.split('T')[0] : '',
        location: profile.location || '',
        email: profile.email || '',
        phone: profile.phone || '',
        is_public: profile.is_public || false
      })
    }
    setIsEditing(false)
  }

  if (loading || streakLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  // 60% Primary - Main background
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-bold text-primary-800">My Profile</h1>
          <p className="text-primary-700">Manage your account and track your journey</p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-secondary rounded-2xl p-2 shadow-lg border border-primary-200"
        >
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-accent text-primary-900 shadow-md drop-shadow-sm'
                  : 'text-primary-600 hover:text-primary-800 hover:bg-primary-100'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('albums')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                activeTab === 'albums'
                  ? 'bg-accent text-primary-900 shadow-md drop-shadow-sm'
                  : 'text-primary-600 hover:text-primary-800 hover:bg-primary-100'
              }`}
            >
              Photo Albums
            </button>
          </div>
        </motion.div>

        {activeTab === 'profile' ? (
          <>
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-secondary rounded-3xl p-8 shadow-lg border border-primary-200"
            >
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-2xl font-bold text-primary-800">Profile Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-accent text-primary-900 rounded-xl hover:bg-accent/90 transition-colors drop-shadow-sm"
                  >
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-accent text-primary-900 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 drop-shadow-sm"
                    >
                      <Save size={16} />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-300 text-primary-700 rounded-xl hover:bg-primary-400 transition-colors"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Avatar Section */}
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-accent flex items-center justify-center mx-auto relative">
                      {(isEditing ? editForm.avatar_url : profile?.avatar_url) ? (
                        <img
                          src={isEditing ? editForm.avatar_url : profile?.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-16 h-16 text-primary-900 drop-shadow-sm" />
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleAvatarUpload(e.target.files[0])
                          }
                        }}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white hover:bg-primary-600 transition-colors cursor-pointer"
                      >
                        <Camera size={16} />
                      </label>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <input
                      type="url"
                      placeholder="Or paste avatar URL"
                      value={editForm.avatar_url}
                      onChange={(e) => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                      className="w-full p-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-sm"
                    />
                  )}
                </div>

                {/* Profile Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">Display Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.display_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                        className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary"
                        placeholder="Your display name"
                      />
                    ) : (
                      <div className="text-lg text-primary-800">{profile?.display_name || 'Not set'}</div>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">Bio</label>
                    {isEditing ? (
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent resize-none bg-secondary"
                        rows={3}
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <div className="text-primary-800">{profile?.bio || 'No bio yet'}</div>
                    )}
                  </div>

                  {/* Privacy Setting */}
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">Profile Visibility</label>
                    {isEditing ? (
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isPublic"
                          checked={editForm.is_public}
                          onChange={(e) => setEditForm(prev => ({ ...prev, is_public: e.target.checked }))}
                          className="w-4 h-4 text-accent focus:ring-accent border-primary-300 rounded"
                        />
                        <label htmlFor="isPublic" className="text-primary-700 flex items-center space-x-2">
                          {editForm.is_public ? <Globe size={16} /> : <Lock size={16} />}
                          <span>Make my profile public</span>
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-primary-800">
                        {profile?.is_public ? <Globe size={16} /> : <Lock size={16} />}
                        <span>{profile?.is_public ? 'Public profile' : 'Private profile'}</span>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <Mail className="inline w-4 h-4 mr-1" />
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary"
                          placeholder="your@email.com"
                        />
                      ) : (
                        <div className="text-primary-800">{profile?.email || 'Not set'}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <Phone className="inline w-4 h-4 mr-1" />
                        Phone
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary"
                          placeholder="Your phone number"
                        />
                      ) : (
                        <div className="text-primary-800">{profile?.phone || 'Not set'}</div>
                      )}
                    </div>
                  </div>

                  {/* Location and Sobriety Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary"
                          placeholder="City, Country"
                        />
                      ) : (
                        <div className="text-primary-800">{profile?.location || 'Not set'}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        Sobriety Date
                      </label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.sobriety_date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, sobriety_date: e.target.value }))}
                          className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary"
                        />
                      ) : (
                        <div className="text-primary-800">
                          {profile?.sobriety_date 
                            ? new Date(profile.sobriety_date).toLocaleDateString()
                            : 'Not set'
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sobriety Streak */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200 text-center"
              >
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-primary-900 drop-shadow-sm" />
                </div>
                <div className="text-3xl font-bold text-primary-800 mb-2">{streak}</div>
                <div className="text-primary-600">Days Sober</div>
                {sobrietyStats?.formattedStreak && (
                  <div className="text-sm text-primary-500 mt-1">{sobrietyStats.formattedStreak}</div>
                )}
              </motion.div>

              {/* Member Since */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200 text-center"
              >
                <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div className="text-lg font-bold text-primary-800 mb-2">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'N/A'
                  }
                </div>
                <div className="text-primary-600">Member Since</div>
              </motion.div>

              {/* Journey Progress */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200 text-center"
              >
                <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="text-lg font-bold text-primary-800 mb-2">Growing</div>
                <div className="text-primary-600">Journey Status</div>
              </motion.div>
            </div>
          </>
        ) : (
          /* Photo Albums Tab */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-secondary rounded-3xl p-8 shadow-lg border border-primary-200"
          >
            <PhotoAlbums isOwnProfile={true} />
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default UserProfile
