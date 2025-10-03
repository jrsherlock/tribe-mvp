
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSobrietyStreak } from '../hooks/useSobrietyStreak';
import { useTenant } from '../lib/tenant';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';
import { listProfilesByUserIds } from '../lib/services/profiles';
import { motion, AnimatePresence } from 'framer-motion';
import { listMembershipsByUser } from '../lib/services/groups';
import { Calendar, TrendingUp, Users, CheckCircle, Heart, Award, Sparkles, Star, Zap, Shield } from 'lucide-react';
import TribeCheckinCard from './TribeCheckinCard';
import InteractiveCheckinModal from './InteractiveCheckinModal';
import type { Checkin } from '../lib/services/checkins';
import type { GroupMembership as GroupMembershipRow } from '../lib/services/groups';

interface UserProfile { user_id: string; display_name?: string | null; avatar_url?: string | null }
interface CheckinGroupShare { checkin_id: string; group_id: string }


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
  const { currentTenantId } = useTenant();
  const { role, isSuperUser, isFacilityAdmin, canCreateFacilities, loading: roleLoading } = useUserRole(currentTenantId);
  const { streak, isLoading: streakLoading, error: streakError } = useSobrietyStreak();
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
        let q1 = supabase.from('daily_checkins').select('*').eq('user_id', user.userId)
        if (currentTenantId) q1 = q1.eq('tenant_id', currentTenantId); else q1 = q1.is('tenant_id', null)
        const { data: checkins, error: e1 } = await q1.order('created_at', { ascending: false }).limit(7)
        if (e1) throw e1

        if (checkins && checkins.length > 0) {
          setRecentCheckins((checkins ?? []) as unknown as RecentCheckin[]);

          // Check if today's check-in exists
          const today = new Date().toISOString().split('T')[0];
          const todayCheck = ((checkins ?? []) as unknown as RecentCheckin[])
            .find((c) => (c.created_at as string).split('T')[0] === today) || null;
          setTodayCheckin(todayCheck);
        }

        // Fetch tribe check-ins for today
        if (currentTenantId) {
          const today = new Date().toISOString().split('T')[0];
          const { data: mems } = await listMembershipsByUser(user.userId)
          const groupMems = (mems ?? []) as GroupMembershipRow[]
          const myGroupIds: string[] = groupMems.map(m => m.group_id)

          let tribeCheckinsList: Checkin[] = []
          if (myGroupIds.length > 0) {
            const { data: shareRows, error: eShares } = await supabase
              .from('checkin_group_shares')
              .select('checkin_id')
              .in('group_id', myGroupIds)
            if (eShares) throw eShares

            const checkinIds = [...new Set(((shareRows ?? []) as CheckinGroupShare[]).map(r => r.checkin_id))]
            if (checkinIds.length > 0) {
              const { data: rows, error: e2 } = await supabase
                .from('daily_checkins')
                .select('*')
                .eq('tenant_id', currentTenantId)
                .eq('is_private', false)
                .neq('user_id', user.userId)
                .in('id', checkinIds)
                .gte('created_at', `${today}T00:00:00.000Z`).lt('created_at', `${today}T23:59:59.999Z`)
                .order('created_at', { ascending: false })
                .limit(20)
              if (e2) throw e2
              tribeCheckinsList = (rows ?? []) as Checkin[]
            }
          }

          if (tribeCheckinsList && tribeCheckinsList.length > 0) {
            const userIds = [...new Set(tribeCheckinsList.map(checkin => checkin.user_id))];
            const { data: profiles } = await listProfilesByUserIds(userIds)
            const profileMap = new Map<string, UserProfile>();
            if (profiles) {
              (profiles as UserProfile[]).forEach((profile) => {
                profileMap.set(profile.user_id, profile);
              });
            }

            const enrichedTribeCheckins: TribeCheckin[] = (tribeCheckinsList as Checkin[]).map((checkin: Checkin) => {
              const profile = profileMap.get(checkin.user_id);
              const id = checkin.id as string | undefined;
              return {
                _id: id ?? `${checkin.user_id}-${checkin.created_at}`,
                user_id: checkin.user_id,
                user_name: profile?.display_name || 'Anonymous',
                user_avatar_url: profile?.avatar_url || '',
                mental_rating: checkin.mental_rating,
                emotional_rating: checkin.emotional_rating,
                physical_rating: checkin.physical_rating,
                social_rating: checkin.social_rating,
                spiritual_rating: checkin.spiritual_rating,
                mood_emoji: checkin.mood_emoji,
                grateful_for: checkin.gratitude || [],
                mental_notes: checkin.mental_notes || '',
                spiritual_notes: checkin.spiritual_notes || '',
                created_at: checkin.created_at as string
              } as TribeCheckin;
            });

            setTribeCheckins(enrichedTribeCheckins);
          }
        } else {
          // For testing purposes, add some mock data with proper UUIDs
          const mockTribeCheckins: TribeCheckin[] = [
            {
              _id: '550e8400-e29b-41d4-a716-446655440001',
              user_id: '550e8400-e29b-41d4-a716-446655440011',
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
              _id: '550e8400-e29b-41d4-a716-446655440002',
              user_id: '550e8400-e29b-41d4-a716-446655440012',
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
              _id: '550e8400-e29b-41d4-a716-446655440003',
              user_id: '550e8400-e29b-41d4-a716-446655440013',
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
  }, [user, currentTenantId]);

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


  // Determine if user should see admin link
  const showAdmin = isSuperUser || isFacilityAdmin || role === 'ADMIN';

  // Get display name for role badge
  const getRoleBadgeText = () => {
    if (role === 'SUPERUSER') return '👑 Super Admin';
    if (role === 'OWNER') return '🏢 Facility Owner';
    if (role === 'ADMIN') return '⚙️ Facility Admin';
    if (role === 'MEMBER') return '👤 Member';
    return '✨ Basic User';
  };

  const getRoleBadgeColor = () => {
    if (role === 'SUPERUSER') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (role === 'OWNER') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (role === 'ADMIN') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (role === 'MEMBER') return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-sand-100 text-sand-800 border-sand-300';
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

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h1 className="font-bold text-secondary-800 text-3xl">
              Welcome back, {user?.email ?? 'Friend'}! ✨
            </h1>
            {role && (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor()}`}>
                {isSuperUser && <Shield className="w-3 h-3" />}
                {getRoleBadgeText()}
              </span>
            )}
          </div>
          <p className="text-secondary-600 text-xl font-medium">
            Your recovery journey shines brighter every day
          </p>
        </motion.div>

        {/* Tenant/Groups CTA */}
        {(!currentTenantId) ? (
          <div className="max-w-3xl mx-auto mb-6 p-4 border rounded-xl bg-sage-50 text-sand-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Enable Facility Features</div>
                <div className="text-sm text-sand-700">
                  {canCreateFacilities
                    ? 'Create a facility to unlock groups and community sharing.'
                    : 'Join a facility to unlock groups and community sharing.'}
                </div>
              </div>
              {canCreateFacilities ? (
                <Link to="/tenant/setup" className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg transition-colors">
                  Create Facility
                </Link>
              ) : (
                <div className="text-sm text-sand-600">
                  Contact an admin to join
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto mb-6 p-3 border rounded-xl bg-secondary-50 text-sand-800 flex items-center justify-between">
            <div className="text-sm">Manage your facility groups</div>
            <Link to="/groups" className="px-3 py-2 bg-secondary-700 hover:bg-secondary-800 text-white rounded-lg text-sm transition-colors">
              Open Groups
            </Link>
          </div>
        )}
        {showAdmin && (
          <div className="max-w-3xl mx-auto -mt-4 mb-4 text-right">
            <Link to="/admin" className="inline-block px-3 py-2 border rounded-lg text-sand-800 hover:bg-secondary-50 transition-colors">
              Open Admin
            </Link>
          </div>
        )}

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
              {['Share your journey', 'Support others', 'Build connections'].map((text, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-accent-500 rounded-full animate-gentle-pulse"></div>
                  <span className="text-secondary-700 font-medium">{text}</span>
                </div>
              ))}
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
              {recentCheckins.slice(0, 7).map((checkin) => {
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
            {[0, 0.2, 0.4].map((delay, index) => (
              <Sparkles
                key={index}
                className="w-4 h-4 animate-bounce-gentle"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
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