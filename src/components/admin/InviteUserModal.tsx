import React, { useState, useEffect } from 'react'
import { X, Mail, Shield, Calendar, Copy, Check, Users } from 'lucide-react'
import { inviteUser } from '../../lib/services/invites'
import { listGroupsByTenant } from '../../lib/services/groups'
import toast from 'react-hot-toast'

interface InviteUserModalProps {
  tenantId: string
  tenantName: string
  onClose: () => void
  onSuccess: () => void
}

interface Group {
  id: string
  name: string
  description?: string
}

export function InviteUserModal({ tenantId, tenantName, onClose, onSuccess }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Load groups for this tenant
  useEffect(() => {
    async function fetchGroups() {
      try {
        const { data, error } = await listGroupsByTenant(tenantId)
        if (error) {
          console.error('Failed to load groups:', error)
          toast.error('Failed to load groups')
          return
        }
        setGroups(data || [])
      } catch (err) {
        console.error('Error loading groups:', err)
      } finally {
        setLoadingGroups(false)
      }
    }
    fetchGroups()
  }, [tenantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setLoading(true)
    try {
      const result = await inviteUser({
        email: email.trim(),
        tenant_id: tenantId,
        role,
        expires_in_days: expiresInDays,
        group_id: selectedGroupId || undefined,
      })

      // Check if email was sent successfully
      if (result.email_sent) {
        toast.success(`Invitation sent to ${email}!`)
        onSuccess()
        onClose()
      } else if (result.accept_url) {
        // Email failed, show manual link
        setInviteLink(result.accept_url)
        toast.success('Invitation created! Share the link below.')
      } else {
        toast.success(`Invitation sent to ${email}`)
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      console.error('Invite error:', err)
      toast.error(err.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Invite User</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add a new member to <strong>{tenantName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="inline w-4 h-4 mr-1" />
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Facility Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {role === 'ADMIN'
                ? '✓ Can manage facility, groups, and members'
                : '✓ Can participate in groups and view shared content'}
            </p>
          </div>

          {/* Group Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Assign to Group (Optional)
            </label>
            {loadingGroups ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                No groups available
              </div>
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">No group (user can join later)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {selectedGroupId
                ? '✓ User will be automatically added to this group'
                : 'User can join groups after accepting the invitation'}
            </p>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Invitation Expires In
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days (recommended)</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          {/* Invite Link (if email not configured) */}
          {inviteLink && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-blue-900">
                📧 Email not configured - Share this link manually:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-blue-700">
                Send this link to {email} via your preferred method.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!inviteLink}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : inviteLink ? 'Invitation Created' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

