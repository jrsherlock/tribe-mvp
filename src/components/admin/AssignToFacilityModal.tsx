/**
 * Assign to Facility Modal
 * Allows SuperUsers to assign/reassign users to facilities or remove them from facilities
 */

import React, { useState, useEffect } from 'react';
import { X, Building2, AlertTriangle, Users as UsersIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { listTenants, type Tenant } from '@/lib/services/tenants';
import toast from 'react-hot-toast';

interface AssignToFacilityModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentFacility: { id: string; name: string; role: string } | null;
  currentGroupCount: number;
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

export function AssignToFacilityModal({
  userId,
  userName,
  userEmail,
  currentFacility,
  currentGroupCount,
  onClose,
  onSuccess
}: AssignToFacilityModalProps) {
  const [facilities, setFacilities] = useState<Tenant[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(currentFacility?.id || '');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MEMBER'>(
    (currentFacility?.role as 'ADMIN' | 'MEMBER') || 'MEMBER'
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const { data, error } = await listTenants();
      if (error) throw error;
      setFacilities(data || []);
    } catch (error: any) {
      console.error('Failed to fetch facilities:', error);
      toast.error('Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedFacilityId) {
      toast.error('Please select a facility');
      return;
    }

    try {
      setSubmitting(true);
      const adminClient = getAdminClient();
      if (!adminClient) {
        throw new Error('Service role key required');
      }

      // ONE-TENANT-PER-USER RULE ENFORCEMENT:
      // If user is currently in a different facility, remove them first
      // This ensures we never violate the one-tenant-per-user constraint
      if (currentFacility && currentFacility.id !== selectedFacilityId) {
        console.log(`[AssignToFacility] Moving user ${userId} from ${currentFacility.name} to new facility`);

        // Remove from current facility (this will cascade delete group memberships and user_profiles)
        const { error: deleteError } = await adminClient
          .from('tenant_members')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', currentFacility.id);

        if (deleteError) {
          console.error('[AssignToFacility] Failed to remove from current facility:', deleteError);
          throw new Error(`Failed to remove user from ${currentFacility.name}: ${deleteError.message}`);
        }
      }

      // Assign to new facility (or update role if same facility)
      const { error: upsertError } = await adminClient
        .from('tenant_members')
        .upsert({
          user_id: userId,
          tenant_id: selectedFacilityId,
          role: selectedRole
        }, {
          onConflict: 'user_id,tenant_id'
        });

      if (upsertError) {
        console.error('[AssignToFacility] Failed to assign to facility:', upsertError);

        // Handle database constraint violations with user-friendly messages
        if (upsertError.code === '23505') {
          // Unique constraint violation - user already in a tenant
          throw new Error(
            `${userName} is already a member of another facility. ` +
            `Users can only belong to one facility at a time. ` +
            `Please remove them from their current facility first.`
          );
        }

        throw upsertError;
      }

      const facilityName = facilities.find(f => f.id === selectedFacilityId)?.name || 'facility';

      if (currentFacility && currentFacility.id !== selectedFacilityId) {
        toast.success(`${userName} moved to ${facilityName}`);
      } else if (currentFacility) {
        toast.success(`${userName}'s role updated to ${selectedRole}`);
      } else {
        toast.success(`${userName} assigned to ${facilityName}`);
      }

      onSuccess();
    } catch (error: any) {
      console.error('[AssignToFacility] Error:', error);
      toast.error(error.message || 'Failed to assign user to facility');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!currentFacility) return;

    try {
      setSubmitting(true);
      const adminClient = getAdminClient();
      if (!adminClient) {
        throw new Error('Service role key required');
      }

      // Remove from facility (cascades to group memberships)
      const { error } = await adminClient
        .from('tenant_members')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', currentFacility.id);

      if (error) throw error;

      toast.success(`${userName} removed from ${currentFacility.name}`);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to remove user:', error);
      toast.error(error.message || 'Failed to remove user from facility');
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges = currentFacility 
    ? (selectedFacilityId !== currentFacility.id || selectedRole !== currentFacility.role)
    : selectedFacilityId !== '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Assign to Facility
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {userName} ({userEmail})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          {currentFacility && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Currently Assigned</p>
                  <p className="text-sm text-blue-700 mt-1">
                    {currentFacility.name} ({currentFacility.role})
                  </p>
                  {currentGroupCount > 0 && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                      <UsersIcon className="w-3 h-3" />
                      Member of {currentGroupCount} {currentGroupCount === 1 ? 'group' : 'groups'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Warning about group removal */}
          {currentFacility && currentGroupCount > 0 && selectedFacilityId !== currentFacility.id && selectedFacilityId !== '' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900">Warning</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Moving this user to a different facility will remove them from all {currentGroupCount} group{currentGroupCount === 1 ? '' : 's'} in {currentFacility.name}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Facility Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Facility
            </label>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              >
                <option value="">-- Select a facility --</option>
                {facilities.map(facility => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Role Selection */}
          {selectedFacilityId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role in Facility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedRole('MEMBER')}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium
                    ${selectedRole === 'MEMBER'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }
                  `}
                  disabled={submitting}
                >
                  Member
                </button>
                <button
                  onClick={() => setSelectedRole('ADMIN')}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium
                    ${selectedRole === 'ADMIN'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }
                  `}
                  disabled={submitting}
                >
                  Admin
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <div>
            {currentFacility && !showRemoveConfirm && (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                disabled={submitting}
              >
                Remove from Facility
              </button>
            )}
            {showRemoveConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">Are you sure?</span>
                <button
                  onClick={handleRemove}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  disabled={submitting}
                >
                  {submitting ? 'Removing...' : 'Yes, Remove'}
                </button>
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!hasChanges || submitting || !selectedFacilityId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : currentFacility ? 'Update Assignment' : 'Assign to Facility'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

