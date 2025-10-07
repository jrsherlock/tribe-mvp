/**
 * useAllUsers Hook
 * Fetches ALL users across the platform with comprehensive data
 * Requires SuperUser permissions and service role key
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

export interface ComprehensiveUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  
  // Role & Status
  is_superuser: boolean;
  platform_role: 'SuperUser' | 'Facility Admin' | 'Basic User' | 'Solo User';
  
  // Facility Assignment
  facility: {
    id: string;
    name: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  } | null;
  
  // Group Assignments
  groups: Array<{
    id: string;
    name: string;
    role: 'ADMIN' | 'MEMBER';
  }>;
  
  // Metadata
  created_at: string;
  last_sign_in_at?: string;
}

interface UseAllUsersReturn {
  users: ComprehensiveUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Singleton admin client
let adminClientInstance: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );
  }

  return adminClientInstance;
}

export function useAllUsers(): UseAllUsersReturn {
  const [users, setUsers] = useState<ComprehensiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const adminClient = getAdminClient();
      if (!adminClient) {
        throw new Error('Service role key required. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local');
      }

      // 1. Get all auth users
      const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
      if (authError) throw authError;

      // 2. Get all profiles
      const { data: profiles, error: profilesError } = await adminClient
        .from('user_profiles')
        .select('user_id, display_name, avatar_url, email');
      if (profilesError) throw profilesError;

      // 3. Get all superusers
      const { data: superusers, error: superusersError } = await adminClient
        .from('superusers')
        .select('user_id');
      if (superusersError) throw superusersError;

      // 4. Get all tenant memberships with tenant names
      const { data: tenantMembers, error: tenantMembersError } = await adminClient
        .from('tenant_members')
        .select(`
          user_id,
          role,
          tenants (
            id,
            name
          )
        `);
      if (tenantMembersError) throw tenantMembersError;

      // 5. Get all group memberships with group names
      const { data: groupMembers, error: groupMembersError } = await adminClient
        .from('group_memberships')
        .select(`
          user_id,
          role,
          groups (
            id,
            name,
            tenant_id
          )
        `);
      if (groupMembersError) throw groupMembersError;

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const superuserSet = new Set(superusers?.map(s => s.user_id) || []);
      
      // Map tenant memberships
      const tenantMemberMap = new Map(
        tenantMembers?.map(tm => [
          tm.user_id,
          {
            id: (tm.tenants as any)?.id || '',
            name: (tm.tenants as any)?.name || '',
            role: tm.role as 'OWNER' | 'ADMIN' | 'MEMBER'
          }
        ]) || []
      );

      // Map group memberships
      const groupMemberMap = new Map<string, Array<{ id: string; name: string; role: 'ADMIN' | 'MEMBER' }>>();
      groupMembers?.forEach(gm => {
        const existing = groupMemberMap.get(gm.user_id) || [];
        existing.push({
          id: (gm.groups as any)?.id || '',
          name: (gm.groups as any)?.name || '',
          role: gm.role as 'ADMIN' | 'MEMBER'
        });
        groupMemberMap.set(gm.user_id, existing);
      });

      // Merge all data into comprehensive user objects
      const comprehensiveUsers: ComprehensiveUser[] = authUsers.users.map(authUser => {
        const profile = profileMap.get(authUser.id);
        const isSuperuser = superuserSet.has(authUser.id);
        const facility = tenantMemberMap.get(authUser.id) || null;
        const groups = groupMemberMap.get(authUser.id) || [];

        // Determine platform role
        let platformRole: ComprehensiveUser['platform_role'] = 'Solo User';
        if (isSuperuser) {
          platformRole = 'SuperUser';
        } else if (facility) {
          if (facility.role === 'OWNER' || facility.role === 'ADMIN') {
            platformRole = 'Facility Admin';
          } else {
            platformRole = 'Basic User';
          }
        }

        return {
          id: authUser.id,
          email: authUser.email || 'No email',
          display_name: profile?.display_name || profile?.email || authUser.email || 'Unknown User',
          avatar_url: profile?.avatar_url,
          is_superuser: isSuperuser,
          platform_role: platformRole,
          facility,
          groups,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at
        };
      });

      // Sort by display name
      comprehensiveUsers.sort((a, b) => 
        a.display_name.localeCompare(b.display_name)
      );

      setUsers(comprehensiveUsers);
    } catch (err: any) {
      console.error('[useAllUsers] Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchAllUsers
  };
}

