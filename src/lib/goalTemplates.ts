import { 
  Heart, 
  Users, 
  Dumbbell, 
  BookOpen, 
  Sparkles, 
  Phone, 
  Coffee,
  Moon,
  Sunrise,
  Music,
  Smile,
  MessageCircle,
  Footprints,
  Apple,
  Droplet,
  Brain,
  Target,
  type LucideIcon
} from 'lucide-react'
import type { GoalFrequency } from './services/goals'

/**
 * Goal Template Interface
 * Defines the structure of a pre-configured goal template
 */
export interface GoalTemplate {
  id: string
  title: string
  description: string
  frequency: GoalFrequency
  category: 'wellness' | 'recovery' | 'social' | 'spiritual' | 'physical'
  icon: LucideIcon
  is_public: boolean
  color: string // Tailwind color class for the icon background
}

/**
 * Pre-configured Goal Templates
 * Recovery-focused goals that users can quickly add to their personal list
 */
export const GOAL_TEMPLATES: GoalTemplate[] = [
  // Recovery Category
  {
    id: 'attend_meeting',
    title: 'Attend Support Meeting',
    description: 'Participate in a recovery support group meeting to connect with others and strengthen your commitment.',
    frequency: 'weekly',
    category: 'recovery',
    icon: Users,
    is_public: false,
    color: 'bg-blue-500'
  },
  {
    id: 'call_sponsor',
    title: 'Call Sponsor',
    description: 'Check in with your sponsor or accountability partner to maintain connection and support.',
    frequency: 'weekly',
    category: 'recovery',
    icon: Phone,
    is_public: false,
    color: 'bg-green-500'
  },
  {
    id: 'daily_reflection',
    title: 'Daily Reflection',
    description: 'Take time to reflect on your recovery journey, progress, and gratitude.',
    frequency: 'daily',
    category: 'recovery',
    icon: BookOpen,
    is_public: false,
    color: 'bg-purple-500'
  },
  
  // Wellness Category
  {
    id: 'meditation',
    title: 'Meditation Practice',
    description: 'Spend 10-15 minutes in mindful meditation to center yourself and reduce stress.',
    frequency: 'daily',
    category: 'wellness',
    icon: Sparkles,
    is_public: false,
    color: 'bg-indigo-500'
  },
  {
    id: 'journaling',
    title: 'Journaling',
    description: 'Write down your thoughts, feelings, and experiences to process emotions and track growth.',
    frequency: 'daily',
    category: 'wellness',
    icon: BookOpen,
    is_public: false,
    color: 'bg-amber-500'
  },
  {
    id: 'gratitude_practice',
    title: 'Gratitude Practice',
    description: 'List three things you\'re grateful for today to cultivate a positive mindset.',
    frequency: 'daily',
    category: 'wellness',
    icon: Heart,
    is_public: false,
    color: 'bg-pink-500'
  },
  {
    id: 'quality_sleep',
    title: 'Quality Sleep',
    description: 'Get 7-8 hours of restful sleep to support physical and mental recovery.',
    frequency: 'daily',
    category: 'wellness',
    icon: Moon,
    is_public: false,
    color: 'bg-slate-600'
  },
  
  // Physical Category
  {
    id: 'exercise',
    title: 'Exercise',
    description: 'Engage in physical activity for at least 30 minutes to boost mood and energy.',
    frequency: 'daily',
    category: 'physical',
    icon: Dumbbell,
    is_public: false,
    color: 'bg-orange-500'
  },
  {
    id: 'healthy_eating',
    title: 'Healthy Eating',
    description: 'Nourish your body with balanced, nutritious meals throughout the day.',
    frequency: 'daily',
    category: 'physical',
    icon: Apple,
    is_public: false,
    color: 'bg-red-500'
  },
  {
    id: 'hydration',
    title: 'Stay Hydrated',
    description: 'Drink at least 8 glasses of water to support physical health and mental clarity.',
    frequency: 'daily',
    category: 'physical',
    icon: Droplet,
    is_public: false,
    color: 'bg-cyan-500'
  },
  {
    id: 'morning_walk',
    title: 'Morning Walk',
    description: 'Start your day with a refreshing walk to energize body and mind.',
    frequency: 'daily',
    category: 'physical',
    icon: Footprints,
    is_public: false,
    color: 'bg-teal-500'
  },
  
  // Spiritual Category
  {
    id: 'prayer_meditation',
    title: 'Prayer or Meditation',
    description: 'Connect with your spiritual practice through prayer, meditation, or contemplation.',
    frequency: 'daily',
    category: 'spiritual',
    icon: Sparkles,
    is_public: false,
    color: 'bg-violet-500'
  },
  {
    id: 'morning_intention',
    title: 'Set Morning Intention',
    description: 'Begin each day by setting a positive intention or affirmation.',
    frequency: 'daily',
    category: 'spiritual',
    icon: Sunrise,
    is_public: false,
    color: 'bg-yellow-500'
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness Practice',
    description: 'Practice being present and aware throughout your daily activities.',
    frequency: 'daily',
    category: 'spiritual',
    icon: Brain,
    is_public: false,
    color: 'bg-fuchsia-500'
  },
  
  // Social Category
  {
    id: 'connect_friend',
    title: 'Connect with Friend',
    description: 'Reach out to a friend or family member to maintain healthy relationships.',
    frequency: 'weekly',
    category: 'social',
    icon: MessageCircle,
    is_public: false,
    color: 'bg-emerald-500'
  },
  {
    id: 'help_others',
    title: 'Help Someone',
    description: 'Offer support or kindness to another person in recovery or need.',
    frequency: 'weekly',
    category: 'social',
    icon: Heart,
    is_public: false,
    color: 'bg-rose-500'
  },
  {
    id: 'social_activity',
    title: 'Sober Social Activity',
    description: 'Participate in a healthy, substance-free social activity or hobby.',
    frequency: 'weekly',
    category: 'social',
    icon: Smile,
    is_public: false,
    color: 'bg-lime-500'
  },
  {
    id: 'creative_expression',
    title: 'Creative Expression',
    description: 'Engage in art, music, writing, or another creative outlet for self-expression.',
    frequency: 'weekly',
    category: 'social',
    icon: Music,
    is_public: false,
    color: 'bg-sky-500'
  }
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: GoalTemplate['category']): GoalTemplate[] {
  return GOAL_TEMPLATES.filter(template => template.category === category)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find(template => template.id === id)
}

/**
 * Get all categories
 */
export function getCategories(): Array<{ id: GoalTemplate['category']; label: string; description: string }> {
  return [
    { 
      id: 'recovery', 
      label: 'Recovery', 
      description: 'Support group meetings, sponsor check-ins, and recovery practices' 
    },
    { 
      id: 'wellness', 
      label: 'Mental Wellness', 
      description: 'Meditation, journaling, gratitude, and self-care practices' 
    },
    { 
      id: 'physical', 
      label: 'Physical Health', 
      description: 'Exercise, nutrition, sleep, and physical well-being' 
    },
    { 
      id: 'spiritual', 
      label: 'Spiritual Growth', 
      description: 'Prayer, mindfulness, intentions, and spiritual connection' 
    },
    { 
      id: 'social', 
      label: 'Social Connection', 
      description: 'Relationships, community, helping others, and creative activities' 
    }
  ]
}

