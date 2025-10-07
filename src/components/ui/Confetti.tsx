import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ConfettiProps {
  active: boolean
  duration?: number
  particleCount?: number
  onComplete?: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  rotation: number
  velocityX: number
  velocityY: number
}

const COLORS = [
  '#2A9D90', // accent-500
  '#F4A462', // accent-400
  '#E76E50', // accent-600
  '#264653', // primary-900
  '#F1C40F', // gold
  '#9B59B6', // purple
]

/**
 * Confetti Component
 * Celebration animation for milestone achievements
 * Displays colorful particles that fall and fade out
 */
export const Confetti: React.FC<ConfettiProps> = ({
  active,
  duration = 3000,
  particleCount = 50,
  onComplete,
}) => {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (active) {
      // Generate particles
      const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage
        y: -10, // start above viewport
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4, // 4-12px
        rotation: Math.random() * 360,
        velocityX: (Math.random() - 0.5) * 2, // -1 to 1
        velocityY: Math.random() * 2 + 1, // 1 to 3
      }))
      
      setParticles(newParticles)

      // Clear particles after duration
      const timer = setTimeout(() => {
        setParticles([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [active, duration, particleCount, onComplete])

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                x: `${particle.x}vw`,
                y: `${particle.y}vh`,
                rotate: particle.rotation,
                opacity: 1,
              }}
              animate={{
                x: `${particle.x + particle.velocityX * 20}vw`,
                y: '110vh', // fall below viewport
                rotate: particle.rotation + 360 * 2,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: duration / 1000,
                ease: 'easeIn',
                opacity: {
                  times: [0, 0.7, 1],
                  duration: duration / 1000,
                },
              }}
              style={{
                position: 'absolute',
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

export default Confetti

