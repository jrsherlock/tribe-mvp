/**
 * All Users Filters Component
 * Filter controls for role, facility, and group
 */

import React from 'react';
import { Filter } from 'lucide-react';

interface AllUsersFiltersProps {
  roleFilter: string;
  facilityFilter: string;
  groupFilter: string;
  facilities: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string }>;
  onRoleFilterChange: (value: string) => void;
  onFacilityFilterChange: (value: string) => void;
  onGroupFilterChange: (value: string) => void;
}

export function AllUsersFilters({
  roleFilter,
  facilityFilter,
  groupFilter,
  facilities,
  groups,
  onRoleFilterChange,
  onFacilityFilterChange,
  onGroupFilterChange
}: AllUsersFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Filter className="w-4 h-4" />
        <span>Filters</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Role Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="superuser">SuperUser</option>
            <option value="facility_admin">Facility Admin</option>
            <option value="basic_user">Basic User</option>
            <option value="solo_user">Solo User</option>
          </select>
        </div>

        {/* Facility Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Facility
          </label>
          <select
            value={facilityFilter}
            onChange={(e) => onFacilityFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Facilities</option>
            <option value="solo">Solo Users (No Facility)</option>
            {facilities.map(facility => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </div>

        {/* Group Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Group
          </label>
          <select
            value={groupFilter}
            onChange={(e) => onGroupFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Groups</option>
            <option value="none">No Groups</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

