/**
 * Admin Tree View - Main Container Component
 * Hierarchical navigation for multi-tenant administration
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminTreeData } from '@/hooks/useAdminTreeData';
import { Building2, Users, User, AlertTriangle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { TreeNode, UserRole } from '@/types/admin-tree.types';
import {
  SuperUserBadge,
  FacilityAdminBadge,
  GroupAdminBadge,
  CountBadge,
  EmptyBadge,
  CurrentUserBadge
} from './TreeBadge';

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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

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
        <div className="p-4 border-b border-gray-200 flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Collapse All
          </button>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto p-4">
          {treeNodes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No data available</p>
            </div>
          ) : (
            <div className="space-y-1">
              {treeNodes.map(node => (
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
}

function TreeNodeComponent({
  node,
  level,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  expandedNodes,
  onToggleChild
}: TreeNodeComponentProps) {
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 24;

  const getIcon = () => {
    if (node.type === 'tenant') return <Building2 className="w-4 h-4" />;
    if (node.type === 'group') return <Users className="w-4 h-4" />;
    if (node.type === 'user') return <User className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
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
          {node.label}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  
  function traverse(node: TreeNode) {
    ids.push(node.id);
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return ids;
}

