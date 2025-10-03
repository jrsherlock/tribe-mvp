import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../lib/tenant'
import { useUserRole } from '../hooks/useUserRole'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Shield, Lock, AlertCircle } from 'lucide-react'

const TenantSetup: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { memberships, currentTenantId, setCurrentTenantId } = useTenant()
  const { canCreateFacilities, isSuperUser, loading: roleLoading } = useUserRole(currentTenantId)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return

    // Redirect if user already has a facility
    if (currentTenantId || memberships.length > 0) {
      navigate('/groups', { replace: true })
      return
    }

    // Redirect non-SuperUsers away from this page
    if (!roleLoading && !canCreateFacilities) {
      toast.error('Only SuperUsers can create facilities', { duration: 4000 })
      navigate('/dashboard', { replace: true })
    }
  }, [user, currentTenantId, memberships, canCreateFacilities, roleLoading, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Double-check permission before submitting
    if (!canCreateFacilities) {
      toast.error('Only SuperUsers can create facilities')
      navigate('/dashboard')
      return
    }

    if (!name.trim() || !slug.trim()) {
      toast.error('Please provide both a name and slug')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('create_tenant', {
        p_name: name.trim(),
        p_slug: slug.trim()
      })

      if (error) {
        // Handle RLS policy violation
        if (error.code === '42501') {
          toast.error('You do not have permission to create facilities')
          navigate('/dashboard')
          return
        }
        throw error
      }

      toast.success('Facility created successfully! 🎉')
      if (data?.id) setCurrentTenantId(data.id)
      navigate('/groups')
    } catch (err: any) {
      console.error('Facility creation error:', err)

      // Handle specific error cases with user-friendly messages
      if (err.message?.includes('already belong to a facility')) {
        toast.error('You already have a facility. Each user can only belong to one facility.', {
          duration: 5000,
        })
        setTimeout(() => navigate('/groups'), 2000)
      } else if (err.code === '23505') {
        toast.error('You already have a facility. Redirecting...', {
          duration: 4000,
        })
        setTimeout(() => navigate('/groups'), 2000)
      } else {
        toast.error(err.message || 'Failed to create facility')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking role
  if (roleLoading) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-sand-600">Loading...</div>
        </div>
      </div>
    )
  }

  // Show access denied message for non-SuperUsers
  if (!canCreateFacilities) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-red-200 rounded-lg p-6 bg-red-50"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                Access Restricted
              </h2>
              <p className="text-red-800 mb-4">
                Only SuperUsers (platform administrators) can create new facilities.
              </p>
              <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-900 font-medium mb-2">
                  What you can do:
                </p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>Contact a platform administrator to create a facility for you</li>
                  <li>Ask to be invited to an existing facility</li>
                  <li>Use the platform in solo mode (personal features only)</li>
                </ul>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* Header with SuperUser badge */}
      <div className="flex items-center gap-3 mb-4">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold"
        >
          Create Your Facility
        </motion.h1>
        {isSuperUser && (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            SuperUser
          </span>
        )}
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">
              Creating a facility for a customer
            </p>
            <p className="text-sm text-blue-800 mt-1">
              As a SuperUser, you can create unlimited facilities for different organizations.
              Each facility will have its own groups, members, and data.
            </p>
          </div>
        </div>
      </div>

      <p className="text-sand-700 mb-6">
        Create an organization (facility) to enable group features and sharing within your site.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Facility Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500"
            placeholder="Acme Recovery Center"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500"
            placeholder="acme-recovery"
            pattern="[a-z0-9-]+"
            required
          />
          <p className="text-xs text-sand-600 mt-1">
            Lowercase letters, numbers, and hyphens only. Used in URLs.
          </p>
        </div>
        <button
          disabled={loading || !name.trim() || !slug.trim()}
          type="submit"
          className="w-full bg-sage-600 hover:bg-sage-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Create Facility'}
        </button>
      </form>
    </div>
  )
}

export default TenantSetup

