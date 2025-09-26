
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../lib/tenant';
import { getTodayForUser, upsert as upsertCheckin } from '../lib/services/checkins';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Lock, Globe, Plus, X, Heart, Smile, Brain, HeartHandshake, Activity, Users, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import toast from 'react-hot-toast';
import { ToastContent, getToastStyles, therapeuticToasts } from './ui/Toast';
import { supabase } from '../lib/supabase';
import { listGroups, listMembershipsByUser, type Group } from '../lib/services/groups';


interface CheckinData {
  mental_rating: number;
  emotional_rating: number;
  physical_rating: number;
  social_rating: number;
  spiritual_rating: number;
  mental_notes: string;
  emotional_notes: string;
  physical_notes: string;
  social_notes: string;
  spiritual_notes: string;
  mental_emojis: string[];
  emotional_emojis: string[];
  physical_emojis: string[];
  social_emojis: string[];
  spiritual_emojis: string[];
  gratitude: string[];
  is_private: boolean;
  mood_emoji: string;
}

const DailyCheckin: React.FC = () => {
  const { user } = useAuth();
  const { currentTenantId } = useTenant();
  const navigate = useNavigate();
  const [checkinData, setCheckinData] = useState<CheckinData>({
    mental_rating: 5,
    emotional_rating: 5,
    physical_rating: 5,
    social_rating: 5,
    spiritual_rating: 5,
    mental_notes: '',
    emotional_notes: '',
    physical_notes: '',
    social_notes: '',
    spiritual_notes: '',
    mental_emojis: [],
    emotional_emojis: [],
    physical_emojis: [],
    social_emojis: [],
    spiritual_emojis: [],
    gratitude: [''],
    is_private: false,
    mood_emoji: '😊'
  });

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const [existingCheckin, setExistingCheckin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newGratitude, setNewGratitude] = useState('');
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const moodEmojis = ['😊', '😌', '🙂', '😔', '😰', '😡', '🤗', '🥺', '💪', '🙏', '✨', '🌟'];

  const mepssCategories = [
  {
    key: 'mental',
    label: 'Mental',
    color: 'from-sage-600 to-sage-700', // Sage green - darker for better contrast
    description: 'Clarity, focus, mental health',
    icon: Brain
  },
  {
    key: 'emotional',
    label: 'Emotional',
    color: 'from-ocean-600 to-ocean-700', // Ocean blue - calm and stable
    description: 'Feelings, mood, emotional wellbeing',
    icon: HeartHandshake
  },
  {
    key: 'physical',
    label: 'Physical',
    color: 'from-success-600 to-success-700', // Success green - health and vitality
    description: 'Energy, health, physical condition',
    icon: Activity
  },
  {
    key: 'social',
    label: 'Social',
    color: 'from-accent-600 to-accent-700', // Sunrise orange - connection and warmth
    description: 'Relationships, connections, community',
    icon: Users
  },
  {
    key: 'spiritual',
    label: 'Spiritual',
    color: 'from-lavender-600 to-lavender-700', // Lavender - spiritual and peaceful
    description: 'Purpose, meaning, inner peace',
    icon: Sparkles
  }];


  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setActiveEmojiPicker(null);
      }
    };

    if (activeEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeEmojiPicker]);

  useEffect(() => {
    const fetchTodayCheckin = async () => {
      if (!user) return;

      try {
        const { data: rows } = await getTodayForUser(user.userId, currentTenantId || null)
        const checkins = rows ? rows : [] as any[];

        if (checkins && checkins.length > 0) {
          const existing = checkins[0];
          setExistingCheckin(existing);
          setCheckinData({
            mental_rating: existing.mental_rating,
            emotional_rating: existing.emotional_rating,
            physical_rating: existing.physical_rating,
            social_rating: existing.social_rating,
            spiritual_rating: existing.spiritual_rating,
            mental_notes: existing.mental_notes || '',
            emotional_notes: existing.emotional_notes || '',
            physical_notes: existing.physical_notes || '',
            social_notes: existing.social_notes || '',
            spiritual_notes: existing.spiritual_notes || '',
            mental_emojis: existing.mental_emojis || [],
            emotional_emojis: existing.emotional_emojis || [],
            physical_emojis: existing.physical_emojis || [],
            social_emojis: existing.social_emojis || [],
            spiritual_emojis: existing.spiritual_emojis || [],
            gratitude: existing.gratitude || [''],
            is_private: existing.is_private,
            mood_emoji: existing.mood_emoji || '😊'
          });
        }
      } catch (error) {
        console.error('Failed to fetch today\'s check-in:', error);
      }
    };

    fetchTodayCheckin();
  }, [user]);

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!user || !currentTenantId) { setAvailableGroups([]); setSelectedGroupIds([]); return }
      try {
        const [{ data: groupRows }, { data: memRows }] = await Promise.all([
          listGroups(currentTenantId),
          listMembershipsByUser(user.userId)
        ])
        if (!mounted) return
        const mySet = new Set((memRows ?? []).map((r: any) => r.group_id))
        const mine = (groupRows ?? []).filter((g: any) => mySet.has(g.id))
        setAvailableGroups(mine as any)
        if (existingCheckin?.id) {
          const { data: shares } = await supabase
            .from('checkin_group_shares')
            .select('group_id')
            .eq('checkin_id', existingCheckin.id)
          if (mounted && shares) setSelectedGroupIds(shares.map((s: any) => s.group_id))
        }
      } catch (e) {
        console.error('Failed to load groups', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [user, currentTenantId, existingCheckin])


  const handleRatingChange = (category: string, value: number) => {
    setCheckinData((prev) => ({
      ...prev,
      [`${category}_rating`]: value
    }));
  };

  const handleNotesChange = (category: string, value: string) => {
    setCheckinData((prev) => ({
      ...prev,
      [`${category}_notes`]: value
    }));
  };

  const handleEmojiClick = (emojiData: EmojiClickData, category: string) => {
    const emojiKey = `${category}_emojis` as keyof CheckinData;
    const currentEmojis = checkinData[emojiKey] as string[];

    if (currentEmojis.length < 3 && !currentEmojis.includes(emojiData.emoji)) {
      setCheckinData((prev) => ({
        ...prev,
        [emojiKey]: [...currentEmojis, emojiData.emoji]
      }));
    }

    setActiveEmojiPicker(null);
  };

  const removeEmoji = (category: string, emojiToRemove: string) => {
    const emojiKey = `${category}_emojis` as keyof CheckinData;
    const currentEmojis = checkinData[emojiKey] as string[];

    setCheckinData((prev) => ({
      ...prev,
      [emojiKey]: currentEmojis.filter((emoji) => emoji !== emojiToRemove)
    }));
  };

  const addGratitude = () => {
    if (newGratitude.trim()) {
      setCheckinData((prev) => ({
        ...prev,
        gratitude: [...prev.gratitude.filter((g) => g.trim()), newGratitude.trim()]
      }));
      setNewGratitude('');
    }
  };

  const removeGratitude = (index: number) => {
    setCheckinData((prev) => ({
      ...prev,
      gratitude: prev.gratitude.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Show loading toast with therapeutic styling
    const loadingConfig = therapeuticToasts.loadingCheckin(!!existingCheckin);
    const loadingToast = toast.loading(loadingConfig.title, {
      icon: loadingConfig.icon,
      style: getToastStyles('info')
    });

    try {
      setLoading(true);
      const today = new Date().toISOString();

      const id = existingCheckin?.id || existingCheckin?._id
      const checkinPayload = {
        id,
        tenant_id: currentTenantId || null,
        user_id: user.userId,
        checkin_date: today.split('T')[0],
        mental_rating: checkinData.mental_rating,
        emotional_rating: checkinData.emotional_rating,
        physical_rating: checkinData.physical_rating,
        social_rating: checkinData.social_rating,
        spiritual_rating: checkinData.spiritual_rating,
        mental_notes: checkinData.mental_notes,
        emotional_notes: checkinData.emotional_notes,
        physical_notes: checkinData.physical_notes,
        social_notes: checkinData.social_notes,
        spiritual_notes: checkinData.spiritual_notes,
        mental_emojis: checkinData.mental_emojis,
        emotional_emojis: checkinData.emotional_emojis,
        physical_emojis: checkinData.physical_emojis,
        social_emojis: checkinData.social_emojis,
        spiritual_emojis: checkinData.spiritual_emojis,
        gratitude: checkinData.gratitude.filter((g) => g.trim()),
        is_private: checkinData.is_private,
        mood_emoji: checkinData.mood_emoji,
        created_at: today,
        updated_at: today,
      } as any;

      const { data: saved, error: saveErr } = await upsertCheckin(checkinPayload);
      if (saveErr) throw saveErr

      // If sharing to groups: reset shares and insert selected
      if (!checkinData.is_private && saved?.id && currentTenantId) {
        // remove previous shares (if any)
        await supabase.from('checkin_group_shares').delete().eq('checkin_id', saved.id)
        if (selectedGroupIds.length > 0) {
          const rows = selectedGroupIds.map(gid => ({ checkin_id: saved.id as string, group_id: gid }))
          const { error: shareErr } = await supabase.from('checkin_group_shares').insert(rows)
          if (shareErr) throw shareErr
        }
      }

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success toast with therapeutic styling
      const successConfig = therapeuticToasts.checkinSuccess(
        checkinData.is_private,
        !!existingCheckin
      );

      toast.success(
        (t) => (
          <ToastContent
            type={successConfig.type}
            title={successConfig.title}
            message={successConfig.message}
          />
        ),
        {
          duration: successConfig.duration,
          style: getToastStyles(successConfig.type)
        }
      );

      // Navigate to Sangha Feed after successful submission
      setTimeout(() => {
        navigate('/sangha', {
          state: {
            message: checkinData.is_private
              ? 'Check-in saved privately'
              : 'Your check-in has been shared with your groups!'
          }
        });
      }, 1500); // Small delay to let user see the success message

    } catch (error) {
      console.error('Failed to save check-in:', error);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show therapeutic error toast
      const errorConfig = therapeuticToasts.checkinError();
      toast.error(
        (t) => (
          <ToastContent
            type={errorConfig.type}
            title={errorConfig.title}
            message={errorConfig.message}
          />
        ),
        {
          duration: errorConfig.duration,
          style: getToastStyles(errorConfig.type)
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // 60% Primary - Main background
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8 bg-gradient-healing min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4">

        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-sage-500 rounded-full flex items-center justify-center shadow-sage">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-h1 font-display font-bold text-sand-800">Daily Wellness Check-in</h1>
        </div>

        <p className="text-body-lg text-sand-600">
          Take a moment to reflect on your MEPSS wellbeing today
        </p>
        <div className="text-body-sm text-sand-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </motion.div>

      {/* Mood Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-6 shadow-soft border border-sand-200">

        <h2 className="text-h3 font-display font-semibold text-sand-800 mb-4">How are you feeling today?</h2>
        <div className="grid grid-cols-6 gap-3">
          {moodEmojis.map((emoji) =>
          <button
            key={emoji}
            onClick={() => setCheckinData((prev) => ({ ...prev, mood_emoji: emoji }))}
            className={`text-3xl p-3 rounded-lg transition-all duration-200 ${
            checkinData.mood_emoji === emoji ?
            'bg-sage-100 scale-110 shadow-sage border-2 border-sage-300' // Selected state
            : 'bg-sand-50 hover:bg-sage-50 hover:scale-105 border border-sand-200' // Hover state
            }`}>

              {emoji}
            </button>
          )}
        </div>
      </motion.div>

      {/* MEPSS Ratings */}
      {mepssCategories.map((category, index) => {
        const IconComponent = category.icon;
        return (
          <motion.div
            key={category.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-soft border border-sand-200">

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-sand-800">{category.label}</h3>
                  <p className="text-sm text-sand-600">{category.description}</p>
                </div>
              </div>

              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  onClick={() => setActiveEmojiPicker(activeEmojiPicker === category.key ? null : category.key)}
                  className="p-2 bg-sand-100 hover:bg-sand-200 rounded-xl transition-colors"
                  title="Add emojis (up to 3)">

                  <Smile className="w-5 h-5 text-sand-600" />
                </button>

                {/* Emoji Picker */}
                <AnimatePresence>
                  {activeEmojiPicker === category.key &&
                  <motion.div
                    ref={emojiPickerRef}
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 top-12 z-50 shadow-2xl rounded-2xl overflow-hidden">

                      <EmojiPicker
                      onEmojiClick={(emojiData) => handleEmojiClick(emojiData, category.key)}
                      width={300}
                      height={400}
                      searchDisabled={false}
                      skinTonesDisabled={true}
                      previewConfig={{ showPreview: false }} />

                    </motion.div>
                  }
                </AnimatePresence>
              </div>
            </div>

            {/* Selected Emojis */}
            {checkinData[`${category.key}_emojis` as keyof CheckinData] &&
            (checkinData[`${category.key}_emojis` as keyof CheckinData] as string[]).length > 0 &&
            <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {(checkinData[`${category.key}_emojis` as keyof CheckinData] as string[]).map((emoji, emojiIndex) =>
                <div
                  key={emojiIndex}
                  className="flex items-center space-x-1 bg-sand-100 rounded-lg px-2 py-1">

                      <span className="text-lg">{emoji}</span>
                      <button
                    onClick={() => removeEmoji(category.key, emoji)}
                    className="text-sand-500 hover:text-sand-700">

                        <X size={14} />
                      </button>
                    </div>
                )}
                </div>
                {(checkinData[`${category.key}_emojis` as keyof CheckinData] as string[]).length >= 3 &&
              <p className="text-xs text-sand-600 mt-2">Maximum 3 emojis selected</p>
              }
              </div>
            }

            {/* Rating Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary-700">Rating:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-primary-800">
                    {checkinData[`${category.key}_rating` as keyof CheckinData]}
                  </span>
                  <span className="text-sm text-primary-600">/10</span>
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={checkinData[`${category.key}_rating` as keyof CheckinData]}
                onChange={(e) => handleRatingChange(category.key, parseInt(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r ${category.color}`} />


              <div className="flex justify-between text-xs text-primary-500">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <textarea
                placeholder={`How is your ${category.label.toLowerCase()} wellbeing today? Share your thoughts...`}
                value={checkinData[`${category.key}_notes` as keyof CheckinData]}
                onChange={(e) => handleNotesChange(category.key, e.target.value)}
                className="w-full p-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent resize-none bg-secondary"
                rows={2} />

            </div>
          </motion.div>);

      })}

      {/* Gratitude Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200">

        <div className="flex items-center space-x-3 mb-4">
          <Heart className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-sand-800">Gratitude</h3>
        </div>

        <div className="space-y-3">
          {checkinData.gratitude.filter((g) => g.trim()).map((item, index) =>
          <div key={index} className="flex items-center space-x-2">
              <span className="text-accent-600">•</span>
              <span className="flex-1 text-sand-800">{item}</span>
              <button
              onClick={() => removeGratitude(index)}
              className="text-sand-500 hover:text-sand-700">

                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="What are you grateful for today?"
              value={newGratitude}
              onChange={(e) => setNewGratitude(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addGratitude()}
              className="flex-1 p-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-transparent bg-white text-sand-800 placeholder-sand-500" />

            {/* Add Gratitude Button - Fixed contrast */}
            <button
              onClick={addGratitude}
              className="p-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors">

              <Plus size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Privacy Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200">

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {checkinData.is_private ?
            <Lock className="w-5 h-5 text-primary-600" /> :

            <Globe className="w-5 h-5 text-accent" />
            }
            <div>
              <h3 className="font-medium text-primary-800">
                {checkinData.is_private ? 'Private Check-in' : 'Share with groups'}
              </h3>
              <p className="text-sm text-primary-600">
                {checkinData.is_private ?
                'Only you can see this check-in' :
                'Members of the selected groups can see and support you'
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => setCheckinData((prev) => ({ ...prev, is_private: !prev.is_private }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checkinData.is_private ? 'bg-sand-300' : 'bg-accent-600' // Fixed contrast - darker accent for active
            }`}>

            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
              checkinData.is_private ? 'translate-x-1' : 'translate-x-6'}`
              } />

          </button>
        </div>

        {!checkinData.is_private && currentTenantId && availableGroups.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-primary-700 mb-2">Share to groups</div>
            <div className="flex flex-wrap gap-2">
              {availableGroups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setSelectedGroupIds((prev) =>
                        checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                      )
                    }}
                  />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {!checkinData.is_private && currentTenantId && availableGroups.length === 0 && (
          <div className="mt-4 p-3 border rounded-lg bg-sand-50 text-sand-800">
            <div className="text-sm">No groups yet. Please ask your facility admin to add you to a group.</div>
          </div>
        )}


      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="sticky bottom-4">

        {/* Submit Button - Fixed contrast with darker accent colors */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-accent-600 to-accent-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 hover:from-accent-700 hover:to-accent-800">

          {loading ?
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> :

          <>
              <Save className="w-5 h-5" />
              <span>{existingCheckin ? 'Update Check-in' : 'Complete Check-in'}</span>
            </>
          }
        </button>
      </motion.div>
    </div>);

};

export default DailyCheckin;