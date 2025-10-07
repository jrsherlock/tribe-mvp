import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, Brain, Activity, Users, Sparkles, ExternalLink, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import CheckinInteractionPanel from './CheckinInteractionPanel';

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
  emotional_notes?: string;
  physical_notes?: string;
  social_notes?: string;
  spiritual_notes: string;
  created_at: string;
}

interface InteractiveCheckinModalProps {
  checkin: TribeCheckin;
  onClose: () => void;
}

const InteractiveCheckinModal: React.FC<InteractiveCheckinModalProps> = ({
  checkin,
  onClose
}) => {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus management for accessibility
  useEffect(() => {
    const modalElement = document.querySelector('[role="dialog"]') as HTMLElement;
    if (modalElement) {
      modalElement.focus();
    }
  }, []);
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

  const mepssCategories = [
    { key: 'mental', label: 'Mental', icon: Brain, color: 'text-sage-600' },
    { key: 'emotional', label: 'Emotional', icon: Heart, color: 'text-sunrise-600' },
    { key: 'physical', label: 'Physical', icon: Activity, color: 'text-ocean-600' },
    { key: 'social', label: 'Social', icon: Users, color: 'text-sand-600' },
    { key: 'spiritual', label: 'Spiritual', icon: Sparkles, color: 'text-sage-700' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-sage-200 mx-4 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-sage-100 p-4 sm:p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
              {/* Avatar */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-sage-200 shadow-sm flex-shrink-0">
                {checkin.user_avatar_url ? (
                  <img
                    src={checkin.user_avatar_url}
                    alt={checkin.user_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-sage-200 flex items-center justify-center">
                    <User className="w-7 h-7 text-sage-600" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-sand-800 truncate">
                  {checkin.user_name}'s Check-in
                </h2>
                <p id="modal-description" className="text-xs sm:text-sm text-sand-600">{formatDate(checkin.created_at)}</p>
              </div>

              <div className="text-3xl sm:text-4xl flex-shrink-0">{checkin.mood_emoji}</div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {/* View All Today's Checkins Button */}
              <Link
                to="/mytribe?filter=today"
                className="hidden sm:flex items-center space-x-2 px-3 sm:px-4 py-2 bg-sage-100 hover:bg-sage-200 text-sage-700 rounded-xl transition-colors text-xs sm:text-sm font-medium"
                onClick={onClose}
              >
                <ExternalLink className="w-3 sm:w-4 h-3 sm:h-4" />
                <span className="hidden sm:inline">View All Today's Checkins</span>
                <span className="sm:hidden">View All</span>
              </Link>

              {/* Mobile View All Button */}
              <Link
                to="/mytribe?filter=today"
                className="sm:hidden p-2 bg-sage-100 hover:bg-sage-200 text-sage-700 rounded-lg transition-colors"
                onClick={onClose}
                aria-label="View all today's checkins"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              <button
                onClick={onClose}
                className="text-sand-400 hover:text-sand-600 transition-colors p-2 rounded-lg hover:bg-sand-100"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Overall Score */}
          <div className="text-center bg-gradient-to-br from-sage-50 to-sage-100 rounded-2xl p-6 border border-sage-200">
            <div className="text-5xl font-bold text-sage-800 mb-2">
              {getAverageRating(checkin)}/10
            </div>
            <div className="text-sand-600 font-medium">Overall Wellbeing Score</div>
          </div>

          {/* MEPSS Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mepssCategories.map(category => {
              const IconComponent = category.icon;
              const rating = checkin[`${category.key}_rating` as keyof TribeCheckin] as number;
              
              return (
                <div 
                  key={category.key} 
                  className={`p-4 rounded-xl border ${getRatingColor(rating)}`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <IconComponent className={`w-5 h-5 ${category.color}`} />
                    <span className="font-semibold text-sand-800">{category.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-sand-800">{rating}/10</div>
                </div>
              );
            })}
          </div>

          {/* Gratitude */}
          {checkin.grateful_for && checkin.grateful_for.length > 0 && (
            <div className="bg-gradient-to-br from-sunrise-50 to-sunrise-100 border border-sunrise-200 rounded-xl p-6">
              <h3 className="font-semibold text-sunrise-800 mb-4 flex items-center space-x-2">
                <Heart className="w-5 h-5" />
                <span>Grateful For</span>
              </h3>
              <ul className="space-y-2">
                {checkin.grateful_for.map((item, index) => (
                  <li key={index} className="text-sunrise-700 flex items-start space-x-2">
                    <span className="text-sunrise-500 mt-1 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {(checkin.mental_notes || checkin.spiritual_notes || checkin.emotional_notes || checkin.physical_notes || checkin.social_notes) && (
            <div className="space-y-4">
              {checkin.mental_notes && (
                <div className="bg-sand-50 border border-sand-200 rounded-xl p-4">
                  <h3 className="font-semibold text-sand-800 mb-2 flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-sage-600" />
                    <span>Mental Notes</span>
                  </h3>
                  <p className="text-sand-700 leading-relaxed">{checkin.mental_notes}</p>
                </div>
              )}

              {checkin.emotional_notes && (
                <div className="bg-sand-50 border border-sand-200 rounded-xl p-4">
                  <h3 className="font-semibold text-sand-800 mb-2 flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-sunrise-600" />
                    <span>Emotional Notes</span>
                  </h3>
                  <p className="text-sand-700 leading-relaxed">{checkin.emotional_notes}</p>
                </div>
              )}

              {checkin.physical_notes && (
                <div className="bg-sand-50 border border-sand-200 rounded-xl p-4">
                  <h3 className="font-semibold text-sand-800 mb-2 flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-ocean-600" />
                    <span>Physical Notes</span>
                  </h3>
                  <p className="text-sand-700 leading-relaxed">{checkin.physical_notes}</p>
                </div>
              )}

              {checkin.social_notes && (
                <div className="bg-sand-50 border border-sand-200 rounded-xl p-4">
                  <h3 className="font-semibold text-sand-800 mb-2 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-sand-600" />
                    <span>Social Notes</span>
                  </h3>
                  <p className="text-sand-700 leading-relaxed">{checkin.social_notes}</p>
                </div>
              )}

              {checkin.spiritual_notes && (
                <div className="bg-sand-50 border border-sand-200 rounded-xl p-4">
                  <h3 className="font-semibold text-sand-800 mb-2 flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-sage-700" />
                    <span>Spiritual Notes</span>
                  </h3>
                  <p className="text-sand-700 leading-relaxed">{checkin.spiritual_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Interactive Panel */}
          <div className="border-t border-sage-200 pt-6">
            <h3 className="font-semibold text-sand-800 mb-4 flex items-center space-x-2">
              <Heart className="w-5 h-5 text-sage-600" />
              <span>Community Support</span>
            </h3>
            <CheckinInteractionPanel checkinId={checkin._id} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InteractiveCheckinModal;
