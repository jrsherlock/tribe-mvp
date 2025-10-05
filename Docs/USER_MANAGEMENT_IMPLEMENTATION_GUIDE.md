# User Management Implementation Guide
**Date**: October 3, 2025  
**Priority**: HIGH  
**Status**: Ready for Implementation

---

## Overview

This guide provides detailed implementation steps for adding complete user management functionality to the AdminDashboard, enabling facility administrators to invite users, manage memberships, and assign users to groups.

---

## Current State

### ✅ Backend Ready
- Edge Function: `supabase/functions/invite_user/index.ts` (WORKING)
- Database Table: `invites` (EXISTS)
- RLS Policies: Configured for tenant_members and group_memberships
- Service Functions: All CRUD operations defined

### ❌ Frontend Missing
- No user invitation UI
- No invite acceptance page
- No user list with details (only user_id shown)
- No group member assignment UI

---

## Implementation Plan

### Phase 1: Create User Invitation Service
**File**: `src/lib/services/invites.ts` (NEW)

```typescript
import { supabase } from '../supabase'

export type Invite = {
  id: string
  tenant_id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  token: string
  created_at: string
  expires_at: string
}

/**
 * Invite a user to join a tenant
 * Calls the invite_user Edge Function
 */
export async function inviteUser(params: {
  email: string
  tenant_id: string
  role?: 'ADMIN' | 'MEMBER'
  expires_in_days?: number
}) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({
        email: params.email,
        tenant_id: params.tenant_id,
        role: params.role || 'MEMBER',
        expires_in_days: params.expires_in_days || 7,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to send invitation')
  }

  return response.json()
}

/**
 * Get pending invites for a tenant
 */
export async function listInvites(tenantId: string) {
  return supabase
    .from('invites')
    .select('*')
    .eq('tenant_id', tenantId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
}

/**
 * Verify an invite token
 */
export async function verifyInvite(token: string) {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  return { data, error }
}

/**
 * Accept an invite and create membership
 */
export async function acceptInvite(token: string) {
  const { data: invite, error: inviteError } = await verifyInvite(token)
  if (inviteError || !invite) {
    throw new Error('Invalid or expired invitation')
  }

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    throw new Error('Must be logged in to accept invitation')
  }

  // Create tenant membership
  const { error: memberError } = await supabase
    .from('tenant_members')
    .insert({
      user_id: session.session.user.id,
      tenant_id: invite.tenant_id,
      role: invite.role,
    })

  if (memberError) throw memberError

  // Delete the invite
  await supabase.from('invites').delete().eq('id', invite.id)

  return invite
}

/**
 * Cancel/delete an invite
 */
export async function cancelInvite(inviteId: string) {
  return supabase.from('invites').delete().eq('id', inviteId)
}
```

---

### Phase 2: Create User Details Service
**File**: `src/lib/services/users.ts` (NEW)

```typescript
import { supabase } from '../supabase'

export type UserProfile = {
  user_id: string
  email?: string
  display_name?: string
  avatar_url?: string
}

/**
 * Get user profiles for a list of user IDs
 * Useful for displaying user details in membership lists
 */
export async function getUserProfiles(userIds: string[]) {
  if (userIds.length === 0) return { data: [], error: null }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds)

  return { data, error }
}

/**
 * Get user email from auth.users (requires service role or RLS policy)
 * For now, we'll get it from user_profiles.email if available
 */
export async function getUserEmails(userIds: string[]) {
  if (userIds.length === 0) return { data: [], error: null }

  // Note: This requires user_profiles to have email column
  // Or we need to use a server-side function to query auth.users
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, email')
    .in('user_id', userIds)

  return { data, error }
}

/**
 * Search users by email or display name
 * Useful for adding existing users to groups
 */
export async function searchUsers(query: string, tenantId?: string) {
  let queryBuilder = supabase
    .from('user_profiles')
    .select('user_id, display_name, email, avatar_url')
    .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20)

  if (tenantId) {
    queryBuilder = queryBuilder.eq('tenant_id', tenantId)
  }

  return queryBuilder
}
```

---

### Phase 3: Create Invite User Modal Component
**File**: `src/components/admin/InviteUserModal.tsx` (NEW)

```typescript
import React, { useState } from 'react'
import { X, Mail, Shield, Calendar } from 'lucide-react'
import { inviteUser } from '@/lib/services/invites'
import toast from 'react-hot-toast'

interface InviteUserModalProps {
  tenantId: string
  tenantName: string
  onClose: () => void
  onSuccess: () => void
}

export function InviteUserModal({ tenantId, tenantName, onClose, onSuccess }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

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
      })

      // If email sending is not configured, show the invite link
      if (result.accept_url) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Invite User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Invite a user to join <strong>{tenantName}</strong>
            </p>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              />
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Facility Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {role === 'ADMIN' 
                ? 'Can manage facility, groups, and members' 
                : 'Can participate in groups and view shared content'}
            </p>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invitation Expires In
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          {/* Invite Link (if email not configured) */}
          {inviteLink && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Share this invitation link:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink)
                    toast.success('Link copied!')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## Next Steps

1. Implement the service files
2. Create the InviteUserModal component
3. Integrate into AdminDashboard
4. Create invite acceptance page
5. Add group member assignment UI
6. Test end-to-end flow

See task list for detailed breakdown.

