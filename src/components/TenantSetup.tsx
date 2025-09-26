import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../lib/tenant'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const TenantSetup: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { memberships, currentTenantId, setCurrentTenantId } = useTenant()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    if (currentTenantId || memberships.length > 0) {
      navigate('/groups', { replace: true })
    }
  }, [user, currentTenantId, memberships, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) {
      toast.error('Please provide a name and slug')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('create_tenant', { p_name: name.trim(), p_slug: slug.trim() })
      if (error) throw error
      toast.success('Facility created!')
      if (data?.id) setCurrentTenantId(data.id)
      navigate('/groups')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to create facility')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold mb-4">
        Create Your Facility
      </motion.h1>
      <p className="text-sand-700 mb-6">Create an organization (facility) to enable group features and sharing within your site.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Facility Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Acme Recovery Center" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="acme-recovery" />
          <p className="text-xs text-sand-600 mt-1">Lowercase and hyphens only; used in URLs.</p>
        </div>
        <button disabled={loading} type="submit" className="bg-sage-600 hover:bg-sage-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Facility'}
        </button>
      </form>
    </div>
  )
}

export default TenantSetup

