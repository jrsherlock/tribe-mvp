/**
 * Facility User Management Component
 * Manage users within a facility: invite, assign to groups, suspend, manage roles
 */

import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Shield, Ban, Edit, Trash2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { listMembershipsByTenant, updateMembershipRole, deleteMembership, type Membership } from '@/lib/services/tenants';
import { getUserProfiles, type UserProfile } from '@/lib/services/users';
import { InviteUserModal } from './InviteUserModal';
import { AssignToGroupModal } from './AssignToGroupModal';
import toast from 'react-hot-toast';

interface FacilityUserManagementProps {
  tenantId: string;
  tenantName: string;
  canEdit: boolean;
  onUpdate?: () => void;
}

interface UserWithProfile extends Membership {
  profile?: UserProfile;
  groupCount?: number;
}

export function FacilityUserManagement({ tenantId, tenantName, canEdit, onUpdate }: FacilityUserManagementProps) {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; userName: string; groupIds: string[] } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [tenantId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all memberships for this tenant
      const { data: memberships, error: membershipsError } = await listMembershipsByTenant(tenantId);
      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setUsers([]);
        return;
      }

      // Get user profiles
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await getUserProfiles(userIds);

      // Get group memberships count for each user
      const { data: groupMemberships } = await supabase
        .from('group_memberships')
        .select('user_id, group_id')
        .in('user_id', userIds);

      // Create a map of user_id to group count
      const groupCountMap: Record<string, number> = {};
      groupMemberships?.forEach(gm => {
        groupCountMap[gm.user_id] = (groupCountMap[gm.user_id] || 0) + 1;
      });

      // Combine data
      const usersWithProfiles: UserWithProfile[] = memberships.map(membership => ({
        ...membership,
        profile: profiles?.find(p => p.user_id === membership.user_id),
        groupCount: groupCountMap[membership.user_id] || 0
      }));

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      const { error } = await updateMembershipRole({ user_id: userId, tenant_id: tenantId, role: newRole });
      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole } : u
      ));

      toast.success(`Role updated to ${newRole}`);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this facility?`)) return;

    try {
      const { error } = await deleteMembership({ user_id: userId, tenant_id: tenantId });
      if (error) throw error;

      setUsers(prev => prev.filter(u => u.user_id !== userId));
      toast.success('User removed from facility');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast.error('Failed to remove user');
    }
  };

  const handleAssignToGroups = async (userId: string, userName: string) => {
    try {
      // Get current group memberships
      const { data: groupMemberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', userId);

      const currentGroupIds = groupMemberships?.map(gm => gm.group_id) || [];

      setSelectedUser({ userId, userName, groupIds: currentGroupIds });
      setShowAssignModal(true);
    } catch (error) {
      console.error('Failed to fetch group memberships:', error);
      toast.error('Failed to load group memberships');
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
          <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          <p className="text-sm text-gray-600 mt-1">{users.length} user{users.length !== 1 ? 's' : ''} in this facility</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        )}
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No users in this facility yet</p>
          {canEdit && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Invite Your First User
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Groups
                </th>
                {canEdit && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.profile?.avatar_url ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={user.profile.avatar_url}
                            alt={user.profile.display_name || 'User'}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.profile?.display_name || 'Unknown User'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.profile?.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canEdit ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.user_id, e.target.value as 'ADMIN' | 'MEMBER')}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.groupCount || 0} group{user.groupCount !== 1 ? 's' : ''}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAssignToGroups(user.user_id, user.profile?.display_name || 'User')}
                          className="text-purple-600 hover:text-purple-900"
                          title="Assign to Groups"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveUser(user.user_id, user.profile?.display_name || 'User')}
                          className="text-red-600 hover:text-red-900"
                          title="Remove User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          tenantId={tenantId}
          tenantName={tenantName}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            fetchUsers();
            setShowInviteModal(false);
            onUpdate?.();
          }}
        />
      )}

      {/* Assign to Groups Modal */}
      {showAssignModal && selectedUser && (
        <AssignToGroupModal
          userId={selectedUser.userId}
          userName={selectedUser.userName}
          tenantId={tenantId}
          currentGroupIds={selectedUser.groupIds}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchUsers();
            setShowAssignModal(false);
            setSelectedUser(null);
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

