/**
 * All Users View Component
 * Flat table view of ALL users across the platform
 * SuperUser only - provides global user management
 */

import React, { useState, useMemo } from 'react';
import { useAllUsers, type ComprehensiveUser } from '@/hooks/useAllUsers';
import { Search, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { AllUsersSummary } from './AllUsersSummary';
import { AllUsersTable } from './AllUsersTable';
import { AllUsersFilters } from './AllUsersFilters';
import { AllUsersDetailPanel } from './AllUsersDetailPanel';

export interface AllUsersViewProps {
  selectedUser: ComprehensiveUser | null;
  onSelectUser: (user: ComprehensiveUser) => void;
  onRefresh: () => void;
}

export function AllUsersView({ selectedUser, onSelectUser, onRefresh }: AllUsersViewProps) {
  const { users, loading, error, refetch } = useAllUsers();

  const handleRefresh = () => {
    refetch();
    onRefresh();
  };
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Get unique facilities and groups for filters
  const { facilities, groups } = useMemo(() => {
    const facilitySet = new Set<string>();
    const groupSet = new Set<string>();

    users.forEach(user => {
      if (user.facility) {
        facilitySet.add(JSON.stringify({ id: user.facility.id, name: user.facility.name }));
      }
      user.groups.forEach(group => {
        groupSet.add(JSON.stringify({ id: group.id, name: group.name }));
      });
    });

    return {
      facilities: Array.from(facilitySet).map(f => JSON.parse(f)),
      groups: Array.from(groupSet).map(g => JSON.parse(g))
    };
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          user.display_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'superuser' && !user.is_superuser) return false;
        if (roleFilter === 'facility_admin' && user.platform_role !== 'Facility Admin') return false;
        if (roleFilter === 'basic_user' && user.platform_role !== 'Basic User') return false;
        if (roleFilter === 'solo_user' && user.platform_role !== 'Solo User') return false;
      }

      // Facility filter
      if (facilityFilter !== 'all') {
        if (facilityFilter === 'solo' && user.facility !== null) return false;
        if (facilityFilter !== 'solo' && user.facility?.id !== facilityFilter) return false;
      }

      // Group filter
      if (groupFilter !== 'all') {
        if (groupFilter === 'none' && user.groups.length > 0) return false;
        if (groupFilter !== 'none' && !user.groups.some(g => g.id === groupFilter)) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, facilityFilter, groupFilter]);

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  // Handle export to CSV
  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Role', 'Facility', 'Groups', 'SuperUser'].join(','),
      ...filteredUsers.map(user => [
        user.display_name,
        user.email,
        user.platform_role,
        user.facility?.name || 'Solo User',
        user.groups.map(g => g.name).join('; ') || 'None',
        user.is_superuser ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading all users...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Error Loading Users</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Filters and Table */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden border-r border-gray-200">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">All Users</h2>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export to CSV"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-4 bg-white border-b border-gray-200">
          <AllUsersSummary users={users} filteredUsers={filteredUsers} />
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b border-gray-200">
          <AllUsersFilters
            roleFilter={roleFilter}
            facilityFilter={facilityFilter}
            groupFilter={groupFilter}
            facilities={facilities}
            groups={groups}
            onRoleFilterChange={(value) => {
              setRoleFilter(value);
              setCurrentPage(1);
            }}
            onFacilityFilterChange={(value) => {
              setFacilityFilter(value);
              setCurrentPage(1);
            }}
            onGroupFilterChange={(value) => {
              setGroupFilter(value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* User Table */}
        <div className="flex-1 overflow-auto">
          <AllUsersTable
            users={paginatedUsers}
            selectedUserId={selectedUser?.id || null}
            onSelectUser={onSelectUser}
            currentPage={currentPage}
            totalPages={totalPages}
            totalUsers={filteredUsers.length}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Right Panel - User Details */}
      {selectedUser && (
        <AllUsersDetailPanel
          user={selectedUser}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

