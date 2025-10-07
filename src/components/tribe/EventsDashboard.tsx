import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, MapPin, Clock, Users, Download } from 'lucide-react'
import { getUpcomingEvents, getPastEvents, type GroupEvent } from '../../lib/services/events'
import EventCard from './EventCard'
import EventFormModal from './EventFormModal'
import toast from 'react-hot-toast'

interface EventsDashboardProps {
  groupId: string
  isAdmin: boolean
}

const EventsDashboard: React.FC<EventsDashboardProps> = ({ groupId, isAdmin }) => {
  const [upcomingEvents, setUpcomingEvents] = useState<GroupEvent[]>([])
  const [pastEvents, setPastEvents] = useState<GroupEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPastEvents, setShowPastEvents] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [groupId])

  const fetchEvents = async () => {
    try {
      setLoading(true)

      const [upcomingResult, pastResult] = await Promise.all([
        getUpcomingEvents(groupId),
        getPastEvents(groupId),
      ])

      if (upcomingResult.error) throw upcomingResult.error
      if (pastResult.error) throw pastResult.error

      setUpcomingEvents((upcomingResult.data || []) as GroupEvent[])
      setPastEvents((pastResult.data || []) as GroupEvent[])
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-primary-600">Loading events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary-800">Group Events</h2>
          <p className="text-primary-600 mt-1">Stay connected with group activities</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-600 text-white rounded-xl font-medium transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        )}
      </div>

      {/* Upcoming Events Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-accent" />
          <h3 className="text-xl font-semibold text-primary-800">
            Upcoming Events ({upcomingEvents.length})
          </h3>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12 bg-primary-50 rounded-2xl border-2 border-dashed border-primary-200">
            <Calendar className="w-12 h-12 text-primary-400 mx-auto mb-3" />
            <p className="text-primary-700 font-medium">No upcoming events</p>
            <p className="text-sm text-primary-600 mt-1">
              {isAdmin ? 'Create the first event to get started!' : 'Check back later for new events'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                groupId={groupId}
                isAdmin={isAdmin}
                onUpdate={fetchEvents}
                delay={index * 0.1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div>
          <button
            onClick={() => setShowPastEvents(!showPastEvents)}
            className="flex items-center gap-2 mb-4 text-primary-700 hover:text-primary-900 transition-colors"
          >
            <Clock className="w-6 h-6" />
            <h3 className="text-xl font-semibold">
              Past Events ({pastEvents.length})
            </h3>
            <motion.div
              animate={{ rotate: showPastEvents ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {showPastEvents && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {pastEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    groupId={groupId}
                    isAdmin={isAdmin}
                    onUpdate={fetchEvents}
                    isPast={true}
                    delay={index * 0.1}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <EventFormModal
            groupId={groupId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              fetchEvents()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default EventsDashboard

