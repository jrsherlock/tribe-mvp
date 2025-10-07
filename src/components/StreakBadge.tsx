import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface StreakBadgeProps {
  icon: LucideIcon;
  streakCount: number;
  label: string;
  color?: 'green' | 'blue' | 'purple' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * StreakBadge Component
 * A reusable, visually appealing badge for displaying user streaks
 * Can be used next to avatars or in dashboard cards
 */
export const StreakBadge: React.FC<StreakBadgeProps> = ({
  icon: Icon,
  streakCount,
  label,
  color = 'blue',
  size = 'md',
  className = '',
}) => {
  // Color variants
  const colorClasses = {
    green: {
      bg: 'from-success-500 to-success-600',
      text: 'text-success-700',
      border: 'border-success-300',
      iconBg: 'bg-success-100',
      iconColor: 'text-success-600',
    },
    blue: {
      bg: 'from-ocean-500 to-ocean-600',
      text: 'text-ocean-700',
      border: 'border-ocean-300',
      iconBg: 'bg-ocean-100',
      iconColor: 'text-ocean-600',
    },
    purple: {
      bg: 'from-lavender-500 to-lavender-600',
      text: 'text-lavender-700',
      border: 'border-lavender-300',
      iconBg: 'bg-lavender-100',
      iconColor: 'text-lavender-600',
    },
    orange: {
      bg: 'from-sunrise-500 to-sunrise-600',
      text: 'text-sunrise-700',
      border: 'border-sunrise-300',
      iconBg: 'bg-sunrise-100',
      iconColor: 'text-sunrise-600',
    },
  };

  // Size variants
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 'w-3 h-3',
      iconContainer: 'w-5 h-5',
      count: 'text-sm',
      label: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'w-4 h-4',
      iconContainer: 'w-6 h-6',
      count: 'text-base',
      label: 'text-xs',
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'w-5 h-5',
      iconContainer: 'w-8 h-8',
      count: 'text-lg',
      label: 'text-sm',
    },
  };

  const colors = colorClasses[color];
  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className={`
        inline-flex items-center space-x-2 
        rounded-full border-2 ${colors.border}
        bg-white shadow-md
        ${sizes.container}
        ${className}
      `}
      title={`${streakCount} day ${label} streak`}
    >
      {/* Icon */}
      <div className={`
        ${sizes.iconContainer} 
        ${colors.iconBg} 
        rounded-full 
        flex items-center justify-center
      `}>
        <Icon className={`${sizes.icon} ${colors.iconColor}`} />
      </div>

      {/* Streak Count */}
      <div className="flex items-baseline space-x-1">
        <span className={`font-bold ${colors.text} ${sizes.count} tabular-nums`}>
          {streakCount}
        </span>
        <span className={`${colors.text} ${sizes.label} font-medium`}>
          {streakCount === 1 ? 'day' : 'days'}
        </span>
      </div>
    </motion.div>
  );
};

export default StreakBadge;

