import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../lib/tenant';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';
import { Bug, ChevronDown, ChevronUp, Users, Building2, Shield, User } from 'lucide-react';

interface GroupMembership {
  group_id: string;
  group_name: string;
}

interface GroupMember {
  user_id: string;
  display_name: string;
  email: string;
}

const DevModePanel: React.FC = () => {
  const { user } = useAuth();
  const { currentTenantId, currentTenantName } = useTenant();
  const { role } = useUserRole(currentTenantId); // Pass currentTenantId to get correct role
  const [isExpanded, setIsExpanded] = useState(false);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && user) {
      fetchDiagnosticData();
    }
  }, [isExpanded, user, currentTenantId]);

  const fetchDiagnosticData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user's groups
      const { data: groupMemberships, error: groupError } = await supabase
        .from('group_memberships')
        .select(`
          group_id,
          groups:group_id (
            id,
            name
          )
        `)
        .eq('user_id', user.userId);

      if (groupError) throw groupError;

      const userGroups: GroupMembership[] = (groupMemberships || []).map((gm: any) => ({
        group_id: gm.group_id,
        group_name: gm.groups?.name || 'Unknown Group'
      }));

      setGroups(userGroups);

      // Fetch members for each group
      const membersMap: Record<string, GroupMember[]> = {};

      for (const group of userGroups) {
        // First get all user_ids in the group
        const { data: memberships, error: membershipsError } = await supabase
          .from('group_memberships')
          .select('user_id')
          .eq('group_id', group.group_id);

        if (membershipsError) {
          console.error('Error fetching group memberships:', membershipsError);
          continue;
        }

        if (!memberships || memberships.length === 0) {
          membersMap[group.group_id] = [];
          continue;
        }

        // Then fetch user profiles for those user_ids
        const userIds = memberships.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError);
          continue;
        }

        membersMap[group.group_id] = (profiles || []).map((p: any) => ({
          user_id: p.user_id,
          display_name: p.display_name || 'Unknown',
          email: p.email || 'No email'
        }));
      }

      setGroupMembers(membersMap);
    } catch (error) {
      console.error('Failed to fetch diagnostic data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // Only show in development or when explicitly enabled
  const isDev = import.meta.env.DEV || localStorage.getItem('devMode') === 'true';
  if (!isDev) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200"
        title="Developer Mode Panel"
      >
        <Bug className="w-5 h-5" />
        <span className="font-medium">Dev Mode</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute bottom-14 right-0 w-96 max-h-[600px] overflow-y-auto bg-white rounded-lg shadow-2xl border-2 border-purple-600 p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b border-purple-200 pb-3">
              <h3 className="text-lg font-bold text-purple-900 flex items-center space-x-2">
                <Bug className="w-5 h-5" />
                <span>Session Diagnostics</span>
              </h3>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading diagnostic data...</p>
              </div>
            )}

            {!loading && (
              <>
                {/* User Info */}
                <div className="bg-purple-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2 text-purple-900 font-semibold mb-2">
                    <User className="w-4 h-4" />
                    <span>User Information</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {user.display_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold text-gray-900">{user.display_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-mono text-gray-900">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="font-mono text-xs text-gray-900">{user.userId}</span>
                    </div>
                  </div>
                </div>

                {/* Role Info */}
                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2 text-blue-900 font-semibold mb-2">
                    <Shield className="w-4 h-4" />
                    <span>Role & Permissions</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="font-semibold text-blue-900">{role || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Tenant Info */}
                <div className="bg-green-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2 text-green-900 font-semibold mb-2">
                    <Building2 className="w-4 h-4" />
                    <span>Facility (Tenant)</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {currentTenantId ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-semibold text-green-900">{currentTenantName || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tenant ID:</span>
                          <span className="font-mono text-xs text-gray-900">{currentTenantId}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-600 italic">Solo Mode (No Facility)</div>
                    )}
                  </div>
                </div>

                {/* Groups Info */}
                <div className="bg-orange-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2 text-orange-900 font-semibold mb-2">
                    <Users className="w-4 h-4" />
                    <span>Groups ({groups.length})</span>
                  </div>
                  
                  {groups.length === 0 ? (
                    <div className="text-sm text-gray-600 italic">Not a member of any groups</div>
                  ) : (
                    <div className="space-y-3">
                      {groups.map((group) => (
                        <div key={group.group_id} className="bg-white rounded-md p-2 border border-orange-200">
                          <div className="font-semibold text-sm text-orange-900 mb-1">
                            {group.group_name}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            ID: <span className="font-mono">{group.group_id}</span>
                          </div>
                          
                          {/* Group Members */}
                          {groupMembers[group.group_id] && (
                            <div className="mt-2 pt-2 border-t border-orange-100">
                              <div className="text-xs font-semibold text-gray-700 mb-1">
                                Members ({groupMembers[group.group_id].length}):
                              </div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {groupMembers[group.group_id].map((member) => (
                                  <div
                                    key={member.user_id}
                                    className={`text-xs p-1 rounded ${
                                      member.user_id === user.userId
                                        ? 'bg-orange-100 font-semibold'
                                        : 'bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="truncate flex-1">
                                        {member.display_name}
                                        {member.user_id === user.userId && ' (You)'}
                                      </span>
                                    </div>
                                    <div className="text-gray-500 truncate">{member.email}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="border-t border-purple-200 pt-3 space-y-2">
                  <button
                    onClick={() => {
                      console.log('=== DEV MODE DIAGNOSTIC DUMP ===');
                      console.log('User:', user);
                      console.log('Tenant ID:', currentTenantId);
                      console.log('Tenant Name:', currentTenantName);
                      console.log('Role:', role);
                      console.log('Groups:', groups);
                      console.log('Group Members:', groupMembers);
                      console.log('================================');
                    }}
                    className="w-full px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-md text-sm font-medium transition-colors"
                  >
                    Log to Console
                  </button>
                  <button
                    onClick={fetchDiagnosticData}
                    className="w-full px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-md text-sm font-medium transition-colors"
                  >
                    Refresh Data
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevModePanel;

