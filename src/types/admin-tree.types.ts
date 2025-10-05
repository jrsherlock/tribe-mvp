/**
 * Admin Tree Navigation - Type Definitions
 * Comprehensive type system for hierarchical tree navigation
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type NodeType = 'tenant' | 'group' | 'user' | 'section';
export type UserRole = 'SUPERUSER' | 'FACILITY_ADMIN' | 'GROUP_ADMIN' | 'MEMBER';
export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type GroupRole = 'ADMIN' | 'MEMBER';
export type SectionType = 'orphaned_tenants' | 'active_tenants' | 'solo_users' | 'unassigned_users';

// ============================================================================
// BASE TREE NODE
// ============================================================================

export interface BaseTreeNode {
  id: string;
  type: NodeType;
  label: string;
  isExpanded: boolean;
  isSelected: boolean;
  isVisible: boolean;
  level: number;
  parentId: string | null;
  children: TreeNode[];
  metadata?: Record<string, any>;
}

// ============================================================================
// TENANT NODE
// ============================================================================

export interface TenantNodeData {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  userCount: number;
  groupCount: number;
  isOrphaned: boolean;
  isDuplicate: boolean;
  duplicateSlug?: string;
}

export interface TenantNode extends BaseTreeNode {
  type: 'tenant';
  tenantData: TenantNodeData;
}

// ============================================================================
// GROUP NODE
// ============================================================================

export interface GroupNodeData {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  tenantName: string;
  created_at: string;
  memberCount: number;
  isEmpty: boolean;
}

export interface GroupNode extends BaseTreeNode {
  type: 'group';
  groupData: GroupNodeData;
}

// ============================================================================
// USER NODE
// ============================================================================

export interface UserGroupRole {
  groupId: string;
  groupName: string;
  role: GroupRole;
}

export interface UserNodeData {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  tenant_id: string | null;
  tenantName: string | null;
  tenantRole: TenantRole | null;
  groupRoles: UserGroupRole[];
  isSuperuser: boolean;
  isCurrentUser: boolean;
  created_at: string;
  checkinsToday: number;
  isUnassigned: boolean; // Not in any groups
  isSolo: boolean; // No tenant assignment
}

export interface UserNode extends BaseTreeNode {
  type: 'user';
  userData: UserNodeData;
}

// ============================================================================
// SECTION NODE
// ============================================================================

export interface SectionNodeData {
  sectionType: SectionType;
  title: string;
  icon: string;
  count: number;
  variant: 'warning' | 'info' | 'success' | 'error';
}

export interface SectionNode extends BaseTreeNode {
  type: 'section';
  sectionData: SectionNodeData;
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type TreeNode = TenantNode | GroupNode | UserNode | SectionNode;

// ============================================================================
// TREE STATE
// ============================================================================

export interface TreeState {
  nodes: Map<string, TreeNode>;
  rootNodeIds: string[];
  expandedNodeIds: Set<string>;
  selectedNodeIds: Set<string>;
  searchQuery: string;
  activeFilters: TreeFilter[];
  isSelectMultipleMode: boolean;
  currentUserRole: UserRole;
  currentUserId: string;
  currentTenantId: string | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// FILTERS
// ============================================================================

export interface TreeFilter {
  id: string;
  label: string;
  type: 'orphaned' | 'empty' | 'unassigned' | 'solo' | 'all';
  isActive: boolean;
}

// ============================================================================
// ACTIONS
// ============================================================================

export interface TreeAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'danger';
  requiresPermission: (node: TreeNode, userRole: UserRole, currentUserId: string) => boolean;
  isDisabled: (node: TreeNode) => boolean;
  onClick: (node: TreeNode) => void | Promise<void>;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon: string;
  variant: 'default' | 'danger';
  divider?: boolean;
  onClick: () => void;
}

export interface BulkAction {
  id: string;
  label: string;
  icon: string;
  requiresPermission: (nodes: TreeNode[], userRole: UserRole) => boolean;
  onClick: (nodes: TreeNode[]) => void | Promise<void>;
}

// ============================================================================
// RAW DATABASE TYPES
// ============================================================================

export interface RawTenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface RawGroup {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RawUser {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  tenant_id: string | null;
  created_at: string;
}

export interface RawTenantMember {
  user_id: string;
  tenant_id: string;
  role: TenantRole;
}

export interface RawGroupMembership {
  user_id: string;
  group_id: string;
  role: GroupRole;
}

export interface RawSuperuser {
  user_id: string;
}

export interface RawCheckin {
  user_id: string;
  checkin_date: string;
}

// ============================================================================
// TREE DATA RESPONSE
// ============================================================================

export interface TreeDataResponse {
  tenants: RawTenant[];
  groups: RawGroup[];
  users: RawUser[];
  tenantMembers: RawTenantMember[];
  groupMemberships: RawGroupMembership[];
  superusers: RawSuperuser[];
  checkinsToday: RawCheckin[];
}

// ============================================================================
// MODAL PROPS
// ============================================================================

export interface CreateGroupModalData {
  tenantId: string;
  tenantName: string;
}

export interface EditGroupModalData {
  groupId: string;
  groupName: string;
  description: string | null;
}

export interface AssignToGroupModalData {
  userIds: string[];
  tenantId: string;
  availableGroups: GroupNodeData[];
}

export interface EditUserModalData {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

// ============================================================================
// PERMISSIONS
// ============================================================================

export interface PermissionCheck {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
}

export function checkPermissions(
  node: TreeNode,
  userRole: UserRole,
  currentUserId: string
): PermissionCheck {
  // SuperUser has all permissions
  if (userRole === 'SUPERUSER') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManageMembers: true,
      canManageRoles: true
    };
  }

  // Facility Admin permissions
  if (userRole === 'FACILITY_ADMIN') {
    if (node.type === 'tenant') {
      return {
        canView: true,
        canEdit: true,
        canDelete: false, // Cannot delete own tenant
        canManageMembers: true,
        canManageRoles: true
      };
    }
    if (node.type === 'group' || node.type === 'user') {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageMembers: true,
        canManageRoles: true
      };
    }
  }

  // Group Admin permissions
  if (userRole === 'GROUP_ADMIN') {
    if (node.type === 'group') {
      return {
        canView: true,
        canEdit: true,
        canDelete: false, // Cannot delete group
        canManageMembers: true,
        canManageRoles: false // Cannot change roles
      };
    }
    if (node.type === 'user') {
      const isCurrentUser = node.userData.user_id === currentUserId;
      return {
        canView: true,
        canEdit: false,
        canDelete: !isCurrentUser, // Cannot remove self
        canManageMembers: false,
        canManageRoles: false
      };
    }
  }

  // Default: no permissions
  return {
    canView: false,
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
    canManageRoles: false
  };
}

