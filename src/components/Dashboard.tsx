
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSobrietyStreak } from '../hooks/useSobrietyStreak';
import { useUserStreaks } from '../hooks/useUserStreaks';
import { useTenant } from '../lib/tenant';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';
import { listProfilesByUserIds } from '../lib/services/profiles';
import { getCentralTimeToday } from '../lib/utils/timezone';
import { motion, AnimatePresence } from 'framer-motion';
import { listMembershipsByUser } from '../lib/services/groups';
import { Calendar, Users, CheckCircle, Heart, Sparkles, Star, Zap, Shield, Flame, CalendarDays, Smile, CheckCircle2 } from 'lucide-react';
import TribeCheckinCard from './TribeCheckinCard';
import InteractiveCheckinModal from './InteractiveCheckinModal';
import GamifiedKpiCard from './GamifiedKpiCard';
import type { Checkin } from '../lib/services/checkins';
import type { GroupMembership as GroupMembershipRow } from '../lib/services/groups';

interface UserProfile { user_id: string; display_name?: string | null; avatar_url?: string | null }
interface CheckinGroupShare { checkin_id: string; group_id: string }


interface RecentCheckin {
  _id: string;
  user_id: string;
  mental_rating: number;
  emotional_rating: number;
  physical_rating: number;
  social_rating: number;
  spiritual_rating: number;
  mood_emoji: string;
  created_at: string;
  user_name?: string;
  user_avatar_url?: string;
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
  const { role, isSuperUser, isFacilityAdmin, canCreateFacilities } = useUserRole(currentTenantId);
  const { streak, stats, isLoading: streakLoading, error: streakError } = useSobrietyStreak();
  const { streaks, isLoading: streaksLoading } = useUserStreaks();
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<RecentCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tribeCheckins, setTribeCheckins] = useState<TribeCheckin[]>([]);
  const [selectedCheckin, setSelectedCheckin] = useState<TribeCheckin | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get today's date in Central Time Zone
        const today = getCentralTimeToday();

        // Fetch current user's profile for display_name
        const { data: profileData } = await listProfilesByUserIds([user.userId]);
        if (profileData && profileData.length > 0) {
          setUserProfile(profileData[0] as UserProfile);
        }

        // Check if current user has today's check-in
        let q1 = supabase.from('daily_checkins').select('*').eq('user_id', user.userId)
        if (currentTenantId) q1 = q1.eq('tenant_id', currentTenantId); else q1 = q1.is('tenant_id', null)
        const { data: myCheckins, error: e1 } = await q1.gte('checkin_date', today).lte('checkin_date', today).limit(1)
        if (e1) throw e1

        if (myCheckins && myCheckins.length > 0) {
          const todayCheck = myCheckins[0] as unknown as RecentCheckin;
          setTodayCheckin(todayCheck);
        } else {
          setTodayCheckin(null);
        }

        // Fetch today's check-ins from users in shared groups
        if (currentTenantId) {
          const { data: mems } = await listMembershipsByUser(user.userId)
          const groupMems = (mems ?? []) as GroupMembershipRow[]
          const myGroupIds: string[] = groupMems.map(m => m.group_id)

          let todayGroupCheckins: Checkin[] = []
          if (myGroupIds.length > 0) {
            // Get all users in my groups
            const { data: groupMemberRows, error: eGroupMembers } = await supabase
              .from('group_memberships')
              .select('user_id')
              .in('group_id', myGroupIds)
              .neq('user_id', user.userId)
            if (eGroupMembers) throw eGroupMembers

            const groupUserIds = [...new Set((groupMemberRows ?? []).map((r: { user_id: string }) => r.user_id))]

            if (groupUserIds.length > 0) {
              // Fetch today's check-ins from these users
              const { data: rows, error: e2 } = await supabase
                .from('daily_checkins')
                .select('*')
                .eq('tenant_id', currentTenantId)
                .eq('is_private', false)
                .in('user_id', groupUserIds)
                .gte('checkin_date', today)
                .lte('checkin_date', today)
                .order('created_at', { ascending: false })
                .limit(20)
              if (e2) throw e2
              todayGroupCheckins = (rows ?? []) as Checkin[]
            }
          }

          if (todayGroupCheckins && todayGroupCheckins.length > 0) {
            const userIds = [...new Set(todayGroupCheckins.map(checkin => checkin.user_id))];
            console.log('[Dashboard] Fetching profiles for today group check-ins, user IDs:', userIds)

            const { data: profiles, error: profileError } = await listProfilesByUserIds(userIds)
            console.log('[Dashboard] Profiles result:', {
              count: profiles?.length || 0,
              error: profileError,
              profiles: profiles?.map(p => ({ user_id: p.user_id, display_name: p.display_name }))
            })

            const profileMap = new Map<string, UserProfile>();
            if (profiles) {
              (profiles as UserProfile[]).forEach((profile) => {
                profileMap.set(profile.user_id, profile);
              });
            }

            const enrichedCheckins: RecentCheckin[] = (todayGroupCheckins as Checkin[]).map((checkin: Checkin) => {
              const profile = profileMap.get(checkin.user_id);
              console.log('[Dashboard] Enriching checkin:', {
                user_id: checkin.user_id,
                profile_found: !!profile,
                display_name: profile?.display_name || 'Anonymous'
              })

              const id = checkin.id as string | undefined;
              return {
                _id: id ?? `${checkin.user_id}-${checkin.created_at}`,
                user_id: checkin.user_id,
                mental_rating: checkin.mental_rating,
                emotional_rating: checkin.emotional_rating,
                physical_rating: checkin.physical_rating,
                social_rating: checkin.social_rating,
                spiritual_rating: checkin.spiritual_rating,
                mood_emoji: checkin.mood_emoji,
                created_at: checkin.created_at as string,
                user_name: profile?.display_name || 'Anonymous',
                user_avatar_url: profile?.avatar_url || ''
              } as RecentCheckin;
            });

            console.log('[Dashboard] Enriched check-ins:', enrichedCheckins.map(c => ({
              user_id: c.user_id,
              user_name: c.user_name
            })))

            setRecentCheckins(enrichedCheckins);
          } else {
            setRecentCheckins([]);
          }
        } else {
          setRecentCheckins([]);
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
                .gte('checkin_date', today)
                .lte('checkin_date', today)
                .order('created_at', { ascending: false })
                .limit(20)
              if (e2) throw e2
              tribeCheckinsList = (rows ?? []) as Checkin[]
            }
          }

          if (tribeCheckinsList && tribeCheckinsList.length > 0) {
            const userIds = [...new Set(tribeCheckinsList.map(checkin => checkin.user_id))];
            console.log('[Dashboard] Fetching profiles for tribe check-ins, user IDs:', userIds)

            const { data: profiles, error: tribeProfileError } = await listProfilesByUserIds(userIds)
            console.log('[Dashboard] Tribe profiles result:', {
              count: profiles?.length || 0,
              error: tribeProfileError,
              profiles: profiles?.map(p => ({ user_id: p.user_id, display_name: p.display_name }))
            })

            const profileMap = new Map<string, UserProfile>();
            if (profiles) {
              (profiles as UserProfile[]).forEach((profile) => {
                profileMap.set(profile.user_id, profile);
              });
            }

            const enrichedTribeCheckins: TribeCheckin[] = (tribeCheckinsList as Checkin[]).map((checkin: Checkin) => {
              const profile = profileMap.get(checkin.user_id);
              console.log('[Dashboard] Enriching tribe checkin:', {
                user_id: checkin.user_id,
                profile_found: !!profile,
                display_name: profile?.display_name || 'Anonymous'
              })

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
          // Solo mode: No group check-ins to display
          setTribeCheckins([]);
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

  // Format sobriety display based on days
  const formatSobrietyDisplay = () => {
    if (streakError) {
      return { display: '0', label: 'Days' };
    }

    if (!stats || streak === 0) {
      return { display: '0', label: 'Days' };
    }

    const { years, totalDays } = stats;

    if (totalDays < 365) {
      // Less than 1 year: show as "X Days"
      const dayLabel = totalDays === 1 ? 'Day' : 'Days';
      return { display: totalDays.toString(), label: dayLabel };
    } else {
      // 1 year or more: show as "X Year(s) Y Days"
      const yearLabel = years === 1 ? 'Year' : 'Years';
      const remainingDays = totalDays - (years * 365);
      const dayLabel = remainingDays === 1 ? 'Day' : 'Days';

      if (remainingDays === 0) {
        return { display: years.toString(), label: yearLabel };
      } else {
        return {
          display: `${years} ${yearLabel}`,
          label: `${remainingDays} ${dayLabel}`
        };
      }
    }
  };

  const sobrietyDisplay = formatSobrietyDisplay();

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
              Welcome back, {userProfile?.display_name || user?.email || 'Friend'}! ✨
            </h1>
            {role && (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor()}`}>
                {isSuperUser && <Shield className="w-3 h-3" />}
                {getRoleBadgeText()}
              </span>
            )}
          </div>
          <p className="text-secondary-600 text-lg">
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

        {/* Quick Stats Grid - Gamified KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Days Sober */}
          <GamifiedKpiCard
            value={sobrietyDisplay.display}
            label="Days Sober"
            sublabel={sobrietyDisplay.label}
            icon={CalendarDays}
            progress={stats ? Math.min((stats.totalDays / 365) * 100, 100) : 0}
            maxProgress={stats ? `${stats.years}y ${stats.months}m` : undefined}
            gradientFrom="from-green-500"
            gradientTo="to-teal-400"
            delay={0.1}
          />

          {/* Today's Wellbeing Score */}
          <GamifiedKpiCard
            value={todayCheckin ? `${getAverageRating(todayCheckin)}/10` : 'Ready'}
            label="Today"
            sublabel={todayCheckin ? 'wellbeing score' : 'MEPSS check-in awaits'}
            icon={Smile}
            progress={todayCheckin ? (getAverageRating(todayCheckin) / 10) * 100 : 0}
            maxProgress={todayCheckin ? '10/10' : undefined}
            gradientFrom={todayCheckin ? 'from-blue-500' : 'from-amber-500'}
            gradientTo={todayCheckin ? 'to-indigo-400' : 'to-orange-400'}
            delay={0.2}
          />

          {/* Engagement Streak */}
          <GamifiedKpiCard
            value={streaksLoading ? '...' : streaks.engagement_streak}
            label="Streak"
            sublabel={streaksLoading ? 'loading' : `${streaks.engagement_streak === 1 ? 'day' : 'days'} visiting`}
            icon={Flame}
            progress={streaksLoading ? 0 : Math.min((streaks.engagement_streak / 30) * 100, 100)}
            maxProgress={streaksLoading ? undefined : `${Math.min(streaks.engagement_streak, 30)}/30`}
            gradientFrom="from-orange-500"
            gradientTo="to-amber-400"
            delay={0.3}
          />

          {/* Check-In Streak */}
          <GamifiedKpiCard
            value={streaksLoading ? '...' : streaks.check_in_streak}
            label="Check-Ins"
            sublabel={streaksLoading ? 'loading' : `${streaks.check_in_streak === 1 ? 'day' : 'days'} consistent`}
            icon={CheckCircle2}
            progress={streaksLoading ? 0 : Math.min((streaks.check_in_streak / 30) * 100, 100)}
            maxProgress={streaksLoading ? undefined : `${Math.min(streaks.check_in_streak, 30)}/30`}
            gradientFrom="from-cyan-500"
            gradientTo="to-sky-400"
            delay={0.4}
          />
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
                <h3 className="text-2xl font-bold text-secondary-800">Tribe Community</h3>
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

        {/* Today's Check-ins from Group Members */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-secondary-100 shadow-lg hover:shadow-xl transition-all duration-300 p-8">

            <div className="flex items-center space-x-3 mb-6">
              <Calendar className="w-6 h-6 text-primary-600" />
              <h3 className="text-2xl font-bold text-secondary-800">Today's Check-ins</h3>
              <Zap className="w-5 h-5 text-warning-500 animate-bounce-gentle" />
            </div>

            {recentCheckins.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recentCheckins.map((checkin) => {
                  const rating = getAverageRating(checkin);
                  const colorClass = rating >= 8 ? 'bg-success-600 hover:bg-success-700' :
                    rating >= 6 ? 'bg-warning-600 hover:bg-warning-700' : 'bg-accent-600 hover:bg-accent-700';

                  return (
                    <div
                      key={checkin._id}
                      className={`${colorClass} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover-lift`}>

                      {/* User Info Section */}
                      <div className="flex items-center space-x-3 mb-4">
                        {/* Avatar */}
                        {checkin.user_avatar_url ? (
                          <img
                            src={checkin.user_avatar_url}
                            alt={checkin.user_name || 'User'}
                            className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-white/30 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {(checkin.user_name || 'A').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* User Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate drop-shadow-sm">
                            {checkin.user_name || 'Anonymous'}
                          </p>
                        </div>
                      </div>

                      {/* Mood Emoji - Larger and centered */}
                      <div className="text-center mb-3">
                        <div className="text-4xl mb-2">{checkin.mood_emoji}</div>
                      </div>

                      {/* Rating */}
                      <div className="text-center">
                        <div className="text-2xl font-bold mb-1">
                          {rating}/10
                        </div>
                        <div className="text-xs text-white/90 drop-shadow-sm">
                          wellbeing score
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg font-medium mb-2">No check-ins yet today</p>
                <p className="text-secondary-500 text-sm">
                  Check-ins from your group members will appear here
                </p>
              </div>
            )}
          </motion.div>

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