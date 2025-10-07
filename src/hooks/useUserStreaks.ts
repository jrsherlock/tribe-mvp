import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface UserStreaks {
  engagement_streak: number;
  check_in_streak: number;
}

interface UseUserStreaksReturn {
  streaks: UserStreaks;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  recordActivity: () => Promise<void>;
  recordCheckIn: () => Promise<void>;
}

/**
 * Custom hook for managing user activity streaks
 * Provides engagement and check-in streak data, plus functions to record activities
 */
export function useUserStreaks(): UseUserStreaksReturn {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<UserStreaks>({
    engagement_streak: 0,
    check_in_streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current user streaks from the database
   */
  const fetchStreaks = useCallback(async () => {
    if (!user) {
      setStreaks({ engagement_streak: 0, check_in_streak: 0 });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_user_streaks');

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        setStreaks({
          engagement_streak: data.engagement_streak || 0,
          check_in_streak: data.check_in_streak || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching user streaks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch streaks');
      setStreaks({ engagement_streak: 0, check_in_streak: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Record user activity (engagement)
   * Should be called when the app loads
   */
  const recordActivity = useCallback(async () => {
    if (!user) return;

    try {
      const { error: rpcError } = await supabase.rpc('record_user_activity');

      if (rpcError) {
        throw rpcError;
      }

      // Refetch streaks after recording activity
      await fetchStreaks();
    } catch (err) {
      console.error('Error recording user activity:', err);
    }
  }, [user, fetchStreaks]);

  /**
   * Record check-in activity
   * Should be called when user successfully submits a MEPSS check-in
   */
  const recordCheckIn = useCallback(async () => {
    if (!user) return;

    try {
      const { error: rpcError } = await supabase.rpc('record_check_in_activity');

      if (rpcError) {
        throw rpcError;
      }

      // Refetch streaks after recording check-in
      await fetchStreaks();
    } catch (err) {
      console.error('Error recording check-in activity:', err);
    }
  }, [user, fetchStreaks]);

  /**
   * Fetch streaks on mount and when user changes
   */
  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  return {
    streaks,
    isLoading,
    error,
    refetch: fetchStreaks,
    recordActivity,
    recordCheckIn,
  };
}

