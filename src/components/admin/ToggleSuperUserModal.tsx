/**
 * Toggle SuperUser Modal
 * Allows SuperUsers to grant or revoke SuperUser status
 */

import React, { useState } from 'react';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface ToggleSuperUserModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  isSuperUser: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Singleton admin client
let adminClientInstance: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );
  }

  return adminClientInstance;
}

export function ToggleSuperUserModal({
  userId,
  userName,
  userEmail,
  isSuperUser,
  onClose,
  onSuccess
}: ToggleSuperUserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleToggle = async () => {
    if (!confirmed) {
      toast.error('Please confirm by checking the box');
      return;
    }

    try {
      setSubmitting(true);
      const adminClient = getAdminClient();
      if (!adminClient) {
        throw new Error('Service role key required');
      }

      if (isSuperUser) {
        // Remove SuperUser status
        const { error } = await adminClient
          .from('superusers')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
        toast.success(`${userName} is no longer a SuperUser`);
      } else {
        // Grant SuperUser status
        const { error } = await adminClient
          .from('superusers')
          .insert({
            user_id: userId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success(`${userName} is now a SuperUser`);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to toggle SuperUser status:', error);
      toast.error(error.message || 'Failed to update SuperUser status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {isSuperUser ? 'Revoke SuperUser' : 'Grant SuperUser'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* User Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">User</p>
            <p className="font-semibold text-gray-900">{userName}</p>
            <p className="text-sm text-gray-600">{userEmail}</p>
          </div>

          {/* Warning */}
          <div className={`
            border rounded-lg p-4
            ${isSuperUser 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-purple-50 border-purple-200'
            }
          `}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`
                w-5 h-5 mt-0.5
                ${isSuperUser ? 'text-yellow-600' : 'text-purple-600'}
              `} />
              <div className="flex-1">
                <p className={`
                  text-sm font-semibold
                  ${isSuperUser ? 'text-yellow-900' : 'text-purple-900'}
                `}>
                  {isSuperUser ? 'Warning: Revoking SuperUser Access' : 'Granting SuperUser Access'}
                </p>
                <p className={`
                  text-sm mt-1
                  ${isSuperUser ? 'text-yellow-700' : 'text-purple-700'}
                `}>
                  {isSuperUser ? (
                    <>
                      This user will lose access to:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All facilities and users (global view)</li>
                        <li>Ability to create/delete facilities</li>
                        <li>Ability to manage any user</li>
                        <li>SuperUser-only features</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      This user will gain access to:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All facilities and users (global view)</li>
                        <li>Ability to create/delete facilities</li>
                        <li>Ability to manage any user</li>
                        <li>All SuperUser features</li>
                      </ul>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">
              I understand the implications and want to {isSuperUser ? 'revoke' : 'grant'} SuperUser access for <strong>{userName}</strong>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-2 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            disabled={!confirmed || submitting}
            className={`
              px-4 py-2 rounded-lg transition-colors font-medium text-white
              ${isSuperUser 
                ? 'bg-yellow-600 hover:bg-yellow-700' 
                : 'bg-purple-600 hover:bg-purple-700'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {submitting ? 'Processing...' : isSuperUser ? 'Revoke SuperUser' : 'Grant SuperUser'}
          </button>
        </div>
      </div>
    </div>
  );
}

