import React from 'react'
import { motion } from 'framer-motion'

export interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  showValue?: boolean
  valueLabel?: string
  className?: string
  color?: string
  backgroundColor?: string
  animate?: boolean
}

/**
 * CircularProgress Component
 * A modern circular progress indicator with animation support
 * Perfect for displaying streak progress in goal cards
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showValue = true,
  valueLabel,
  className = '',
  color = '#2A9D90', // accent-500
  backgroundColor = '#E5E7EB', // gray-200
  animate = true,
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference : offset}
          animate={animate ? { strokeDashoffset: offset } : {}}
          transition={{
            duration: 1,
            ease: 'easeInOut',
          }}
        />
      </svg>
      
      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={animate ? { opacity: 0, scale: 0.5 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-primary-800 tabular-nums">
              {value}
            </div>
            {valueLabel && (
              <div className="text-xs text-primary-600 mt-1 font-medium">
                {valueLabel}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default CircularProgress

