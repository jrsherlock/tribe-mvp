import React from 'react';
import { Send, User } from 'lucide-react';
import { useCheckinInteractions } from '../hooks/useCheckinInteractions';

interface CheckinInteractionPanelProps {
  checkinId: string;
  className?: string;
}

const CheckinInteractionPanel: React.FC<CheckinInteractionPanelProps> = ({ 
  checkinId, 
  className = '' 
}) => {
  const {
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
    profiles
  } = useCheckinInteractions(checkinId);

  const emojiCounts = getEmojiCounts();
  const comments = getComments();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-12 bg-sage-100 rounded-lg mb-4"></div>
        <div className="h-8 bg-sage-100 rounded-lg mb-2"></div>
        <div className="h-8 bg-sage-100 rounded-lg"></div>
      </div>
    );
  }

  if (!checkinId) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sand-500">Unable to load interactions</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Emoji Reactions Display */}
      {Object.keys(emojiCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(emojiCounts).map(([emoji, count]) => (
            <div
              key={emoji}
              className="bg-sage-100 border border-sage-200 rounded-full px-3 py-1 text-sm flex items-center space-x-1 hover:bg-sage-150 transition-colors"
            >
              <span className="text-base">{emoji}</span>
              <span className="text-sage-700 font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Emoji Reactions */}
      <div className="flex items-center justify-between mb-4 p-3 bg-sage-50 rounded-xl border border-sage-200">
        <div className="flex items-center space-x-1">
          <span className="text-sm text-sage-600 font-medium mr-2">React:</span>
          {reactionEmojis.slice(0, 6).map(emoji => (
            <button
              key={emoji}
              onClick={() => addEmojiReaction(emoji)}
              disabled={submittingReaction}
              className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-sage-100 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        
        {reactionEmojis.length > 6 && (
          <div className="flex items-center space-x-1">
            {reactionEmojis.slice(6).map(emoji => (
              <button
                key={emoji}
                onClick={() => addEmojiReaction(emoji)}
                disabled={submittingReaction}
                className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-sage-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-semibold text-sand-700 mb-2">
            Comments ({comments.length})
          </h4>
          {comments.map((comment, idx) => {
            const profile = profiles.get(comment.user_id);
            return (
              <div key={idx} className="bg-sand-50 border border-sand-200 rounded-xl p-3">
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-sage-200 flex items-center justify-center flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-sage-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sand-800 text-sm">
                        {getUserDisplayName(comment.user_id)}
                      </span>
                      <span className="text-xs text-sand-500">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-sand-700 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comment Input */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Add a supportive comment..."
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addComment()}
          className="flex-1 p-3 border border-sage-200 rounded-xl focus:ring-2 focus:ring-sage-500 focus:border-transparent bg-white text-sm placeholder-sand-400 transition-all"
          maxLength={1000}
        />
        <button
          onClick={addComment}
          disabled={!commentInput.trim() || submittingComment}
          className="p-3 bg-sage-600 text-white rounded-xl hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Send comment"
        >
          {submittingComment ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
};

export default CheckinInteractionPanel;
