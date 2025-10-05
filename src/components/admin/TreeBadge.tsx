/**
 * Tree Badge Component
 * Visual indicators for roles, statuses, and counts
 */

import React from 'react';
import { Crown, Shield, Star, User, AlertTriangle, Users } from 'lucide-react';

export type BadgeVariant = 'superuser' | 'facility_admin' | 'group_admin' | 'member' | 'warning' | 'info' | 'success' | 'count';

interface TreeBadgeProps {
  variant: BadgeVariant;
  label?: string;
  count?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function TreeBadge({ variant, label, count, icon, className = '' }: TreeBadgeProps) {
  const getStyles = () => {
    switch (variant) {
      case 'superuser':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-700',
          border: 'border-purple-300',
          icon: <Crown className="w-3 h-3" />
        };
      case 'facility_admin':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border-blue-300',
          icon: <Shield className="w-3 h-3" />
        };
      case 'group_admin':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-300',
          icon: <Star className="w-3 h-3" />
        };
      case 'member':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-300',
          icon: <User className="w-3 h-3" />
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          border: 'border-yellow-300',
          icon: <AlertTriangle className="w-3 h-3" />
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          border: 'border-blue-200',
          icon: <Users className="w-3 h-3" />
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          text: 'text-green-600',
          border: 'border-green-200',
          icon: null
        };
      case 'count':
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-500',
          border: 'border-gray-200',
          icon: null
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-300',
          icon: null
        };
    }
  };

  const styles = getStyles();
  const displayIcon = icon || styles.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        border ${styles.bg} ${styles.text} ${styles.border}
        ${className}
      `}
    >
      {displayIcon}
      {label && <span>{label}</span>}
      {count !== undefined && <span>{count}</span>}
    </span>
  );
}

// Specific badge components for common use cases
export function SuperUserBadge() {
  return <TreeBadge variant="superuser" label="SU" />;
}

export function FacilityAdminBadge() {
  return <TreeBadge variant="facility_admin" label="FA" />;
}

export function GroupAdminBadge() {
  return <TreeBadge variant="group_admin" label="GA" />;
}

export function MemberBadge() {
  return <TreeBadge variant="member" label="Member" />;
}

export function EmptyBadge({ label = 'Empty' }: { label?: string }) {
  return <TreeBadge variant="warning" label={label} />;
}

export function CountBadge({ count, label }: { count: number; label?: string }) {
  return <TreeBadge variant="count" count={count} label={label} />;
}

export function CurrentUserBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-300">
      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
      You
    </span>
  );
}

