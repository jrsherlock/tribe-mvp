import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Clock, Users, Download, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { type GroupEvent, submitRsvp, getUserRsvp, getEventRsvpCounts, deleteEvent, type RsvpStatus } from '../../lib/services/events'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

interface EventCardProps {
  event: GroupEvent
  groupId: string
  isAdmin: boolean
  isPast?: boolean
  delay?: number
  onUpdate: () => void
}

const EventCard: React.FC<EventCardProps> = ({ event, groupId, isAdmin, isPast = false, delay = 0, onUpdate }) => {
  const { user } = useAuth()
  const [userRsvp, setUserRsvp] = useState<RsvpStatus | null>(null)
  const [rsvpCounts, setRsvpCounts] = useState({ going: 0, not_going: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRsvpData()
    }
  }, [event.id, user])

  const fetchRsvpData = async () => {
    if (!user) return

    try {
      const [rsvpResult, countsResult] = await Promise.all([
        getUserRsvp(event.id, user.userId),
        getEventRsvpCounts(event.id),
      ])

      if (rsvpResult.data) {
        setUserRsvp(rsvpResult.data.status)
      }

      if (countsResult.data) {
        setRsvpCounts(countsResult.data)
      }
    } catch (error) {
      console.error('Failed to fetch RSVP data:', error)
    }
  }

  const handleRsvp = async (status: RsvpStatus) => {
    if (!user) return

    try {
      setLoading(true)
      const { error } = await submitRsvp(event.id, user.userId, status)
      if (error) throw error

      setUserRsvp(status)
      toast.success(`RSVP updated to "${status === 'going' ? 'Going' : 'Not Going'}"`)
      fetchRsvpData()
    } catch (error) {
      console.error('Failed to submit RSVP:', error)
      toast.error('Failed to update RSVP')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const { error } = await deleteEvent(event.id)
      if (error) throw error

      toast.success('Event deleted successfully')
      onUpdate()
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error('Failed to delete event')
    }
  }

  const downloadICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sangha//Group Events//EN
BEGIN:VEVENT
UID:${event.id}@sangha.app
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}
DTSTART:${format(new Date(event.start_time), "yyyyMMdd'T'HHmmss'Z'")}
DTEND:${format(new Date(event.end_time), "yyyyMMdd'T'HHmmss'Z'")}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location_details || ''}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.replace(/\s+/g, '-')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Calendar event downloaded!')
  }

  // Determine gradient colors based on event type
  const gradientFrom = isPast ? 'from-slate-400' : event.location_type === 'virtual' ? 'from-blue-500' : 'from-green-500'
  const gradientTo = isPast ? 'to-slate-500' : event.location_type === 'virtual' ? 'to-indigo-400' : 'to-teal-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden rounded-3xl p-6
        bg-gradient-to-br ${gradientFrom} ${gradientTo}
        shadow-lg hover:shadow-2xl
        transition-shadow duration-300
        ${isPast ? 'opacity-75' : ''}
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

      {/* Content */}
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">
              {event.title}
            </h3>
            {event.description && (
              <p className="text-white/90 text-sm line-clamp-2">
                {event.description}
              </p>
            )}
          </div>

          {isAdmin && !isPast && (
            <button
              onClick={handleDelete}
              className="ml-2 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-2 text-white/90 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{format(new Date(event.start_time), 'MMM d, yyyy')}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">
              {event.location_type === 'virtual' ? '🌐 Virtual' : '📍 In-Person'}
              {event.location_details && ` • ${event.location_details}`}
            </span>
          </div>

          {rsvpCounts.going > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{rsvpCounts.going} going</span>
            </div>
          )}
        </div>

        {/* RSVP Buttons (only for upcoming events) */}
        {!isPast && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleRsvp('going')}
              disabled={loading}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium
                transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${userRsvp === 'going'
                  ? 'bg-white text-green-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
                }
              `}
            >
              <CheckCircle className="w-4 h-4" />
              Going
            </button>

            <button
              onClick={() => handleRsvp('not_going')}
              disabled={loading}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium
                transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${userRsvp === 'not_going'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
                }
              `}
            >
              <XCircle className="w-4 h-4" />
              Can't Go
            </button>
          </div>
        )}

        {/* Download Calendar Button */}
        <button
          onClick={downloadICS}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Add to Calendar
        </button>
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
  )
}

export default EventCard

