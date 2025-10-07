/**
 * Admin Tree Data Hook
 * Fetches and transforms hierarchical data based on user role
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  TreeDataResponse,
  UserRole,
  TreeNode,
  TenantNode,
  GroupNode,
  UserNode,
  SectionNode
} from '@/types/admin-tree.types';

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAdminTreeData(
  userRole: UserRole,
  userId: string,
  tenantId: string | null
) {
  const [data, setData] = useState<TreeDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        let result: TreeDataResponse | null = null;

        if (userRole === 'SUPERUSER') {
          result = await fetchSuperUserData();
        } else if (userRole === 'FACILITY_ADMIN' && tenantId) {
          result = await fetchFacilityAdminData(tenantId);
        } else if (userRole === 'GROUP_ADMIN') {
          result = await fetchGroupAdminData(userId);
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch tree data'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [userRole, userId, tenantId, refetchTrigger]);

  // Build tree structure from flat data
  // Memoize to prevent creating new array on every render (which causes infinite loops)
  const treeNodes = useMemo(() => {
    return data ? buildTreeStructure(data, userRole, userId) : [];
  }, [data, userRole, userId]);

  return {
    treeNodes,
    rawData: data,
    isLoading,
    error,
    refetch: () => {
      // Trigger re-fetch by incrementing the refetch trigger
      setRefetchTrigger(prev => prev + 1);
    }
  };
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchSuperUserData(): Promise<TreeDataResponse> {
  const today = new Date().toISOString().split('T')[0];

  const [
    { data: tenants },
    { data: groups },
    { data: users },
    { data: tenantMembers },
    { data: groupMemberships },
    { data: superusers },
    { data: checkinsToday }
  ] = await Promise.all([
    supabase.from('tenants').select('*').order('created_at', { ascending: false }),
    supabase.from('groups').select('*').order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('tenant_members').select('*'),
    supabase.from('group_memberships').select('*'),
    supabase.from('superusers').select('user_id'),
    supabase.from('daily_checkins').select('user_id').eq('checkin_date', today)
  ]);

  return {
    tenants: tenants || [],
    groups: groups || [],
    users: users || [],
    tenantMembers: tenantMembers || [],
    groupMemberships: groupMemberships || [],
    superusers: superusers || [],
    checkinsToday: checkinsToday || []
  };
}

async function fetchFacilityAdminData(tenantId: string): Promise<TreeDataResponse> {
  const today = new Date().toISOString().split('T')[0];

  const [
    { data: tenant },
    { data: groups },
    { data: tenantMembers },
    { data: users },
    { data: groupMemberships },
    { data: superusers },
    { data: checkinsToday }
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    supabase.from('groups').select('*').eq('tenant_id', tenantId),
    supabase.from('tenant_members').select('*').eq('tenant_id', tenantId),
    supabase.from('user_profiles').select('*').eq('tenant_id', tenantId),
    supabase.from('group_memberships').select('*, groups!inner(tenant_id)').eq('groups.tenant_id', tenantId),
    supabase.from('superusers').select('user_id'),
    supabase.from('daily_checkins').select('user_id').eq('checkin_date', today).eq('tenant_id', tenantId)
  ]);

  return {
    tenants: tenant ? [tenant] : [],
    groups: groups || [],
    users: users || [],
    tenantMembers: tenantMembers || [],
    groupMemberships: groupMemberships || [],
    superusers: superusers || [],
    checkinsToday: checkinsToday || []
  };
}

async function fetchGroupAdminData(userId: string): Promise<TreeDataResponse> {
  const today = new Date().toISOString().split('T')[0];

  // Get groups where user is admin
  const { data: adminGroups } = await supabase
    .from('group_memberships')
    .select('group_id, groups(*)')
    .eq('user_id', userId)
    .eq('role', 'ADMIN');

  if (!adminGroups || adminGroups.length === 0) {
    return {
      tenants: [],
      groups: [],
      users: [],
      tenantMembers: [],
      groupMemberships: [],
      superusers: [],
      checkinsToday: []
    };
  }

  const groupIds = adminGroups.map(ag => ag.group_id);
  const groups = adminGroups.map(ag => ag.groups).filter(Boolean);

  // Get all members in these groups
  const { data: groupMemberships } = await supabase
    .from('group_memberships')
    .select('*, user_profiles(*)')
    .in('group_id', groupIds);

  const userIds = groupMemberships?.map(gm => gm.user_id) || [];
  const users = groupMemberships?.map(gm => gm.user_profiles).filter(Boolean) || [];

  const { data: checkinsToday } = await supabase
    .from('daily_checkins')
    .select('user_id')
    .eq('checkin_date', today)
    .in('user_id', userIds);

  return {
    tenants: [],
    groups: groups as any,
    users: users as any,
    tenantMembers: [],
    groupMemberships: groupMemberships || [],
    superusers: [],
    checkinsToday: checkinsToday || []
  };
}

// ============================================================================
// TREE BUILDING FUNCTION
// ============================================================================

function buildTreeStructure(
  data: TreeDataResponse,
  userRole: UserRole,
  currentUserId: string
): TreeNode[] {
  const { tenants, groups, users, tenantMembers, groupMemberships, superusers, checkinsToday } = data;

  // Build lookup maps
  const superuserIds = new Set(superusers.map(su => su.user_id));
  const checkinUserIds = new Set(checkinsToday.map(c => c.user_id));
  
  const tenantMemberMap = new Map<string, typeof tenantMembers[0][]>();
  tenantMembers.forEach(tm => {
    if (!tenantMemberMap.has(tm.tenant_id)) {
      tenantMemberMap.set(tm.tenant_id, []);
    }
    tenantMemberMap.get(tm.tenant_id)!.push(tm);
  });

  const groupMemberMap = new Map<string, typeof groupMemberships[0][]>();
  groupMemberships.forEach(gm => {
    if (!groupMemberMap.has(gm.group_id)) {
      groupMemberMap.set(gm.group_id, []);
    }
    groupMemberMap.get(gm.group_id)!.push(gm);
  });

  const userGroupsMap = new Map<string, typeof groupMemberships[0][]>();
  groupMemberships.forEach(gm => {
    if (!userGroupsMap.has(gm.user_id)) {
      userGroupsMap.set(gm.user_id, []);
    }
    userGroupsMap.get(gm.user_id)!.push(gm);
  });

  const groupMap = new Map(groups.map(g => [g.id, g]));
  const tenantMap = new Map(tenants.map(t => [t.id, t]));

  // Build tree based on role
  if (userRole === 'SUPERUSER') {
    return buildSuperUserTree(
      tenants,
      groups,
      users,
      tenantMemberMap,
      groupMemberMap,
      userGroupsMap,
      superuserIds,
      checkinUserIds,
      currentUserId,
      groupMap,
      tenantMap
    );
  } else if (userRole === 'FACILITY_ADMIN') {
    return buildFacilityAdminTree(
      tenants,
      groups,
      users,
      tenantMemberMap,
      groupMemberMap,
      userGroupsMap,
      superuserIds,
      checkinUserIds,
      currentUserId,
      groupMap,
      tenantMap
    );
  } else if (userRole === 'GROUP_ADMIN') {
    return buildGroupAdminTree(
      groups,
      users,
      groupMemberMap,
      userGroupsMap,
      checkinUserIds,
      currentUserId,
      groupMap
    );
  }

  return [];
}

// ============================================================================
// TREE BUILDERS - FULL IMPLEMENTATION
// ============================================================================

function buildSuperUserTree(
  tenants: any[],
  groups: any[],
  users: any[],
  tenantMemberMap: Map<string, any[]>,
  groupMemberMap: Map<string, any[]>,
  userGroupsMap: Map<string, any[]>,
  superuserIds: Set<string>,
  checkinUserIds: Set<string>,
  currentUserId: string,
  groupMap: Map<string, any>,
  tenantMap: Map<string, any>
): TreeNode[] {
  const rootNodes: TreeNode[] = [];

  // Separate tenants into active and orphaned
  const activeTenants = tenants.filter(t => {
    const members = tenantMemberMap.get(t.id) || [];
    return members.length > 0;
  });

  const orphanedTenants = tenants.filter(t => {
    const members = tenantMemberMap.get(t.id) || [];
    return members.length === 0;
  });

  // Find solo users (no tenant assignment)
  const soloUsers = users.filter(u => !u.tenant_id);

  // Find unassigned users (in tenant but no groups)
  const unassignedUsers = users.filter(u => {
    if (!u.tenant_id) return false;
    const userGroups = userGroupsMap.get(u.user_id) || [];
    return userGroups.length === 0;
  });

  // 1. ORPHANED TENANTS SECTION (if any)
  if (orphanedTenants.length > 0) {
    const orphanedSection: SectionNode = {
      id: 'section-orphaned-tenants',
      type: 'section',
      label: '⚠️ Orphaned Tenants',
      isExpanded: true,
      isSelected: false,
      isVisible: true,
      level: 0,
      parentId: null,
      children: orphanedTenants.map(tenant => buildTenantNode(
        tenant,
        groups,
        users,
        tenantMemberMap,
        groupMemberMap,
        userGroupsMap,
        superuserIds,
        checkinUserIds,
        currentUserId,
        groupMap,
        1
      )),
      sectionData: {
        sectionType: 'orphaned_tenants',
        title: 'Orphaned Tenants',
        icon: '⚠️',
        count: orphanedTenants.length,
        variant: 'warning'
      }
    };
    rootNodes.push(orphanedSection);
  }

  // 2. ACTIVE TENANTS SECTION
  if (activeTenants.length > 0) {
    const activeSection: SectionNode = {
      id: 'section-active-tenants',
      type: 'section',
      label: `🏢 Active Tenants (${activeTenants.length})`,
      isExpanded: true,
      isSelected: false,
      isVisible: true,
      level: 0,
      parentId: null,
      children: activeTenants.map(tenant => buildTenantNode(
        tenant,
        groups,
        users,
        tenantMemberMap,
        groupMemberMap,
        userGroupsMap,
        superuserIds,
        checkinUserIds,
        currentUserId,
        groupMap,
        1
      )),
      sectionData: {
        sectionType: 'active_tenants',
        title: 'Active Tenants',
        icon: '🏢',
        count: activeTenants.length,
        variant: 'success'
      }
    };
    rootNodes.push(activeSection);
  }

  // 3. UNASSIGNED USERS SECTION (if any)
  if (unassignedUsers.length > 0) {
    const unassignedSection: SectionNode = {
      id: 'section-unassigned-users',
      type: 'section',
      label: `⚠️ Unassigned Users (${unassignedUsers.length})`,
      isExpanded: false,
      isSelected: false,
      isVisible: true,
      level: 0,
      parentId: null,
      children: unassignedUsers.map(user => buildUserNode(
        user,
        userGroupsMap,
        superuserIds,
        checkinUserIds,
        currentUserId,
        groupMap,
        tenantMap,
        1
      )),
      sectionData: {
        sectionType: 'unassigned_users',
        title: 'Unassigned Users',
        icon: '⚠️',
        count: unassignedUsers.length,
        variant: 'warning'
      }
    };
    rootNodes.push(unassignedSection);
  }

  // 4. SOLO USERS SECTION (if any)
  if (soloUsers.length > 0) {
    const soloSection: SectionNode = {
      id: 'section-solo-users',
      type: 'section',
      label: `🚶 Solo Users (${soloUsers.length})`,
      isExpanded: false,
      isSelected: false,
      isVisible: true,
      level: 0,
      parentId: null,
      children: soloUsers.map(user => buildUserNode(
        user,
        userGroupsMap,
        superuserIds,
        checkinUserIds,
        currentUserId,
        groupMap,
        tenantMap,
        1
      )),
      sectionData: {
        sectionType: 'solo_users',
        title: 'Solo Users',
        icon: '🚶',
        count: soloUsers.length,
        variant: 'info'
      }
    };
    rootNodes.push(soloSection);
  }

  return rootNodes;
}

function buildFacilityAdminTree(
  tenants: any[],
  groups: any[],
  users: any[],
  tenantMemberMap: Map<string, any[]>,
  groupMemberMap: Map<string, any[]>,
  userGroupsMap: Map<string, any[]>,
  superuserIds: Set<string>,
  checkinUserIds: Set<string>,
  currentUserId: string,
  groupMap: Map<string, any>,
  tenantMap: Map<string, any>
): TreeNode[] {
  // Facility admin sees only their tenant(s) - no sections
  return tenants.map(tenant => buildTenantNode(
    tenant,
    groups,
    users,
    tenantMemberMap,
    groupMemberMap,
    userGroupsMap,
    superuserIds,
    checkinUserIds,
    currentUserId,
    groupMap,
    0
  ));
}

function buildGroupAdminTree(
  groups: any[],
  users: any[],
  groupMemberMap: Map<string, any[]>,
  userGroupsMap: Map<string, any[]>,
  checkinUserIds: Set<string>,
  currentUserId: string,
  groupMap: Map<string, any>
): TreeNode[] {
  // Group admin sees only their group(s) - no tenant level
  return groups.map(group => buildGroupNode(
    group,
    users,
    groupMemberMap,
    userGroupsMap,
    new Set(), // No superuser info needed
    checkinUserIds,
    currentUserId,
    groupMap,
    new Map(), // No tenant map needed
    0
  ));
}

// ============================================================================
// NODE BUILDERS
// ============================================================================

function buildTenantNode(
  tenant: any,
  groups: any[],
  users: any[],
  tenantMemberMap: Map<string, any[]>,
  groupMemberMap: Map<string, any[]>,
  userGroupsMap: Map<string, any[]>,
  superuserIds: Set<string>,
  checkinUserIds: Set<string>,
  currentUserId: string,
  groupMap: Map<string, any>,
  level: number
): TenantNode {
  const tenantGroups = groups.filter(g => g.tenant_id === tenant.id);
  const tenantMembers = tenantMemberMap.get(tenant.id) || [];
  const tenantUsers = users.filter(u => u.tenant_id === tenant.id);

  // Check for duplicate tenant names
  const allTenants = Array.from(tenantMemberMap.keys());
  const duplicates = allTenants.filter(id => id !== tenant.id);
  const isDuplicate = duplicates.some(id => {
    const otherTenant = tenantMemberMap.get(id);
    return otherTenant && otherTenant[0]?.name === tenant.name;
  });

  // Build child nodes (groups + unassigned users)
  const groupNodes = tenantGroups.map(group => buildGroupNode(
    group,
    tenantUsers,
    groupMemberMap,
    userGroupsMap,
    superuserIds,
    checkinUserIds,
    currentUserId,
    groupMap,
    new Map([[tenant.id, tenant]]),
    level + 1
  ));

  // Find users in this tenant but not in any groups
  const unassignedUsers = tenantUsers.filter(user => {
    const userGroups = userGroupsMap.get(user.user_id) || [];
    return userGroups.length === 0;
  });

  let children: TreeNode[] = [...groupNodes];

  // Add "Unassigned Users" sub-section if any exist
  if (unassignedUsers.length > 0) {
    const unassignedSection: SectionNode = {
      id: `section-unassigned-${tenant.id}`,
      type: 'section',
      label: `⚠️ Unassigned Users (${unassignedUsers.length})`,
      isExpanded: false,
      isSelected: false,
      isVisible: true,
      level: level + 1,
      parentId: tenant.id,
      children: unassignedUsers.map(user => buildUserNode(
        user,
        userGroupsMap,
        superuserIds,
        checkinUserIds,
        currentUserId,
        groupMap,
        new Map([[tenant.id, tenant]]),
        level + 2
      )),
      sectionData: {
        sectionType: 'unassigned_users',
        title: 'Unassigned Users',
        icon: '⚠️',
        count: unassignedUsers.length,
        variant: 'warning'
      }
    };
    children.push(unassignedSection);
  }

  return {
    id: tenant.id,
    type: 'tenant',
    label: tenant.name,
    isExpanded: false,
    isSelected: false,
    isVisible: true,
    level,
    parentId: null,
    children,
    tenantData: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      created_at: tenant.created_at,
      userCount: tenantUsers.length,
      groupCount: tenantGroups.length,
      isOrphaned: tenantMembers.length === 0,
      isDuplicate,
      duplicateSlug: isDuplicate ? tenant.slug : undefined
    }
  };
}

function buildGroupNode(
  group: any,
  users: any[],
  groupMemberMap: Map<string, any[]>,
  userGroupsMap: Map<string, any[]>,
  superuserIds: Set<string>,
  checkinUserIds: Set<string>,
  currentUserId: string,
  groupMap: Map<string, any>,
  tenantMap: Map<string, any>,
  level: number
): GroupNode {
  const groupMembers = groupMemberMap.get(group.id) || [];
  const memberUserIds = groupMembers.map(gm => gm.user_id);
  const memberUsers = users.filter(u => memberUserIds.includes(u.user_id));

  const tenant = tenantMap.get(group.tenant_id);

  const children = memberUsers.map(user => buildUserNode(
    user,
    userGroupsMap,
    superuserIds,
    checkinUserIds,
    currentUserId,
    groupMap,
    tenantMap,
    level + 1
  ));

  return {
    id: group.id,
    type: 'group',
    label: group.name,
    isExpanded: false,
    isSelected: false,
    isVisible: true,
    level,
    parentId: group.tenant_id,
    children,
    groupData: {
      id: group.id,
      name: group.name,
      description: group.description,
      tenant_id: group.tenant_id,
      tenantName: tenant?.name || 'Unknown Tenant',
      created_at: group.created_at,
      memberCount: memberUsers.length,
      isEmpty: memberUsers.length === 0
    }
  };
}

function buildUserNode(
  user: any,
  userGroupsMap: Map<string, any[]>,
  superuserIds: Set<string>,
  checkinUserIds: Set<string>,
  currentUserId: string,
  groupMap: Map<string, any>,
  tenantMap: Map<string, any>,
  level: number
): UserNode {
  const userGroups = userGroupsMap.get(user.user_id) || [];
  const groupRoles = userGroups.map(ug => {
    const group = groupMap.get(ug.group_id);
    return {
      groupId: ug.group_id,
      groupName: group?.name || 'Unknown Group',
      role: ug.role
    };
  });

  const tenant = user.tenant_id ? tenantMap.get(user.tenant_id) : null;
  const isSuperuser = superuserIds.has(user.user_id);
  const hasCheckedInToday = checkinUserIds.has(user.user_id);

  return {
    id: `user-${user.user_id}`,
    type: 'user',
    label: user.display_name || user.email,
    isExpanded: false,
    isSelected: false,
    isVisible: true,
    level,
    parentId: null,
    children: [],
    userData: {
      id: `user-${user.user_id}`,
      user_id: user.user_id,
      display_name: user.display_name || user.email,
      email: user.email,
      avatar_url: user.avatar_url,
      tenant_id: user.tenant_id,
      tenantName: tenant?.name || null,
      tenantRole: null, // Will be populated from tenant_members if needed
      groupRoles,
      isSuperuser,
      isCurrentUser: user.user_id === currentUserId,
      created_at: user.created_at,
      checkinsToday: hasCheckedInToday ? 1 : 0,
      isUnassigned: user.tenant_id !== null && userGroups.length === 0,
      isSolo: user.tenant_id === null
    }
  };
}

