/**
 * All Users Detail Panel
 * Shows comprehensive user information and action buttons
 */

import React, { useState } from 'react';
import { User, Mail, Shield, Building2, Users as UsersIcon, Calendar, Clock, Edit, Trash2, UserPlus } from 'lucide-react';
import type { ComprehensiveUser } from '@/hooks/useAllUsers';
import { SuperUserBadge } from './TreeBadge';
import { AssignToFacilityModal } from './AssignToFacilityModal';
import { AssignToGroupModal } from './AssignToGroupModal';
import { ToggleSuperUserModal } from './ToggleSuperUserModal';

interface AllUsersDetailPanelProps {
  user: ComprehensiveUser;
  onRefresh: () => void;
}

export function AllUsersDetailPanel({ user, onRefresh }: AllUsersDetailPanelProps) {
  const [showAssignFacility, setShowAssignFacility] = useState(false);
  const [showAssignGroups, setShowAssignGroups] = useState(false);
  const [showToggleSuperUser, setShowToggleSuperUser] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          {/* Avatar */}
          <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {user.display_name.charAt(0).toUpperCase()}
          </div>

          {/* Name and Email */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{user.display_name}</h2>
              {user.is_superuser && <SuperUserBadge />}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          <span className={`
            inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
            ${user.platform_role === 'SuperUser' ? 'bg-purple-100 text-purple-800' : ''}
            ${user.platform_role === 'Facility Admin' ? 'bg-blue-100 text-blue-800' : ''}
            ${user.platform_role === 'Basic User' ? 'bg-green-100 text-green-800' : ''}
            ${user.platform_role === 'Solo User' ? 'bg-gray-100 text-gray-800' : ''}
          `}>
            {user.platform_role}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setShowAssignFacility(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Building2 className="w-4 h-4" />
          {user.facility ? 'Change Facility' : 'Assign to Facility'}
        </button>

        {user.facility && (
          <button
            onClick={() => setShowAssignGroups(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Manage Groups
          </button>
        )}

        <button
          onClick={() => setShowToggleSuperUser(true)}
          className={`
            px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium
            ${user.is_superuser
              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
              : 'bg-purple-600 text-white hover:bg-purple-700'
            }
          `}
        >
          <Shield className="w-4 h-4" />
          {user.is_superuser ? 'Revoke SuperUser' : 'Grant SuperUser'}
        </button>
      </div>

      {/* User Information Cards */}
      <div className="space-y-4">
        {/* Facility Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Facility Assignment
          </h3>
          {user.facility ? (
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Facility:</dt>
                <dd className="text-sm font-medium text-gray-900">{user.facility.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Role:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${user.facility.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : ''}
                    ${user.facility.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : ''}
                    ${user.facility.role === 'MEMBER' ? 'bg-green-100 text-green-800' : ''}
                  `}>
                    {user.facility.role}
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500 italic">Not assigned to any facility (Solo User)</p>
          )}
        </div>

        {/* Group Memberships */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-green-600" />
            Group Memberships
          </h3>
          {user.groups.length > 0 ? (
            <div className="space-y-2">
              {user.groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-900">{group.name}</span>
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${group.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                  `}>
                    {group.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Not a member of any groups</p>
          )}
        </div>

        {/* Account Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            Account Information
          </h3>
          <dl className="space-y-2">
            <div className="flex justify-between items-start">
              <dt className="text-sm text-gray-600 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created:
              </dt>
              <dd className="text-sm font-medium text-gray-900 text-right">
                {formatDate(user.created_at)}
              </dd>
            </div>
            <div className="flex justify-between items-start">
              <dt className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Last Sign In:
              </dt>
              <dd className="text-sm font-medium text-gray-900 text-right">
                {formatDate(user.last_sign_in_at)}
              </dd>
            </div>
            <div className="flex justify-between items-start">
              <dt className="text-sm text-gray-600 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                SuperUser:
              </dt>
              <dd className="text-sm font-medium text-gray-900">
                {user.is_superuser ? (
                  <span className="text-purple-600 font-semibold">Yes</span>
                ) : (
                  <span className="text-gray-500">No</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Statistics */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{user.groups.length}</div>
              <div className="text-xs text-blue-700 mt-1">Groups</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{user.facility ? '1' : '0'}</div>
              <div className="text-xs text-green-700 mt-1">Facility</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAssignFacility && (
        <AssignToFacilityModal
          userId={user.id}
          userName={user.display_name}
          userEmail={user.email}
          currentFacility={user.facility}
          currentGroupCount={user.groups.length}
          onClose={() => setShowAssignFacility(false)}
          onSuccess={() => {
            setShowAssignFacility(false);
            onRefresh();
          }}
        />
      )}

      {showAssignGroups && user.facility && (
        <AssignToGroupModal
          userId={user.id}
          userName={user.display_name}
          tenantId={user.facility.id}
          currentGroupIds={user.groups.map(g => g.id)}
          onClose={() => setShowAssignGroups(false)}
          onSuccess={() => {
            setShowAssignGroups(false);
            onRefresh();
          }}
        />
      )}

      {showToggleSuperUser && (
        <ToggleSuperUserModal
          userId={user.id}
          userName={user.display_name}
          userEmail={user.email}
          isSuperUser={user.is_superuser}
          onClose={() => setShowToggleSuperUser(false)}
          onSuccess={() => {
            setShowToggleSuperUser(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

