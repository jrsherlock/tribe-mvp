import React from 'react';
import { motion } from 'framer-motion';
import { X, Heart, Brain, Activity, Users, Sparkles } from 'lucide-react';

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

interface CheckinDetailModalProps {
  checkin: TribeCheckin;
  onClose: () => void;
}

const CheckinDetailModal: React.FC<CheckinDetailModalProps> = ({ checkin, onClose }) => {
  const getAverageRating = (checkin: TribeCheckin) => {
    return Math.round((
      checkin.mental_rating +
      checkin.emotional_rating +
      checkin.physical_rating +
      checkin.social_rating +
      checkin.spiritual_rating
    ) / 5);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-success-600 bg-success-50 border-success-200';
    if (rating >= 6) return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-accent-600 bg-accent-50 border-accent-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-secondary-100 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-secondary-200">
                {checkin.user_avatar_url ? (
                  <img
                    src={checkin.user_avatar_url}
                    alt={checkin.user_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary-200 flex items-center justify-center">
                    <span className="text-secondary-600 font-bold">
                      {checkin.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-secondary-800">{checkin.user_name}'s Check-in</h2>
                <p className="text-sm text-secondary-600">{formatDate(checkin.created_at)}</p>
              </div>
              
              <div className="text-3xl">{checkin.mood_emoji}</div>
            </div>
            
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overall Score */}
          <div className="text-center">
            <div className="text-4xl font-bold text-secondary-800 mb-2">
              {getAverageRating(checkin)}/10
            </div>
            <div className="text-secondary-600 font-medium">Overall Wellbeing Score</div>
          </div>

          {/* MEPSS Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${getRatingColor(checkin.mental_rating)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="w-5 h-5" />
                <span className="font-semibold">Mental</span>
              </div>
              <div className="text-2xl font-bold">{checkin.mental_rating}/10</div>
            </div>

            <div className={`p-4 rounded-xl border ${getRatingColor(checkin.emotional_rating)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="w-5 h-5" />
                <span className="font-semibold">Emotional</span>
              </div>
              <div className="text-2xl font-bold">{checkin.emotional_rating}/10</div>
            </div>

            <div className={`p-4 rounded-xl border ${getRatingColor(checkin.physical_rating)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5" />
                <span className="font-semibold">Physical</span>
              </div>
              <div className="text-2xl font-bold">{checkin.physical_rating}/10</div>
            </div>

            <div className={`p-4 rounded-xl border ${getRatingColor(checkin.social_rating)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5" />
                <span className="font-semibold">Social</span>
              </div>
              <div className="text-2xl font-bold">{checkin.social_rating}/10</div>
            </div>

            <div className={`p-4 rounded-xl border md:col-span-2 ${getRatingColor(checkin.spiritual_rating)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Spiritual</span>
              </div>
              <div className="text-2xl font-bold">{checkin.spiritual_rating}/10</div>
            </div>
          </div>

          {/* Gratitude */}
          {checkin.grateful_for && checkin.grateful_for.length > 0 && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-4">
              <h3 className="font-semibold text-success-800 mb-3 flex items-center space-x-2">
                <Heart className="w-5 h-5" />
                <span>Grateful For</span>
              </h3>
              <ul className="space-y-2">
                {checkin.grateful_for.map((item, index) => (
                  <li key={index} className="text-success-700 flex items-start space-x-2">
                    <span className="text-success-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {(checkin.mental_notes || checkin.spiritual_notes) && (
            <div className="space-y-4">
              {checkin.mental_notes && (
                <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-4">
                  <h3 className="font-semibold text-secondary-800 mb-2 flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>Mental Notes</span>
                  </h3>
                  <p className="text-secondary-700">{checkin.mental_notes}</p>
                </div>
              )}

              {checkin.spiritual_notes && (
                <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-4">
                  <h3 className="font-semibold text-secondary-800 mb-2 flex items-center space-x-2">
                    <Sparkles className="w-5 h-5" />
                    <span>Spiritual Notes</span>
                  </h3>
                  <p className="text-secondary-700">{checkin.spiritual_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CheckinDetailModal;
