# RBAC Developer Guide - Quick Reference

## Role Checking in Application Code

### TypeScript/React Components

#### Check if user is a SuperUser
```typescript
import { supabase } from '../lib/supabase'

// In component or hook
const [isSuperUser, setIsSuperUser] = useState(false)

useEffect(() => {
  async function checkSuperUser() {
    const { data } = await supabase.rpc('is_superuser')
    setIsSuperUser(data === true)
  }
  checkSuperUser()
}, [])

// Use in JSX
{isSuperUser && (
  <button onClick={createFacility}>Create Facility</button>
)}
```

---

#### Check if user is a Facility Admin
```typescript
const [isFacilityAdmin, setIsFacilityAdmin] = useState(false)

useEffect(() => {
  async function checkFacilityAdmin() {
    if (!currentTenantId) return
    
    const { data } = await supabase.rpc('is_facility_admin', {
      p_tenant_id: currentTenantId
    })
    setIsFacilityAdmin(data === true)
  }
  checkFacilityAdmin()
}, [currentTenantId])

// Use in JSX
{isFacilityAdmin && (
  <button onClick={createGroup}>Create Group</button>
)}
```

---

#### Check if user is a Group Admin
```typescript
const [isGroupAdmin, setIsGroupAdmin] = useState(false)

useEffect(() => {
  async function checkGroupAdmin() {
    if (!groupId) return
    
    const { data } = await supabase.rpc('is_group_admin', {
      p_group_id: groupId
    })
    setIsGroupAdmin(data === true)
  }
  checkGroupAdmin()
}, [groupId])

// Use in JSX
{isGroupAdmin && (
  <button onClick={inviteToGroup}>Invite Member</button>
)}
```

---

#### Get user's role in a tenant
```typescript
const [userRole, setUserRole] = useState<string | null>(null)

useEffect(() => {
  async function getUserRole() {
    if (!currentTenantId) return
    
    const { data } = await supabase.rpc('get_user_tenant_role', {
      p_tenant_id: currentTenantId
    })
    setUserRole(data)
  }
  getUserRole()
}, [currentTenantId])

// Use in JSX
{userRole === 'SUPERUSER' && <SuperUserDashboard />}
{(userRole === 'OWNER' || userRole === 'ADMIN') && <FacilityAdminDashboard />}
{userRole === 'MEMBER' && <MemberDashboard />}
{userRole === 'BASIC_USER' && <BasicUserDashboard />}
```

---

### Custom Hook: useUserRole

