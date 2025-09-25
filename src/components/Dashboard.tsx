
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSobrietyStreak } from '../hooks/useSobrietyStreak';
import { lumi } from '../lib/lumi';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, TrendingUp, Users, CheckCircle, Heart, Award, Target, Sparkles, Star, Zap } from 'lucide-react';
import TribeCheckinCard from './TribeCheckinCard';
import InteractiveCheckinModal from './InteractiveCheckinModal';

interface RecentCheckin {
  _id: string;
  mental_rating: number;
  emotional_rating: number;
  physical_rating: number;
  social_rating: number;
  spiritual_rating: number;
  mood_emoji: string;
  created_at: string;
}

interface TribeCheckin {
  _id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string;
  mental_rating: number;
  emotional_rating: number;
  physical_rating: number;
  social_rating: number;
  spiritual_rating: number;
  mood_emoji: string;
  grateful_for: string[];
  mental_notes: string;
  spiritual_notes: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { streak, stats, isLoading: streakLoading, error: streakError } = useSobrietyStreak();
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<RecentCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tribeCheckins, setTribeCheckins] = useState<TribeCheckin[]>([]);
  const [selectedCheckin, setSelectedCheckin] = useState<TribeCheckin | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch recent check-ins
        const { list: checkins } = await lumi.entities.daily_checkins.list({
          filter: { user_id: user.userId },
          sort: { created_at: -1 },
          limit: 7
        });

        if (checkins && checkins.length > 0) {
          setRecentCheckins(checkins);

          // Check if today's check-in exists
          const today = new Date().toISOString().split('T')[0];
          const todayCheck = checkins.find((checkin) =>
          checkin.created_at.split('T')[0] === today
          );
          setTodayCheckin(todayCheck || null);
        }

        // Fetch tribe check-ins for today
        const today = new Date().toISOString().split('T')[0];
        const { list: tribeCheckinsList } = await lumi.entities.daily_checkins.list({
          filter: {
            created_at: { $gte: `${today}T00:00:00.000Z`, $lt: `${today}T23:59:59.999Z` },
            is_private: false,
            user_id: { $ne: user.userId } // Exclude current user's check-ins
          },
          sort: { created_at: -1 },
          limit: 20
        });

        if (tribeCheckinsList && tribeCheckinsList.length > 0) {
          // Get unique user IDs from check-ins
          const userIds = [...new Set(tribeCheckinsList.map(checkin => checkin.user_id))];

          // Fetch user profiles for display names and avatars
          const { list: profiles } = await lumi.entities.user_profiles.list({
            filter: { user_id: { $in: userIds } }
          });

          // Create a map of user profiles
          const profileMap = new Map();
          if (profiles) {
            profiles.forEach(profile => {
              profileMap.set(profile.user_id, profile);
            });
          }

          // Combine check-in data with user profile data
          const enrichedTribeCheckins: TribeCheckin[] = tribeCheckinsList.map(checkin => {
            const profile = profileMap.get(checkin.user_id);
            return {
              ...checkin,
              user_name: profile?.display_name || 'Anonymous',
              user_avatar_url: profile?.avatar_url || '',
              grateful_for: checkin.gratitude || [],
              mental_notes: checkin.mental_notes || '',
              spiritual_notes: checkin.spiritual_notes || ''
            };
          });

          setTribeCheckins(enrichedTribeCheckins);
        } else {
          // For testing purposes, add some mock data
          const mockTribeCheckins: TribeCheckin[] = [
            {
              _id: 'mock1',
              user_id: 'user1',
              user_name: 'Sarah M.',
              user_avatar_url: '',
              mental_rating: 8,
              emotional_rating: 7,
              physical_rating: 9,
              social_rating: 6,
              spiritual_rating: 8,
              mood_emoji: '😊',
              grateful_for: ['My morning meditation', 'Supportive friends'],
              mental_notes: 'Feeling clear and focused today',
              spiritual_notes: 'Found peace in my morning practice',
              created_at: new Date().toISOString()
            },
            {
              _id: 'mock2',
              user_id: 'user2',
              user_name: 'Alex R.',
              user_avatar_url: '',
              mental_rating: 6,
              emotional_rating: 5,
              physical_rating: 7,
              social_rating: 8,
              spiritual_rating: 6,
              mood_emoji: '😌',
              grateful_for: ['Family support', 'A good night\'s sleep'],
              mental_notes: 'Taking it one day at a time',
              spiritual_notes: 'Grateful for this journey',
              created_at: new Date().toISOString()
            },
            {
              _id: 'mock3',
              user_id: 'user3',
              user_name: 'Jordan K.',
              user_avatar_url: '',
              mental_rating: 9,
              emotional_rating: 8,
              physical_rating: 8,
              social_rating: 9,
              spiritual_rating: 9,
              mood_emoji: '🌟',
              grateful_for: ['Progress in recovery', 'Beautiful weather'],
              mental_notes: 'Feeling strong and optimistic',
              spiritual_notes: 'Connected to my higher purpose',
              created_at: new Date().toISOString()
            }
          ];
          setTribeCheckins(mockTribeCheckins);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const getAverageRating = (checkin: RecentCheckin) => {
    return Math.round((
    checkin.mental_rating +
    checkin.emotional_rating +
    checkin.physical_rating +
    checkin.social_rating +
    checkin.spiritual_rating) /
    5);
  };

  const getWeeklyAverage = () => {
    if (recentCheckins.length === 0) return 0;
    const total = recentCheckins.reduce((sum, checkin) => sum + getAverageRating(checkin), 0);
    return Math.round(total / recentCheckins.length);
  };

  if (loading || streakLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-700 font-medium">Loading your journey...</p>
        </div>
      </div>);

  }

  // Display streak error if there's an issue
  const displayStreak = streakError ? 0 : streak;
  const streakText = streakError ? 'Unable to load' : 'days strong';

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4">

          <h1 className="font-bold text-secondary-800 text-3xl">
            Welcome back, {user?.userName}! ✨
          </h1>
          <p className="text-secondary-600 text-xl font-medium">
            Your recovery journey shines brighter every day
          </p>
        </motion.div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Sobriety Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-primary-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:bg-primary-700 transition-all duration-300 hover-lift">

            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/40">
                <Award className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <span className="text-xs text-white font-bold tracking-wider drop-shadow-sm">STREAK</span>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white drop-shadow-sm">{displayStreak}</div>
              <div className="text-sm text-white font-medium drop-shadow-sm">{streakText}</div>
              {streakError &&
              <div className="text-xs text-white/95 drop-shadow-sm">
                  Set your sobriety date in profile
                </div>
              }
            </div>
          </motion.div>

          {/* Today's Check-in Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${todayCheckin ? 'bg-success-600 hover:bg-success-700' : 'bg-warning-600 hover:bg-warning-700'} text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover-lift`}>

            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/40">
                <CheckCircle className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <span className="text-xs text-white font-bold tracking-wider drop-shadow-sm">TODAY</span>
            </div>
            <div className="space-y-2">
              {todayCheckin ?
              <>
                  <div className="text-4xl font-bold text-white drop-shadow-sm">
                    {getAverageRating(todayCheckin)}/10
                  </div>
                  <div className="text-sm text-white font-medium drop-shadow-sm">wellbeing score</div>
                </> :

              <>
                  <div className="text-3xl font-bold text-white drop-shadow-sm">Ready</div>
                  <div className="text-sm text-white font-medium drop-shadow-sm">check-in awaits</div>
                </>
              }
            </div>
          </motion.div>

          {/* Weekly Average */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-info-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:bg-info-700 transition-all duration-300 hover-lift">

            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/40">
                <TrendingUp className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <span className="text-xs text-white font-bold tracking-wider drop-shadow-sm">WEEK</span>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white drop-shadow-sm">{getWeeklyAverage()}/10</div>
              <div className="text-sm text-white font-medium drop-shadow-sm">average score</div>
            </div>
          </motion.div>

          {/* Community */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-accent-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:bg-accent-700 transition-all duration-300 hover-lift">

            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/40">
                <Users className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <span className="text-xs text-white font-bold tracking-wider drop-shadow-sm">SANGHA</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white drop-shadow-sm">Active</div>
              <div className="text-sm text-white font-medium drop-shadow-sm">community</div>
            </div>
          </motion.div>
        </div>

        {/* Tribe Check-ins */}
        {tribeCheckins.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-secondary-100 shadow-lg hover:shadow-xl transition-all duration-300 p-8"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-accent-600" />
              <h3 className="text-2xl font-bold text-secondary-800">Today's Check-ins</h3>
              <Sparkles className="w-5 h-5 text-warning-500 animate-bounce-gentle" />
            </div>

            <div className="flex overflow-x-auto space-x-4 p-4 scrollbar-hide">
              {tribeCheckins.map((checkin) => (
                <TribeCheckinCard
                  key={checkin._id}
                  checkin={checkin}
                  onSelect={() => setSelectedCheckin(checkin)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Check-in Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-secondary-100 shadow-lg hover:shadow-xl transition-all duration-300 p-8">

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-success-600 rounded-3xl flex items-center justify-center shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-secondary-800">Daily Check-in</h3>
                <p className="text-secondary-600">
                  {todayCheckin ? 'Update your wellbeing' : 'How are you feeling today?'}
                </p>
              </div>
            </div>
            
            {todayCheckin &&
            <div className="mb-6 p-4 bg-success-50 rounded-2xl border border-success-200">
                <div className="flex items-center justify-between">
                  <span className="text-success-700 font-medium">Today's mood:</span>
                  <span className="text-2xl">{todayCheckin.mood_emoji}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-success-700 font-medium">Overall score:</span>
                  <span className="text-xl font-bold text-success-800">
                    {getAverageRating(todayCheckin)}/10
                  </span>
                </div>
              </div>
            }
            
            <Link
              to="/checkin"
              className="w-full bg-success-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-success-700 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">

              <CheckCircle className="w-5 h-5" />
              <span>{todayCheckin ? 'Update Check-in' : 'Start Check-in'}</span>
            </Link>
          </motion.div>

          {/* Community Feed Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl border border-secondary-100 shadow-lg hover:shadow-xl transition-all duration-300 p-8">

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-accent-600 rounded-3xl flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-secondary-800">Sangha Community</h3>
                <p className="text-secondary-600">Connect and support each other</p>
              </div>
            </div>
            
            <div className="mb-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-accent-500 rounded-full animate-gentle-pulse"></div>
                <span className="text-secondary-700 font-medium">Share your journey</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-accent-500 rounded-full animate-gentle-pulse"></div>
                <span className="text-secondary-700 font-medium">Support others</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-accent-500 rounded-full animate-gentle-pulse"></div>
                <span className="text-secondary-700 font-medium">Build connections</span>
              </div>
            </div>
            
            <Link
              to="/sangha"
              className="w-full bg-accent-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-accent-700 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">

              <Users className="w-5 h-5" />
              <span>Join Community</span>
            </Link>
          </motion.div>
        </div>

        {/* Recent Check-ins */}
        {recentCheckins.length > 0 &&
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-secondary-100 shadow-lg hover:shadow-xl transition-all duration-300 p-8">

            <div className="flex items-center space-x-3 mb-6">
              <Calendar className="w-6 h-6 text-primary-600" />
              <h3 className="text-2xl font-bold text-secondary-800">Recent Check-ins</h3>
              <Zap className="w-5 h-5 text-warning-500 animate-bounce-gentle" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              {recentCheckins.slice(0, 7).map((checkin, index) => {
              const rating = getAverageRating(checkin);
              const colorClass = rating >= 8 ? 'bg-success-600 hover:bg-success-700' :
              rating >= 6 ? 'bg-warning-600 hover:bg-warning-700' : 'bg-accent-600 hover:bg-accent-700';

              return (
                <div
                  key={checkin._id}
                  className={`${colorClass} rounded-2xl p-4 text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 hover-lift`}>

                    <div className="text-2xl mb-2">{checkin.mood_emoji}</div>
                    <div className="text-lg font-bold mb-1">
                      {rating}/10
                    </div>
                    <div className="text-xs text-white drop-shadow-sm">
                      {new Date(checkin.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                    </div>
                  </div>);

            })}
            </div>
          </motion.div>
        }

        {/* Motivational Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-secondary-800 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl hover:bg-secondary-900 transition-all duration-300 text-center">

          <Star className="w-12 h-12 mx-auto mb-4 animate-float" />
          <blockquote className="text-xl font-medium mb-4">
            "Recovery is not a race. You don't have to feel guilty if it takes you longer than you thought it would."
          </blockquote>
          <cite className="text-white/90 opacity-90">— Recovery Community</cite>
          <div className="flex justify-center space-x-2 mt-4">
            <Sparkles className="w-4 h-4 animate-bounce-gentle" />
            <Sparkles className="w-4 h-4 animate-bounce-gentle" style={{ animationDelay: '0.2s' }} />
            <Sparkles className="w-4 h-4 animate-bounce-gentle" style={{ animationDelay: '0.4s' }} />
          </div>
        </motion.div>
      </div>

      {/* Interactive Check-in Modal */}
      <AnimatePresence>
        {selectedCheckin && (
          <InteractiveCheckinModal
            checkin={selectedCheckin}
            onClose={() => setSelectedCheckin(null)}
          />
        )}
      </AnimatePresence>
    </div>);

};

export default Dashboard;