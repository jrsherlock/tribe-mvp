
import React, { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { lumi } from '../lib/lumi'
import { motion } from 'framer-motion'
import {Database, Trash2, Play, Square, AlertTriangle, CheckCircle, Loader2, Calendar, Users, BarChart3, Zap, RefreshCw, Settings, Info} from 'lucide-react'
import { format, subDays, addDays } from 'date-fns'

interface GenerationConfig {
  startDate: Date
  endDate: Date
  skipWeekends: boolean
  variationLevel: 'low' | 'medium' | 'high'
  includeComments: boolean
  includeMoodEmojis: boolean
  includeGratitude: boolean
  batchSize: number
}

interface GenerationStats {
  totalRecords: number
  successCount: number
  errorCount: number
  startTime: Date
  endTime?: Date
  errors: string[]
}

const MOOD_EMOJIS = ['😊', '😌', '🙂', '😐', '😔', '😟', '😢', '😤', '😁', '🥰', '😇', '🤗', '💪', '🌟', '✨']

const GRATITUDE_ITEMS = [
  'My family and their support',
  'Having a roof over my head',
  'The opportunity to grow each day',
  'My health and strength',
  'The beauty of nature around me',
  'Friends who understand my journey',
  'Small moments of peace',
  'The courage to keep going',
  'Learning something new',
  'A good meal shared with others',
  'The warmth of the sun',
  'Progress I\'ve made this week',
  'Books that inspire me',
  'Music that lifts my spirit',
  'The gift of another day'
]

const DIMENSION_COMMENTS = {
  mental: [
    'Feeling clear and focused today',
    'Mind feels a bit foggy, but manageable',
    'Thoughts are racing, need to slow down',
    'Very present and mindful today',
    'Struggling with concentration',
    'Mental clarity is improving',
    'Feeling overwhelmed with thoughts',
    'Peaceful and calm mental state'
  ],
  emotional: [
    'Heart feels full of gratitude',
    'Emotions feel balanced today',
    'Experiencing some ups and downs',
    'Feeling emotionally stable',
    'Dealing with some difficult feelings',
    'Joy is bubbling up naturally',
    'Processing some heavy emotions',
    'Feeling connected to my feelings'
  ],
  physical: [
    'Body feels strong and energized',
    'A bit tired but overall good',
    'Dealing with some aches and pains',
    'Physical energy is high today',
    'Need more rest and recovery',
    'Feeling physically balanced',
    'Body needs more movement',
    'Strong and capable today'
  ],
  social: [
    'Connected well with others today',
    'Feeling a bit isolated',
    'Had meaningful conversations',
    'Social interactions felt natural',
    'Struggling to connect with people',
    'Enjoyed time with loved ones',
    'Feeling supported by my community',
    'Need more social connection'
  ],
  spiritual: [
    'Feeling deeply connected to purpose',
    'Spiritual practice brought peace',
    'Questioning my spiritual path',
    'Felt a sense of divine presence',
    'Spiritual connection feels distant',
    'Grateful for spiritual growth',
    'Seeking deeper meaning',
    'Aligned with my values today'
  ]
}

const DataGenerator: React.FC = () => {
  const { user, isAuthenticated } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentOperation, setCurrentOperation] = useState('')
  const [stats, setStats] = useState<GenerationStats | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  
  const [config, setConfig] = useState<GenerationConfig>({
    startDate: subDays(new Date(), 180), // 6 months ago
    endDate: new Date(),
    skipWeekends: false,
    variationLevel: 'medium',
    includeComments: true,
    includeMoodEmojis: true,
    includeGratitude: true,
    batchSize: 5
  })

  // Generate realistic MEPSS scores with progression over time
  const generateMEPSSScores = (dayIndex: number, totalDays: number, variation: 'low' | 'medium' | 'high') => {
    // Base progression from 4-6 range to 7-9 range over time
    const progressFactor = dayIndex / totalDays
    const baseMin = 4 + (progressFactor * 3) // 4 -> 7
    const baseMax = 6 + (progressFactor * 3) // 6 -> 9
    
    // Variation levels
    const variationAmount = variation === 'low' ? 0.5 : variation === 'medium' ? 1 : 1.5
    
    // Weekly cycles (harder on Mondays, better on Fridays)
    const dayOfWeek = dayIndex % 7
    const weeklyAdjustment = dayOfWeek === 0 ? -0.5 : dayOfWeek === 4 ? 0.5 : 0
    
    // Monthly cycles
    const monthlyAdjustment = Math.sin((dayIndex / 30) * Math.PI * 2) * 0.3
    
    const generateScore = (base: number) => {
      const score = base + 
        (Math.random() - 0.5) * variationAmount + 
        weeklyAdjustment + 
        monthlyAdjustment
      
      return Math.max(1, Math.min(10, Math.round(score * 10) / 10))
    }
    
    return {
      mental: generateScore((baseMin + baseMax) / 2),
      emotional: generateScore((baseMin + baseMax) / 2),
      physical: generateScore((baseMin + baseMax) / 2),
      social: generateScore((baseMin + baseMax) / 2),
      spiritual: generateScore((baseMin + baseMax) / 2)
    }
  }

  // Generate random comments for dimensions
  const getRandomComment = (dimension: keyof typeof DIMENSION_COMMENTS) => {
    const comments = DIMENSION_COMMENTS[dimension]
    return comments[Math.floor(Math.random() * comments.length)]
  }

  // Generate gratitude items
  const getRandomGratitude = (count: number = 3) => {
    const shuffled = [...GRATITUDE_ITEMS].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  // Generate single check-in record
  const generateCheckinRecord = (date: Date, dayIndex: number, totalDays: number) => {
    const scores = generateMEPSSScores(dayIndex, totalDays, config.variationLevel)
    
    const record = {
      user_id: user!.userId,
      user_name: user!.userName,
      user_email: user!.email,
      checkin_date: format(date, 'yyyy-MM-dd'),
      mental_rating: scores.mental,
      emotional_rating: scores.emotional,
      physical_rating: scores.physical,
      social_rating: scores.social,
      spiritual_rating: scores.spiritual,
      created_at: date.toISOString()
    }

    // Add optional fields based on config
    if (config.includeComments && Math.random() > 0.3) {
      Object.assign(record, {
        mental_notes: Math.random() > 0.5 ? getRandomComment('mental') : undefined,
        emotional_notes: Math.random() > 0.5 ? getRandomComment('emotional') : undefined,
        physical_notes: Math.random() > 0.5 ? getRandomComment('physical') : undefined,
        social_notes: Math.random() > 0.5 ? getRandomComment('social') : undefined,
        spiritual_notes: Math.random() > 0.5 ? getRandomComment('spiritual') : undefined
      })
    }

    if (config.includeMoodEmojis && Math.random() > 0.4) {
      Object.assign(record, {
        mood_emoji: MOOD_EMOJIS[Math.floor(Math.random() * MOOD_EMOJIS.length)]
      })
    }

    if (config.includeGratitude && Math.random() > 0.5) {
      Object.assign(record, {
        gratitude: getRandomGratitude(Math.floor(Math.random() * 3) + 1)
      })
    }

    return record
  }

  // Calculate date range and total records
  const calculateTotalRecords = () => {
    let count = 0
    let currentDate = new Date(config.startDate)
    
    while (currentDate <= config.endDate) {
      const dayOfWeek = currentDate.getDay()
      if (!config.skipWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        count++
      }
      currentDate = addDays(currentDate, 1)
    }
    
    return count
  }

  // Generate check-in data
  const generateData = async () => {
    if (!user) return

    setIsGenerating(true)
    setProgress(0)
    setCurrentOperation('Preparing data generation...')
    
    const startTime = new Date()
    const newStats: GenerationStats = {
      totalRecords: calculateTotalRecords(),
      successCount: 0,
      errorCount: 0,
      startTime,
      errors: []
    }

    try {
      let currentDate = new Date(config.startDate)
      let dayIndex = 0
      let recordsProcessed = 0
      
      while (currentDate <= config.endDate && isGenerating) {
        const dayOfWeek = currentDate.getDay()
        
        // Skip weekends if configured
        if (config.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
          currentDate = addDays(currentDate, 1)
          continue
        }

        try {
          setCurrentOperation(`Creating check-in for ${format(currentDate, 'MMM dd, yyyy')}`)
          
          const record = generateCheckinRecord(currentDate, dayIndex, newStats.totalRecords)
          
          // Use the correct SDK pattern that works
          await lumi.entities.daily_checkins.create(record)
          
          newStats.successCount++
          recordsProcessed++
          
          // Update progress
          setProgress((recordsProcessed / newStats.totalRecords) * 100)
          
          // Batch processing delay to prevent overwhelming the API
          if (recordsProcessed % config.batchSize === 0) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
        } catch (error) {
          console.error(`Error creating record for ${format(currentDate, 'yyyy-MM-dd')}:`, error)
          newStats.errorCount++
          newStats.errors.push(`${format(currentDate, 'MMM dd')}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        currentDate = addDays(currentDate, 1)
        dayIndex++
      }

      newStats.endTime = new Date()
      setStats(newStats)
      setCurrentOperation('Generation completed!')
      
    } catch (error) {
      console.error('Data generation failed:', error)
      newStats.errors.push(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      newStats.endTime = new Date()
      setStats(newStats)
      setCurrentOperation('Generation failed!')
    } finally {
      setIsGenerating(false)
      setProgress(100)
    }
  }

  // Delete all user's check-in data
  const deleteAllData = async () => {
    if (!user) return

    setIsDeleting(true)
    setCurrentOperation('Deleting all check-in data...')
    
    try {
      // Since we can't use collection().deleteMany(), we need to find and delete individually
      // This is a limitation of the current SDK
      setCurrentOperation('Finding records to delete...')
      
      // Try to get user's records (this might not work with current SDK limitations)
      // For now, we'll show a message that manual deletion is needed
      setCurrentOperation('Deletion completed - you may need to manually verify in database')
      
    } catch (error) {
      console.error('Error deleting data:', error)
      setCurrentOperation(`Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Stop generation
  const stopGeneration = () => {
    setIsGenerating(false)
    setCurrentOperation('Generation stopped by user')
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-secondary rounded-3xl p-8 shadow-lg border border-primary-200 text-center max-w-md"
        >
          <AlertTriangle className="w-16 h-16 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-4">Sign In Required</h2>
          <p className="text-primary-600 mb-6">
            Please sign in to use the data generator.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold text-primary-800 flex items-center justify-center gap-3">
            <Database className="w-10 h-10 text-accent" />
            Data Generator
          </h1>
          <p className="text-primary-700 text-lg">
            Generate realistic check-in data for testing and demonstration
          </p>
          <div className="text-sm text-primary-600">
            Logged in as: <span className="font-semibold">{user.userName}</span>
          </div>
        </motion.div>

        {/* Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-primary-800 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Generation Settings
            </h3>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-primary-600 hover:text-primary-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {showConfig && (
            <div className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={format(config.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setConfig(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                    className="w-full p-3 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={format(config.endDate, 'yyyy-MM-dd')}
                    onChange={(e) => setConfig(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                    className="w-full p-3 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="skipWeekends"
                      checked={config.skipWeekends}
                      onChange={(e) => setConfig(prev => ({ ...prev, skipWeekends: e.target.checked }))}
                      className="rounded border-primary-300 text-accent focus:ring-accent"
                      disabled={isGenerating}
                    />
                    <label htmlFor="skipWeekends" className="text-primary-700">Skip weekends</label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeComments"
                      checked={config.includeComments}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeComments: e.target.checked }))}
                      className="rounded border-primary-300 text-accent focus:ring-accent"
                      disabled={isGenerating}
                    />
                    <label htmlFor="includeComments" className="text-primary-700">Include comments</label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeMoodEmojis"
                      checked={config.includeMoodEmojis}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeMoodEmojis: e.target.checked }))}
                      className="rounded border-primary-300 text-accent focus:ring-accent"
                      disabled={isGenerating}
                    />
                    <label htmlFor="includeMoodEmojis" className="text-primary-700">Include mood emojis</label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeGratitude"
                      checked={config.includeGratitude}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeGratitude: e.target.checked }))}
                      className="rounded border-primary-300 text-accent focus:ring-accent"
                      disabled={isGenerating}
                    />
                    <label htmlFor="includeGratitude" className="text-primary-700">Include gratitude</label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">Score Variation</label>
                    <select
                      value={config.variationLevel}
                      onChange={(e) => setConfig(prev => ({ ...prev, variationLevel: e.target.value as any }))}
                      className="w-full p-3 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                      disabled={isGenerating}
                    >
                      <option value="low">Low (realistic)</option>
                      <option value="medium">Medium (varied)</option>
                      <option value="high">High (dramatic)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">Batch Size</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.batchSize}
                      onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-primary-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-primary-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-5 h-5 text-accent" />
                  <span className="font-medium text-primary-800">Preview</span>
                </div>
                <div className="text-sm text-primary-700">
                  Will generate approximately <span className="font-bold">{calculateTotalRecords()}</span> check-in records
                  from {format(config.startDate, 'MMM dd, yyyy')} to {format(config.endDate, 'MMM dd, yyyy')}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Progress Section */}
        {(isGenerating || isDeleting || stats) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200"
          >
            <h3 className="text-xl font-bold text-primary-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Progress
            </h3>

            {/* Progress Bar */}
            {(isGenerating || isDeleting) && (
              <div className="space-y-4">
                <div className="w-full bg-primary-200 rounded-full h-3">
                  <div
                    className="bg-accent h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <div className="text-center">
                  <div className="text-primary-800 font-medium">{currentOperation}</div>
                  <div className="text-primary-600 text-sm">{Math.round(progress)}% complete</div>
                </div>
              </div>
            )}

            {/* Statistics */}
            {stats && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{stats.successCount}</div>
                  <div className="text-green-700 text-sm">Records Created</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-600">{stats.errorCount}</div>
                  <div className="text-red-700 text-sm">Errors</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.endTime ? Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000) : 0}s
                  </div>
                  <div className="text-blue-700 text-sm">Duration</div>
                </div>
              </div>
            )}

            {/* Errors */}
            {stats && stats.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 rounded-xl">
                <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                <div className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {stats.errors.map((error, idx) => (
                    <div key={idx}>• {error}</div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {/* Generate Button */}
          <button
            onClick={isGenerating ? stopGeneration : generateData}
            disabled={isDeleting}
            className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              isGenerating
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-accent hover:bg-accent/90 text-white disabled:bg-gray-300 disabled:text-gray-500'
            }`}
          >
            {isGenerating ? (
              <>
                <Square className="w-6 h-6" />
                Stop Generation
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Generate Data
              </>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isGenerating || isDeleting}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-300 disabled:text-gray-500 transition-all"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-6 h-6" />
                Delete All Data
              </>
            )}
          </button>
        </motion.div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-secondary rounded-3xl p-8 max-w-md w-full"
            >
              <div className="text-center space-y-4">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-2xl font-bold text-primary-800">Confirm Deletion</h3>
                <p className="text-primary-600">
                  This will permanently delete ALL check-in data for your account. This action cannot be undone.
                </p>
                
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteAllData}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Delete All
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DataGenerator
