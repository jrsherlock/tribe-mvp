import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Activity, CheckCircle, XCircle, Clock, Database } from 'lucide-react'

interface AuthEvent {
  timestamp: number
  event: string
  details: string
  type: 'info' | 'success' | 'warning' | 'error'
}

/**
 * Development-only component for monitoring auth system health
 * Shows real-time auth events, session state, and performance metrics
 */
export const AuthDebugPanel: React.FC = () => {
  const [events, setEvents] = useState<AuthEvent[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [sessionState, setSessionState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [lastEventTime, setLastEventTime] = useState<number>(0)
  const [eventCount, setEventCount] = useState(0)

  // Only show in development
  const isDev = import.meta.env.DEV
  if (!isDev) return null

  useEffect(() => {
    const addEvent = (event: string, details: string, type: AuthEvent['type'] = 'info') => {
      const timestamp = Date.now()
      setEvents(prev => [
        { timestamp, event, details, type },
        ...prev.slice(0, 49) // Keep last 50 events
      ])
      setLastEventTime(timestamp)
      setEventCount(prev => prev + 1)
    }

    // Monitor auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const eventType = event === 'SIGNED_IN' ? 'success' : 
                       event === 'SIGNED_OUT' ? 'warning' : 
                       event === 'TOKEN_REFRESHED' ? 'info' : 'info'
      
      addEvent(
        `Auth: ${event}`,
        session ? `User: ${session.user.email}` : 'No session',
        eventType
      )

      setSessionState(session ? 'authenticated' : 'unauthenticated')
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionState(session ? 'authenticated' : 'unauthenticated')
      addEvent(
        'Initial Session Check',
        session ? `User: ${session.user.email}` : 'No session',
        'info'
      )
    })

    // Monitor localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('supabase') || e.key?.includes('sb-')) {
        addEvent(
          'Storage Change',
          `Key: ${e.key?.substring(0, 30)}...`,
          'info'
        )
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const getTimeSinceLastEvent = () => {
    if (!lastEventTime) return 'N/A'
    const diff = Date.now() - lastEventTime
    if (diff < 1000) return `${diff}ms ago`
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    return `${Math.floor(diff / 60000)}m ago`
  }

  const getEventIcon = (type: AuthEvent['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={12} className="text-green-400" />
      case 'error': return <XCircle size={12} className="text-red-400" />
      case 'warning': return <Activity size={12} className="text-yellow-400" />
      default: return <Activity size={12} className="text-blue-400" />
    }
  }

  const getSessionIcon = () => {
    switch (sessionState) {
      case 'authenticated': return <CheckCircle size={16} className="text-green-400" />
      case 'unauthenticated': return <XCircle size={16} className="text-gray-400" />
      default: return <Clock size={16} className="text-yellow-400 animate-spin" />
    }
  }

  const clearEvents = () => {
    setEvents([])
    setEventCount(0)
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isExpanded ? (
        // Collapsed view - just a status indicator
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-indigo-900 text-white rounded-lg shadow-2xl p-3 border-2 border-indigo-500 hover:bg-indigo-800 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {getSessionIcon()}
            <span className="text-xs font-medium">Auth Monitor</span>
            {eventCount > 0 && (
              <span className="bg-indigo-600 px-2 py-0.5 rounded-full text-xs">
                {eventCount}
              </span>
            )}
          </div>
        </button>
      ) : (
        // Expanded view - full event log
        <div className="bg-indigo-900 text-white rounded-lg shadow-2xl border-2 border-indigo-500 w-96 max-h-96 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-indigo-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database size={16} className="text-indigo-300" />
              <h3 className="font-bold text-sm">Auth System Monitor</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-indigo-300 hover:text-white text-xs"
            >
              Minimize
            </button>
          </div>

          {/* Status Bar */}
          <div className="p-2 bg-indigo-800 border-b border-indigo-700 grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              {getSessionIcon()}
              <span className="text-indigo-200">
                {sessionState === 'authenticated' ? 'Signed In' : 
                 sessionState === 'unauthenticated' ? 'Signed Out' : 'Loading'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={12} className="text-indigo-300" />
              <span className="text-indigo-200">{getTimeSinceLastEvent()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Activity size={12} className="text-indigo-300" />
              <span className="text-indigo-200">{eventCount} events</span>
            </div>
          </div>

          {/* Event Log */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-64">
            {events.length === 0 ? (
              <div className="text-center text-indigo-300 text-xs py-4">
                No events yet. Waiting for auth activity...
              </div>
            ) : (
              events.map((event, idx) => (
                <div
                  key={idx}
                  className="bg-indigo-800 bg-opacity-50 rounded p-2 text-xs border border-indigo-700"
                >
                  <div className="flex items-start space-x-2">
                    {getEventIcon(event.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white truncate">
                          {event.event}
                        </span>
                        <span className="text-indigo-300 text-[10px] ml-2 flex-shrink-0">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <div className="text-indigo-200 truncate mt-0.5">
                        {event.details}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-indigo-700 flex items-center justify-between">
            <button
              onClick={clearEvents}
              className="text-xs text-indigo-300 hover:text-white"
            >
              Clear Events
            </button>
            <div className="text-[10px] text-indigo-400">
              DEV MODE ONLY
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

