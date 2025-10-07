import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface GamifiedKpiCardProps {
  value: string | number;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  progress?: number; // 0-100 percentage
  maxProgress?: string; // For display (e.g., "7/10", "30/30", "1y 2m")
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
  onClick?: () => void;
}

/**
 * GamifiedKpiCard - A modern, interactive KPI card with 3D tilt effects,
 * animated progress rings, and smooth number animations.
 */
export const GamifiedKpiCard: React.FC<GamifiedKpiCardProps> = ({
  value,
  label,
  sublabel,
  icon: Icon,
  progress = 0,
  maxProgress,
  gradientFrom,
  gradientTo,
  delay = 0,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse position for 3D tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring animations for smooth tilt
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 300,
    damping: 30,
  });

  // Handle mouse move for tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseXPos = (e.clientX - centerX) / (rect.width / 2);
    const mouseYPos = (e.clientY - centerY) / (rect.height / 2);

    mouseX.set(mouseXPos);
    mouseY.set(mouseYPos);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  // Progress ring calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-3xl p-6
        bg-gradient-to-br ${gradientFrom} ${gradientTo}
        shadow-lg hover:shadow-2xl
        transition-shadow duration-300
        ${onClick ? 'cursor-pointer' : ''}
        group
      `}
    >
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-3xl border-2 border-white/20"
        animate={{
          borderColor: isHovered ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)',
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Content container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top section: Icon with glow */}
        <div className="flex items-start justify-between mb-4">
          <motion.div
            className="relative"
            animate={{
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Icon glow background */}
            <motion.div
              className="absolute inset-0 bg-white/30 rounded-2xl blur-xl"
              animate={{
                opacity: isHovered ? 0.6 : 0.3,
                scale: isHovered ? 1.2 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Icon */}
            <div className="relative w-14 h-14 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/40">
              <Icon className="w-7 h-7 text-white drop-shadow-sm" />
            </div>
          </motion.div>

          {/* Label badge */}
          <span className="text-xs text-white font-bold tracking-wider drop-shadow-sm uppercase opacity-90">
            {label}
          </span>
        </div>

        {/* Middle section: Primary value */}
        <div className="flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, duration: 0.5, type: 'spring' }}
            className="text-5xl font-bold text-white drop-shadow-lg mb-2"
          >
            {value}
          </motion.div>
          
          {sublabel && (
            <div className="text-sm text-white/90 font-medium drop-shadow-sm">
              {sublabel}
            </div>
          )}
        </div>

        {/* Bottom section: Progress indicator */}
        {progress > 0 && (
          <div className="mt-4 flex items-center justify-between">
            {/* Circular progress ring */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="white"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ delay: delay + 0.4, duration: 1, ease: 'easeOut' }}
                  style={{
                    strokeDasharray: circumference,
                  }}
                />
              </svg>
              
              {/* Progress percentage text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-sm">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Progress label */}
            {maxProgress && (
              <div className="text-xs text-white/80 font-medium drop-shadow-sm">
                {maxProgress}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%', y: '-100%' }}
        animate={{
          x: isHovered ? '100%' : '-100%',
          y: isHovered ? '100%' : '-100%',
        }}
        transition={{ duration: 0.6 }}
      />
    </motion.div>
  );
};

export default GamifiedKpiCard;

