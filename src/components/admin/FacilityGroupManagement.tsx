/**
 * Facility Group Management Component
 * Manage groups within a facility: create, edit, delete groups
 */

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { listGroups, createGroup, deleteGroup, listGroupMembers, type Group } from '@/lib/services/groups';
import { CreateGroupModal } from './CreateGroupModal';
import { EditEntityModal, type EditGroupData } from './EditEntityModal';
import toast from 'react-hot-toast';

interface FacilityGroupManagementProps {
  tenantId: string;
  tenantName: string;
  canEdit: boolean;
  onUpdate?: () => void;
}

interface GroupWithMembers extends Group {
  memberCount: number;
}

export function FacilityGroupManagement({ tenantId, tenantName, canEdit, onUpdate }: FacilityGroupManagementProps) {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<EditGroupData | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [tenantId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data: groupList, error } = await listGroups(tenantId);
      if (error) throw error;

      if (!groupList || groupList.length === 0) {
        setGroups([]);
        return;
      }

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        groupList.map(async (group) => {
          const { data: members } = await listGroupMembers(group.id);
          return {
            ...group,
            memberCount: members?.length || 0
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = (group: GroupWithMembers) => {
    setSelectedGroup({
      id: group.id,
      name: group.name,
      description: group.description || null
    });
    setShowEditModal(true);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"? This will remove all members from the group.`)) {
      return;
    }

    try {
      const { error } = await deleteGroup(groupId);
      if (error) throw error;

      setGroups(prev => prev.filter(g => g.id !== groupId));
      toast.success('Group deleted successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Groups</h3>
          <p className="text-sm text-gray-600 mt-1">{groups.length} group{groups.length !== 1 ? 's' : ''} in this facility</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        )}
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No groups in this facility yet</p>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create Your First Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <div
              key={group.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{group.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditGroup(group)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Group"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {group.description && (
                <p className="text-sm text-gray-600 mb-4">{group.description}</p>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Created {new Date(group.created_at || '').toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          tenantId={tenantId}
          tenantName={tenantName}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchGroups();
            setShowCreateModal(false);
            onUpdate?.();
          }}
        />
      )}

      {/* Edit Group Modal */}
      {showEditModal && selectedGroup && (
        <EditEntityModal
          entityType="group"
          data={selectedGroup}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGroup(null);
          }}
          onSuccess={() => {
            fetchGroups();
            setShowEditModal(false);
            setSelectedGroup(null);
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

