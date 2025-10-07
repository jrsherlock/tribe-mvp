/**
 * All Users Table Component
 * Sortable, paginated table of users
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Shield, Building2, Users as UsersIcon } from 'lucide-react';
import type { ComprehensiveUser } from '@/hooks/useAllUsers';
import { SuperUserBadge } from './TreeBadge';

interface AllUsersTableProps {
  users: ComprehensiveUser[];
  selectedUserId: string | null;
  onSelectUser: (user: ComprehensiveUser) => void;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  onPageChange: (page: number) => void;
}

export function AllUsersTable({
  users,
  selectedUserId,
  onSelectUser,
  currentPage,
  totalPages,
  totalUsers,
  onPageChange
}: AllUsersTableProps) {
  const [sortField, setSortField] = useState<keyof ComprehensiveUser>('display_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof ComprehensiveUser) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle nested values
    if (sortField === 'facility') {
      aValue = a.facility?.name || '';
      bValue = b.facility?.name || '';
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const SortIcon = ({ field }: { field: keyof ComprehensiveUser }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th
                onClick={() => handleSort('display_name')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Name <SortIcon field="display_name" />
              </th>
              <th
                onClick={() => handleSort('email')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Email <SortIcon field="email" />
              </th>
              <th
                onClick={() => handleSort('platform_role')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Role <SortIcon field="platform_role" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Facility
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Groups
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`
                  cursor-pointer transition-colors
                  ${selectedUserId === user.id 
                    ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {user.display_name}
                        {user.is_superuser && <SuperUserBadge />}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600">{user.email}</div>
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${user.platform_role === 'SuperUser' ? 'bg-purple-100 text-purple-800' : ''}
                    ${user.platform_role === 'Facility Admin' ? 'bg-blue-100 text-blue-800' : ''}
                    ${user.platform_role === 'Basic User' ? 'bg-green-100 text-green-800' : ''}
                    ${user.platform_role === 'Solo User' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {user.platform_role}
                  </span>
                </td>

                {/* Facility */}
                <td className="px-4 py-3">
                  {user.facility ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-900">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{user.facility.name}</span>
                      <span className="text-xs text-gray-500">({user.facility.role})</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Solo User</span>
                  )}
                </td>

                {/* Groups */}
                <td className="px-4 py-3">
                  {user.groups.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <UsersIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {user.groups.length} {user.groups.length === 1 ? 'group' : 'groups'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">No groups</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {sortedUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No users found</p>
            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalUsers)} of {totalUsers} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

