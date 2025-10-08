import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useTenant } from '../lib/tenant';
import { toast } from 'react-hot-toast';
import { listByCheckinIds, addEmoji as svcAddEmoji, addComment as svcAddComment } from '../lib/services/interactions';
import { listProfilesByUserIds } from '../lib/services/profiles';

export interface FeedInteraction {
  _id?: string;
  user_id: string;
  checkin_id: string;
  interaction_type: 'comment' | 'emoji_reaction';
  content?: string;
  emoji?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  _id?: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  is_public: boolean;
}

export const useCheckinInteractions = (checkinId: string) => {
  const { user } = useAuth();
  const { currentTenantId } = useTenant();
  const [interactions, setInteractions] = useState<FeedInteraction[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReaction, setSubmittingReaction] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const reactionEmojis = ['❤️', '💪', '🙏', '👏', '🌟', '🤗', '✨', '🎉'];

  // Fetch interactions for the checkin
  const fetchInteractions = useCallback(async () => {
    if (!checkinId) return;

    try {
      setLoading(true);
      if (!currentTenantId) { setInteractions([]); return }
      const { data: feedInteractions, error } = await listByCheckinIds(currentTenantId, [checkinId]);
      if (error) throw error;
      if (feedInteractions) {
        setInteractions(feedInteractions as any);
        const userIds = [...new Set((feedInteractions as any[]).map(i => i.user_id))];
        if (userIds.length > 0) {
          const { data: userProfiles, error: err2 } = await listProfilesByUserIds(userIds);
          if (err2) throw err2;
          if (userProfiles) {
            const profileMap = new Map();
            (userProfiles as any[]).forEach(profile => {
              profileMap.set(profile.user_id, profile);
            });
            setProfiles(profileMap);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch interactions:', error);
      toast.error('Failed to load interactions');
    } finally {
      setLoading(false);
    }
  }, [checkinId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // Add emoji reaction
  const addEmojiReaction = async (emoji: string) => {
    if (!user || !checkinId || submittingReaction) return;

    try {
      setSubmittingReaction(true);
      const newInteraction = {
        user_id: user.userId,
        checkin_id: checkinId,
        interaction_type: 'emoji_reaction' as const,
        emoji: emoji,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await svcAddEmoji({ tenant_id: currentTenantId || null, user_id: user.userId, checkin_id: checkinId, emoji });

      // Update local state
      setInteractions(prev => [...prev, newInteraction]);
      toast.success('Reaction added! 💝');
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    } finally {
      setSubmittingReaction(false);
    }
  };

  // Add comment
  const addComment = async () => {
    if (!user || !checkinId || !commentInput.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const newInteraction = {
        user_id: user.userId,
        checkin_id: checkinId,
        interaction_type: 'comment' as const,
        content: commentInput.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await svcAddComment({ tenant_id: currentTenantId || null, user_id: user.userId, checkin_id: checkinId, content: newInteraction.content! });

      // Fetch current user's profile if not already in the map
      if (!profiles.has(user.userId)) {
        const { data: userProfiles, error: profileError } = await listProfilesByUserIds([user.userId]);
        if (!profileError && userProfiles && userProfiles.length > 0) {
          setProfiles(prev => {
            const newMap = new Map(prev);
            newMap.set(user.userId, userProfiles[0] as UserProfile);
            return newMap;
          });
        }
      }

      // Update local state
      setInteractions(prev => [...prev, newInteraction]);
      setCommentInput('');
      toast.success('Comment added! 💬');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Get emoji counts
  const getEmojiCounts = () => {
    const emojiReactions = interactions.filter(i => i.interaction_type === 'emoji_reaction');
    const counts: Record<string, number> = {};
    
    emojiReactions.forEach(reaction => {
      if (reaction.emoji) {
        counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
      }
    });
    
    return counts;
  };

  // Get comments
  const getComments = () => {
    return interactions.filter(i => i.interaction_type === 'comment');
  };

  // Get user display name
  const getUserDisplayName = (userId: string) => {
    const profile = profiles.get(userId);
    return profile?.display_name || 'Anonymous';
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const checkDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - checkDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return {
    interactions,
    profiles,
    loading,
    commentInput,
    setCommentInput,
    submittingReaction,
    submittingComment,
    reactionEmojis,
    addEmojiReaction,
    addComment,
    getEmojiCounts,
    getComments,
    getUserDisplayName,
    formatTimeAgo,
    refetch: fetchInteractions
  };
};