**Create this hook** in `src/hooks/useUserRole.ts`:

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useUserRole(tenantId?: string) {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      if (!tenantId) {
        setRole('BASIC_USER')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.rpc('get_user_tenant_role', {
          p_tenant_id: tenantId
        })
        
        if (error) throw error
        setRole(data)
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [tenantId])

  return {
    role,
    loading,
    isSuperUser: role === 'SUPERUSER',
    isFacilityAdmin: role === 'OWNER' || role === 'ADMIN',
    isOwner: role === 'OWNER',
    isAdmin: role === 'ADMIN',
    isMember: role === 'MEMBER',
    isBasicUser: role === 'BASIC_USER'
  }
}
```

**Usage**:
```typescript
function GroupsManager() {
  const { currentTenantId } = useTenant()
  const { isFacilityAdmin, isSuperUser, loading } = useUserRole(currentTenantId)

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {(isFacilityAdmin || isSuperUser) && (
        <button onClick={createGroup}>Create Group</button>
      )}
      {/* Rest of component */}
    </div>
  )
}
```

---

## SQL Queries for Testing

### Check your own role in a tenant
```sql
SELECT public.get_user_tenant_role('3b2f18c9-761a-4d8c-b033-0b3afe1e3460');
-- Returns: SUPERUSER, OWNER, ADMIN, MEMBER, or BASIC_USER
```

### Check if you're a Facility Admin
```sql
SELECT public.is_facility_admin('3b2f18c9-761a-4d8c-b033-0b3afe1e3460');
-- Returns: TRUE or FALSE
```

### Check if you're a Group Admin
```sql
SELECT public.is_group_admin('<group-id>');
-- Returns: TRUE or FALSE
```

### View all your tenant memberships
```sql
SELECT tm.*, t.name as tenant_name, t.slug
FROM tenant_members tm
JOIN tenants t ON tm.tenant_id = t.id
WHERE tm.user_id = auth.uid();
```

### View all your group memberships
```sql
SELECT gm.*, g.name as group_name, t.name as tenant_name
FROM group_memberships gm
JOIN groups g ON gm.group_id = g.id
JOIN tenants t ON g.tenant_id = t.id
WHERE gm.user_id = auth.uid();
```

---

## Common UI Patterns

### Show/Hide Create Group Button
```typescript
function GroupsList() {
  const { currentTenantId } = useTenant()
  const { isFacilityAdmin, isSuperUser } = useUserRole(currentTenantId)

  const canCreateGroup = isFacilityAdmin || isSuperUser

  return (
    <div>
      <h2>Groups</h2>
      {canCreateGroup && (
        <button onClick={handleCreateGroup}>
          Create Group
        </button>
      )}
      {!canCreateGroup && (
        <p className="text-sm text-gray-500">
          Only facility administrators can create groups.
        </p>
      )}
      {/* Group list */}
    </div>
  )
}
```

---

### Show/Hide Invite User Button
```typescript
function MembersList() {
  const { currentTenantId } = useTenant()
  const { isFacilityAdmin, isSuperUser } = useUserRole(currentTenantId)

  const canInviteUsers = isFacilityAdmin || isSuperUser

  return (
    <div>
      <h2>Members</h2>
      {canInviteUsers && (
        <button onClick={handleInviteUser}>
          Invite User
        </button>
      )}
      {/* Member list */}
    </div>
  )
}
```

---

### Show/Hide Edit Facility Button
```typescript
function FacilityProfile() {
  const { currentTenantId } = useTenant()
  const { isFacilityAdmin, isSuperUser } = useUserRole(currentTenantId)

  const canEditFacility = isFacilityAdmin || isSuperUser

  return (
    <div>
      <h1>Facility Profile</h1>
      {canEditFacility && (
        <button onClick={handleEditFacility}>
          Edit Facility
        </button>
      )}
      {/* Facility details */}
    </div>
  )
}
```

---

### Role-Based Dashboard
```typescript
function Dashboard() {
  const { currentTenantId } = useTenant()
  const { role, loading } = useUserRole(currentTenantId)

  if (loading) return <div>Loading...</div>

  switch (role) {
    case 'SUPERUSER':
      return <SuperUserDashboard />
    
    case 'OWNER':
    case 'ADMIN':
      return <FacilityAdminDashboard />
    
    case 'MEMBER':
      return <FacilityMemberDashboard />
    
    case 'BASIC_USER':
    default:
      return <BasicUserDashboard />
  }
}
```

---

### Display Role Badge
```typescript
function UserRoleBadge() {
  const { currentTenantId } = useTenant()
  const { role } = useUserRole(currentTenantId)

  const roleConfig = {
    SUPERUSER: { label: 'Super Admin', color: 'bg-purple-600' },
    OWNER: { label: 'Facility Owner', color: 'bg-blue-600' },
    ADMIN: { label: 'Facility Admin', color: 'bg-blue-500' },
    MEMBER: { label: 'Member', color: 'bg-green-600' },
    BASIC_USER: { label: 'Basic User', color: 'bg-gray-600' }
  }

  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.BASIC_USER

  return (
    <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${config.color}`}>
      {config.label}
    </span>
  )
}
```

---

## Permission Checks Before Actions

### Before Creating a Group
```typescript
async function handleCreateGroup() {
  if (!currentTenantId) {
    toast.error('No facility selected')
    return
  }

  // Check permission
  const { data: canCreate } = await supabase.rpc('is_facility_admin', {
    p_tenant_id: currentTenantId
  })

  if (!canCreate) {
    toast.error('Only facility administrators can create groups')
    return
  }

  // Proceed with group creation
  const { data, error } = await supabase
    .from('groups')
    .insert({ tenant_id: currentTenantId, name: groupName })
    .select()
    .single()

  if (error) {
    toast.error('Failed to create group')
  } else {
    toast.success('Group created successfully')
  }
}
```

---

### Before Inviting a User
```typescript
async function handleInviteUser(email: string) {
  if (!currentTenantId) {
    toast.error('No facility selected')
    return
  }

  // Check permission
  const { data: canInvite } = await supabase.rpc('is_facility_admin', {
    p_tenant_id: currentTenantId
  })

  if (!canInvite) {
    toast.error('Only facility administrators can invite users')
    return
  }

  // Proceed with invitation
  // ... invitation logic
}
```

---

## Error Handling

### Handle RLS Policy Violations
```typescript
async function performAction() {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert({ tenant_id: currentTenantId, name: 'New Group' })

    if (error) {
      // Check for RLS policy violation
      if (error.code === '42501') {
        toast.error('You do not have permission to perform this action')
        return
      }
      
      throw error
    }

    toast.success('Action completed successfully')
  } catch (error) {
    console.error('Error:', error)
    toast.error('An unexpected error occurred')
  }
}
```

---

## Testing Different Roles

### Test as SuperUser
1. Ensure your user is in the `superusers` table
2. Should be able to create facilities, groups, and manage all data

### Test as Facility Admin
1. Create a user and add to `tenant_members` with `role = 'ADMIN'` or `'OWNER'`
2. Should be able to create groups and manage users in their facility
3. Should NOT be able to create new facilities

### Test as Group Admin
1. Create a user and add to `group_memberships` with `role = 'ADMIN'`
2. Should be able to manage members in their group
3. Should NOT be able to create groups or manage facility

### Test as Facility Member
1. Create a user and add to `tenant_members` with `role = 'MEMBER'`
2. Should be able to view groups and participate
3. Should NOT be able to create groups or invite users

### Test as Basic User
1. Create a user with NO records in `tenant_members` or `group_memberships`
2. Should only see personal features (own check-ins, streaks, goals)
3. Should NOT see any group or facility features

---

## Summary

**Key Points**:
1. Always check permissions before showing UI elements
2. Use helper functions (`is_facility_admin`, `is_group_admin`, etc.) for role checks
3. Handle RLS policy violations gracefully with user-friendly error messages
4. Create reusable hooks like `useUserRole` for consistent role checking
5. Test with all five role types to ensure proper access control

**Remember**: The database RLS policies are the ultimate authority. UI checks are for user experience, but the database will enforce permissions regardless.

