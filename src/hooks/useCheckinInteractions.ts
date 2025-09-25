import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { lumi } from '../lib/lumi';
import { toast } from 'react-hot-toast';

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
      const { list: feedInteractions } = await lumi.entities.feed_interactions.list({
        filter: { checkin_id: checkinId }
      });

      if (feedInteractions) {
        setInteractions(feedInteractions);

        // Get unique user IDs from interactions
        const userIds = [...new Set(feedInteractions.map(i => i.user_id))];
        
        if (userIds.length > 0) {
          const { list: userProfiles } = await lumi.entities.user_profiles.list({
            filter: { user_id: { $in: userIds } }
          });

          if (userProfiles) {
            const profileMap = new Map();
            userProfiles.forEach(profile => {
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

      await lumi.entities.feed_interactions.create(newInteraction);

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

      await lumi.entities.feed_interactions.create(newInteraction);

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
