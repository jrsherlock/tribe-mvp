import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface TribeCheckinCardProps {
  checkin: TribeCheckin;
  onSelect: () => void;
}

const TribeCheckinCard: React.FC<TribeCheckinCardProps> = ({
  checkin,
  onSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getAverageRating = (checkin: TribeCheckin) => {
    return Math.round((
      checkin.mental_rating +
      checkin.emotional_rating +
      checkin.physical_rating +
      checkin.social_rating +
      checkin.spiritual_rating
    ) / 5);
  };

  const rating = getAverageRating(checkin);
  
  // Dynamic border colors based on rating
  const getBorderColor = (rating: number) => {
    if (rating >= 8) return 'border-success-500';
    if (rating >= 6) return 'border-warning-500';
    return 'border-accent-500';
  };

  const borderColor = getBorderColor(rating);

  return (
    <div className="relative flex-shrink-0">
      <motion.div
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
        className={`w-28 h-36 flex flex-col items-center justify-center bg-white rounded-2xl p-3 shadow-md cursor-pointer border-4 ${borderColor} transition-all duration-200 hover:shadow-lg`}
      >
        {/* Mood Emoji */}
        <span className="text-4xl absolute -top-3 -right-2 bg-white rounded-full p-1 shadow-sm">
          {checkin.mood_emoji}
        </span>

        {/* Avatar */}
        <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-white shadow-sm">
          {checkin.user_avatar_url ? (
            <img
              src={checkin.user_avatar_url}
              alt={checkin.user_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary-200 flex items-center justify-center">
              <span className="text-secondary-600 text-lg font-bold">
                {checkin.user_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Average Score */}
        <div className="text-lg font-bold text-secondary-800 mb-1">
          {rating}/10
        </div>

        {/* User Name */}
        <div className="text-xs text-secondary-600 text-center font-medium truncate w-full px-1">
          {checkin.user_name}
        </div>
      </motion.div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
              {checkin.user_name}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TribeCheckinCard;
