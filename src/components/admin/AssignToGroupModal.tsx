/**
 * Assign to Group Modal
 * Assign users to one or more groups within a facility
 */

import React, { useState, useEffect } from 'react';
import { X, Users, AlertCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminAddUserToGroup } from '@/lib/services/groups';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

interface AssignToGroupModalProps {
  userId: string;
  userName: string;
  tenantId: string;
  currentGroupIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignToGroupModal({
  userId,
  userName,
  tenantId,
  currentGroupIds,
  onClose,
  onSuccess
}: AssignToGroupModalProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set(currentGroupIds));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [tenantId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('id, name, description')
        .eq('tenant_id', tenantId)
        .order('name');

      if (fetchError) throw fetchError;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count } = await supabase
            .from('group_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            memberCount: count || 0
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (err: any) {
      console.error('Fetch groups error:', err);
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Determine which groups to add and remove
      const currentSet = new Set(currentGroupIds);
      const selectedSet = selectedGroupIds;

      const toAdd = Array.from(selectedSet).filter(id => !currentSet.has(id));
      const toRemove = Array.from(currentSet).filter(id => !selectedSet.has(id));

      // Add to new groups
      for (const groupId of toAdd) {
        const { error: addError } = await adminAddUserToGroup({ group_id: groupId, user_id: userId, role: 'MEMBER' });
        if (addError) throw addError;
      }

      // Remove from groups
      for (const groupId of toRemove) {
        const { error: removeError } = await supabase
          .from('group_memberships')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userId);

        if (removeError) throw removeError;
      }

      const addedCount = toAdd.length;
      const removedCount = toRemove.length;

      if (addedCount > 0 && removedCount > 0) {
        toast.success(`Updated group memberships: +${addedCount}, -${removedCount}`);
      } else if (addedCount > 0) {
        toast.success(`Added to ${addedCount} group${addedCount > 1 ? 's' : ''}`);
      } else if (removedCount > 0) {
        toast.success(`Removed from ${removedCount} group${removedCount > 1 ? 's' : ''}`);
      } else {
        toast.success('No changes made');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Assign to group error:', err);
      setError(err.message || 'Failed to update group memberships');
      toast.error(err.message || 'Failed to update group memberships');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assign to Groups</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage group memberships for <strong>{userName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">Loading groups...</p>
              </div>
            )}

            {/* Groups List */}
            {!loading && groups.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No groups available</p>
              </div>
            )}

            {!loading && groups.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Select groups to assign this user to:
                </p>
                {groups.map(group => (
                  <label
                    key={group.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      disabled={saving}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{group.name}</span>
                        <span className="text-xs text-gray-500">
                          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Summary */}
            {!loading && groups.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-900">
                  <strong>{selectedGroupIds.size}</strong> group{selectedGroupIds.size !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Update Groups
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

