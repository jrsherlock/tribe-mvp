/**
 * Admin Tree View - Main Container Component
 * Hierarchical navigation for multi-tenant administration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminTreeData } from '@/hooks/useAdminTreeData';
import { Building2, Users, User, AlertTriangle, Search, ChevronDown, ChevronRight, Plus, Edit, Trash2, UserPlus, MoreVertical } from 'lucide-react';
import type { TreeNode, UserRole } from '@/types/admin-tree.types';
import {
  SuperUserBadge,
  FacilityAdminBadge,
  GroupAdminBadge,
  CountBadge,
  EmptyBadge,
  CurrentUserBadge
} from './TreeBadge';
import { CreateFacilityModal } from './CreateFacilityModal';
import { CreateGroupModal } from './CreateGroupModal';
import { EditEntityModal, type EditEntityData, type EntityType } from './EditEntityModal';
import { DeleteConfirmationDialog, type DeleteConfirmationProps } from './DeleteConfirmationDialog';
import { AssignToGroupModal } from './AssignToGroupModal';
import { InviteUserModal } from './InviteUserModal';
import { deleteTenant } from '@/lib/services/tenants';
import { deleteGroup } from '@/lib/services/groups';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Helper functions
function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const traverse = (node: TreeNode) => {
    ids.push(node.id);
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  nodes.forEach(traverse);
  return ids;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const flat: TreeNode[] = [];
  const traverse = (node: TreeNode) => {
    flat.push(node);
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  nodes.forEach(traverse);
  return flat;
}

export function AdminTreeView() {
  const { user } = useAuth();
  const { role, isSuperUser, isFacilityAdmin, isGroupAdmin } = useUserRole(user?.tenant_id || null);
  
  // Determine user role for tree
  const userRole: UserRole = isSuperUser 
    ? 'SUPERUSER' 
    : isFacilityAdmin 
    ? 'FACILITY_ADMIN' 
    : isGroupAdmin 
    ? 'GROUP_ADMIN' 
    : 'MEMBER';

  // Fetch tree data
  const { treeNodes, isLoading, error, refetch } = useAdminTreeData(
    userRole,
    user?.userId || '',
    user?.tenant_id || null
  );

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Load expanded state from localStorage
    const saved = localStorage.getItem('admin-tree-expanded-nodes');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [filteredNodes, setFilteredNodes] = useState<TreeNode[]>([]);

  // Modal state
  const [showCreateFacility, setShowCreateFacility] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditEntity, setShowEditEntity] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignToGroup, setShowAssignToGroup] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);

  // Modal data
  const [createGroupData, setCreateGroupData] = useState<{ tenantId: string; tenantName: string } | null>(null);
  const [editEntityData, setEditEntityData] = useState<{ type: EntityType; data: EditEntityData } | null>(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState<Omit<DeleteConfirmationProps, 'onConfirm' | 'onCancel'> | null>(null);
  const [assignToGroupData, setAssignToGroupData] = useState<{ userId: string; userName: string; tenantId: string; currentGroupIds: string[] } | null>(null);
  const [inviteUserData, setInviteUserData] = useState<{ tenantId: string; tenantName: string } | null>(null);

  // Save expanded state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('admin-tree-expanded-nodes', JSON.stringify(Array.from(expandedNodes)));
  }, [expandedNodes]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNode) return;

      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          // Navigate to next node
          const flatNodes = flattenTree(filteredNodes);
          const currentIndex = flatNodes.findIndex(n => n.id === selectedNode.id);
          if (currentIndex < flatNodes.length - 1) {
            setSelectedNode(flatNodes[currentIndex + 1]);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          // Navigate to previous node
          const flatNodesUp = flattenTree(filteredNodes);
          const currentIndexUp = flatNodesUp.findIndex(n => n.id === selectedNode.id);
          if (currentIndexUp > 0) {
            setSelectedNode(flatNodesUp[currentIndexUp - 1]);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          // Expand node if it has children
          if (selectedNode.children && selectedNode.children.length > 0) {
            setExpandedNodes(prev => new Set([...prev, selectedNode.id]));
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          // Collapse node if expanded
          if (expandedNodes.has(selectedNode.id)) {
            setExpandedNodes(prev => {
              const next = new Set(prev);
              next.delete(selectedNode.id);
              return next;
            });
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          // Toggle expand/collapse
          toggleExpand(selectedNode.id);
          break;

        case 'Escape':
          e.preventDefault();
          // Clear selection
          setSelectedNode(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, filteredNodes, expandedNodes]);

  // Search and filter logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNodes(treeNodes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matchingNodes: TreeNode[] = [];
    const nodesToExpand = new Set<string>();

    const searchNode = (node: TreeNode, parentMatches: boolean = false): boolean => {
      const labelMatches = node.label.toLowerCase().includes(query);

      // Check metadata for additional matches
      let metadataMatches = false;
      if (node.type === 'tenant') {
        metadataMatches = node.tenantData.slug.toLowerCase().includes(query);
      } else if (node.type === 'user') {
        metadataMatches = node.userData.email.toLowerCase().includes(query);
      }

      const nodeMatches = labelMatches || metadataMatches;

      // Recursively search children
      let childMatches = false;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (searchNode(child, nodeMatches || parentMatches)) {
            childMatches = true;
            nodesToExpand.add(node.id); // Expand parent if child matches
          }
        }
      }

      const shouldInclude = nodeMatches || childMatches || parentMatches;

      if (shouldInclude && !matchingNodes.find(n => n.id === node.id)) {
        matchingNodes.push(node);
      }

      return shouldInclude;
    };

    treeNodes.forEach(node => searchNode(node));
    setFilteredNodes(matchingNodes);

    // Auto-expand nodes that have matching children
    setExpandedNodes(prev => new Set([...prev, ...nodesToExpand]));
  }, [searchQuery, treeNodes]);

  // Handle expand/collapse
  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allNodeIds = getAllNodeIds(treeNodes);
    setExpandedNodes(new Set(allNodeIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Action handlers
  const handleCreateFacility = () => {
    setShowCreateFacility(true);
  };

  const handleCreateGroup = (tenantId: string, tenantName: string) => {
    setCreateGroupData({ tenantId, tenantName });
    setShowCreateGroup(true);
  };

  const handleEditEntity = (type: EntityType, data: EditEntityData) => {
    setEditEntityData({ type, data });
    setShowEditEntity(true);
  };

  const handleDeleteEntity = async (node: TreeNode) => {
    if (node.type === 'tenant') {
      setDeleteConfirmData({
        title: 'Delete Facility',
        message: 'Are you sure you want to delete this facility? This action cannot be undone.',
        entityName: node.tenantData.name,
        entityType: 'facility',
        warningMessage: 'All groups, memberships, and data associated with this facility will be permanently deleted.',
        confirmText: 'Delete Facility'
      });
      setShowDeleteConfirm(true);
    } else if (node.type === 'group') {
      setDeleteConfirmData({
        title: 'Delete Group',
        message: 'Are you sure you want to delete this group? This action cannot be undone.',
        entityName: node.groupData.name,
        entityType: 'group',
        warningMessage: 'All memberships in this group will be removed.',
        confirmText: 'Delete Group'
      });
      setShowDeleteConfirm(true);
    } else if (node.type === 'user') {
      setDeleteConfirmData({
        title: 'Remove User',
        message: 'Are you sure you want to remove this user from the facility?',
        entityName: node.userData.display_name,
        entityType: 'membership',
        warningMessage: 'The user will be removed from all groups in this facility.',
        confirmText: 'Remove User'
      });
      setShowDeleteConfirm(true);
    }
  };

  const handleAssignToGroup = (userId: string, userName: string, tenantId: string, currentGroupIds: string[]) => {
    setAssignToGroupData({ userId, userName, tenantId, currentGroupIds });
    setShowAssignToGroup(true);
  };

  const handleInviteUser = (tenantId: string, tenantName: string) => {
    setInviteUserData({ tenantId, tenantName });
    setShowInviteUser(true);
  };

  const executeDelete = async () => {
    if (!selectedNode || !deleteConfirmData) return;

    try {
      if (selectedNode.type === 'tenant') {
        const { error } = await deleteTenant(selectedNode.tenantData.id);
        if (error) throw error;
        toast.success('Facility deleted successfully');
      } else if (selectedNode.type === 'group') {
        const { error } = await deleteGroup(selectedNode.groupData.id);
        if (error) throw error;
        toast.success('Group deleted successfully');
      } else if (selectedNode.type === 'user') {
        // Remove user from tenant
        const { error } = await supabase
          .from('tenant_members')
          .delete()
          .eq('user_id', selectedNode.userData.user_id)
          .eq('tenant_id', selectedNode.userData.tenant_id);
        if (error) throw error;
        toast.success('User removed successfully');
      }

      refetch();
      setSelectedNode(null);
      setShowDeleteConfirm(false);
      setDeleteConfirmData(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete');
      throw error;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin tree...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Error loading admin tree</p>
          <p className="text-gray-600 mb-4">{error.message}</p>
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

  // No permission
  if (userRole === 'MEMBER') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold mb-2">Access Denied</p>
          <p className="text-gray-600">You don't have permission to access the admin tree.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Tree Navigation */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Tree</h1>
          <p className="text-sm text-gray-600">
            {userRole === 'SUPERUSER' && 'SuperUser - Full Access'}
            {userRole === 'FACILITY_ADMIN' && 'Facility Admin'}
            {userRole === 'GROUP_ADMIN' && 'Group Admin'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants, groups, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Collapse All
            </button>
          </div>

          {/* Action Buttons */}
          {isSuperUser && (
            <button
              onClick={handleCreateFacility}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Facility
            </button>
          )}
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? `No results for "${searchQuery}"` : 'No data available'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNodes.map(node => (
                <TreeNodeComponent
                  key={node.id}
                  node={node}
                  level={0}
                  isExpanded={expandedNodes.has(node.id)}
                  isSelected={selectedNode?.id === node.id}
                  onToggleExpand={() => toggleExpand(node.id)}
                  onSelect={() => setSelectedNode(node)}
                  expandedNodes={expandedNodes}
                  onToggleChild={toggleExpand}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Details */}
      <div className="flex-1 p-8 overflow-y-auto">
        {selectedNode ? (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                {selectedNode.type === 'tenant' && <Building2 className="w-8 h-8 text-blue-600" />}
                {selectedNode.type === 'group' && <Users className="w-8 h-8 text-green-600" />}
                {selectedNode.type === 'user' && <User className="w-8 h-8 text-purple-600" />}
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedNode.label}
                </h2>
              </div>

              <div className="flex gap-2 mb-4">
                {selectedNode.type === 'user' && selectedNode.userData.isSuperuser && <SuperUserBadge />}
                {selectedNode.type === 'user' && selectedNode.userData.isCurrentUser && <CurrentUserBadge />}
                {selectedNode.type === 'tenant' && selectedNode.tenantData.isOrphaned && <EmptyBadge label="Orphaned" />}
                {selectedNode.type === 'group' && selectedNode.groupData.isEmpty && <EmptyBadge label="Empty Group" />}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-6">
                {/* Tenant Actions */}
                {selectedNode.type === 'tenant' && (
                  <>
                    {(isSuperUser || isFacilityAdmin) && (
                      <button
                        onClick={() => handleCreateGroup(selectedNode.tenantData.id, selectedNode.tenantData.name)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Create Group
                      </button>
                    )}
                    {(isSuperUser || isFacilityAdmin) && (
                      <button
                        onClick={() => handleInviteUser(selectedNode.tenantData.id, selectedNode.tenantData.name)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite User
                      </button>
                    )}
                    {isSuperUser && (
                      <button
                        onClick={() => handleEditEntity('facility', {
                          id: selectedNode.tenantData.id,
                          name: selectedNode.tenantData.name,
                          slug: selectedNode.tenantData.slug
                        })}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {isSuperUser && (
                      <button
                        onClick={() => handleDeleteEntity(selectedNode)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </>
                )}

                {/* Group Actions */}
                {selectedNode.type === 'group' && (
                  <>
                    {(isSuperUser || isFacilityAdmin) && (
                      <button
                        onClick={() => handleEditEntity('group', {
                          id: selectedNode.groupData.id,
                          name: selectedNode.groupData.name,
                          description: selectedNode.groupData.description
                        })}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {(isSuperUser || isFacilityAdmin) && (
                      <button
                        onClick={() => handleDeleteEntity(selectedNode)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </>
                )}

                {/* User Actions */}
                {selectedNode.type === 'user' && (
                  <>
                    {(isSuperUser || isFacilityAdmin) && selectedNode.userData.tenant_id && (
                      <button
                        onClick={() => handleAssignToGroup(
                          selectedNode.userData.user_id,
                          selectedNode.userData.display_name,
                          selectedNode.userData.tenant_id!,
                          selectedNode.userData.groupRoles.map(g => g.groupId)
                        )}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign to Groups
                      </button>
                    )}
                    {(isSuperUser || isFacilityAdmin) && (
                      <button
                        onClick={() => handleEditEntity('user', {
                          id: selectedNode.userData.id,
                          display_name: selectedNode.userData.display_name,
                          email: selectedNode.userData.email
                        })}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {(isSuperUser || isFacilityAdmin) && !selectedNode.userData.isCurrentUser && (
                      <button
                        onClick={() => handleDeleteEntity(selectedNode)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Node-specific details */}
            {selectedNode.type === 'tenant' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Tenant Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Slug:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedNode.tenantData.slug}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Users:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedNode.tenantData.userCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Groups:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedNode.tenantData.groupCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Created:</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {new Date(selectedNode.tenantData.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {selectedNode.type === 'group' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Group Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Tenant:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedNode.groupData.tenantName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Members:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedNode.groupData.memberCount}</dd>
                    </div>
                    {selectedNode.groupData.description && (
                      <div>
                        <dt className="text-sm text-gray-600 mb-1">Description:</dt>
                        <dd className="text-sm text-gray-900">{selectedNode.groupData.description}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Created:</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {new Date(selectedNode.groupData.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {selectedNode.type === 'user' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">User Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Email:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedNode.userData.email}</dd>
                    </div>
                    {selectedNode.userData.tenantName && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Tenant:</dt>
                        <dd className="text-sm font-medium text-gray-900">{selectedNode.userData.tenantName}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Groups:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedNode.userData.groupRoles.length}</dd>
                    </div>
                    {selectedNode.userData.groupRoles.length > 0 && (
                      <div>
                        <dt className="text-sm text-gray-600 mb-1">Group Memberships:</dt>
                        <dd className="space-y-1">
                          {selectedNode.userData.groupRoles.map(gr => (
                            <div key={gr.groupId} className="text-sm text-gray-900 flex items-center gap-2">
                              <span>{gr.groupName}</span>
                              {gr.role === 'ADMIN' && <GroupAdminBadge />}
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* Debug info (collapsible) */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                Show raw data (debug)
              </summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(selectedNode, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a node to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateFacility && (
        <CreateFacilityModal
          onClose={() => setShowCreateFacility(false)}
          onSuccess={() => {
            refetch();
            setShowCreateFacility(false);
          }}
        />
      )}

      {showCreateGroup && createGroupData && (
        <CreateGroupModal
          tenantId={createGroupData.tenantId}
          tenantName={createGroupData.tenantName}
          onClose={() => {
            setShowCreateGroup(false);
            setCreateGroupData(null);
          }}
          onSuccess={() => {
            refetch();
            setShowCreateGroup(false);
            setCreateGroupData(null);
          }}
        />
      )}

      {showEditEntity && editEntityData && (
        <EditEntityModal
          entityType={editEntityData.type}
          data={editEntityData.data}
          onClose={() => {
            setShowEditEntity(false);
            setEditEntityData(null);
          }}
          onSuccess={() => {
            refetch();
            setShowEditEntity(false);
            setEditEntityData(null);
          }}
        />
      )}

      {showDeleteConfirm && deleteConfirmData && (
        <DeleteConfirmationDialog
          {...deleteConfirmData}
          onConfirm={executeDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmData(null);
          }}
        />
      )}

      {showAssignToGroup && assignToGroupData && (
        <AssignToGroupModal
          userId={assignToGroupData.userId}
          userName={assignToGroupData.userName}
          tenantId={assignToGroupData.tenantId}
          currentGroupIds={assignToGroupData.currentGroupIds}
          onClose={() => {
            setShowAssignToGroup(false);
            setAssignToGroupData(null);
          }}
          onSuccess={() => {
            refetch();
            setShowAssignToGroup(false);
            setAssignToGroupData(null);
          }}
        />
      )}

      {showInviteUser && inviteUserData && (
        <InviteUserModal
          tenantId={inviteUserData.tenantId}
          tenantName={inviteUserData.tenantName}
          onClose={() => {
            setShowInviteUser(false);
            setInviteUserData(null);
          }}
          onSuccess={() => {
            refetch();
            setShowInviteUser(false);
            setInviteUserData(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  expandedNodes: Set<string>;
  onToggleChild: (nodeId: string) => void;
  searchQuery?: string;
}

function TreeNodeComponent({
  node,
  level,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  expandedNodes,
  onToggleChild,
  searchQuery = ''
}: TreeNodeComponentProps) {
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 24;

  const getIcon = () => {
    if (node.type === 'tenant') return <Building2 className="w-4 h-4" />;
    if (node.type === 'group') return <Users className="w-4 h-4" />;
    if (node.type === 'user') return <User className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          ${isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'}
        `}
        style={{ paddingLeft: `${indent + 12}px` }}
        onClick={onSelect}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        <div className="text-gray-600">{getIcon()}</div>

        <span className="flex-1 text-sm font-medium text-gray-900">
          {highlightText(node.label, searchQuery)}
        </span>

        {/* Badges and indicators */}
        <div className="flex items-center gap-1">
          {node.type === 'tenant' && (
            <>
              {node.tenantData.isOrphaned && <EmptyBadge label="0 users" />}
              {!node.tenantData.isOrphaned && (
                <CountBadge count={node.tenantData.userCount} label="users" />
              )}
            </>
          )}

          {node.type === 'group' && (
            <>
              {node.groupData.isEmpty && <EmptyBadge label="0 members" />}
              {!node.groupData.isEmpty && (
                <CountBadge count={node.groupData.memberCount} />
              )}
            </>
          )}

          {node.type === 'user' && (
            <>
              {node.userData.isSuperuser && <SuperUserBadge />}
              {node.userData.isCurrentUser && <CurrentUserBadge />}
              {node.userData.groupRoles.some(gr => gr.role === 'ADMIN') && <GroupAdminBadge />}
            </>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              isExpanded={expandedNodes.has(child.id)}
              isSelected={false}
              onToggleExpand={() => onToggleChild(child.id)}
              onSelect={() => {}}
              expandedNodes={expandedNodes}
              onToggleChild={onToggleChild}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

