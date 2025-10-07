# "My Group" Navigation Item Implementation

## Overview
Added a new primary navigation item called "My Group" to the left sidebar that serves as the main hub for group-related features. This navigation item is conditionally visible based on the user's group membership status.

## Implementation Date
January 7, 2025

---

## Changes Made

### File Modified: `src/components/Layout.tsx`

#### 1. Added Imports
- **`Shield` icon** from `lucide-react` - Used as the icon for "My Group" navigation item
- **`useUserGroup` hook** from `../hooks/useUserGroup` - Provides user's group membership data

```typescript
import { Shield } from 'lucide-react';
import { useUserGroup } from '../hooks/useUserGroup';
```

#### 2. Added Hook Usage
Inside the `Layout` component, added the `useUserGroup` hook to fetch the current user's group:

```typescript
const { group: userGroup } = useUserGroup();
```

#### 3. Updated Navigation Array
Modified the `navigation` array to conditionally include "My Group" when the user is assigned to a group:

```typescript
const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home, color: 'ocean' },
  { name: 'Check-in', href: '/checkin', icon: PlusCircle, color: 'ocean' },
  { name: 'My Goals', href: '/profile', icon: Target, color: 'ocean' },
  // Conditionally add "My Group" if user is assigned to a group
  ...(userGroup ? [{ name: 'My Group', href: `/tribe/${userGroup.id}`, icon: Shield, color: 'ocean' as NavColor }] : []),
  { name: 'Tribe Feed', href: '/mytribe', icon: Users, color: 'ocean' },
  { name: 'Photo Albums', href: '/albums', icon: Camera, color: 'ocean' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, color: 'ocean' },
];
```

---

## Features

### Conditional Visibility
The "My Group" navigation item is **only visible** when:
- ✅ User is authenticated
- ✅ User is assigned to at least one group (via `group_memberships` table)

The navigation item is **hidden** when:
- ❌ User is in solo mode (no tenant assignment)
- ❌ User belongs to a tenant but is not assigned to any groups
- ❌ User is not authenticated

### Navigation Behavior
- **Route**: `/tribe/{groupId}` - Routes to the TribePage component for the user's group
- **Icon**: Shield icon from lucide-react
- **Position**: Appears after "My Goals" and before "Tribe Feed" in the navigation order
- **Styling**: Follows existing navigation patterns with slate colors and left border indicators for active states

### Responsive Design
- Works seamlessly with the collapsible sidebar (icon-only state)
- Includes tooltip in collapsed mode showing "My Group"
- Mobile-responsive with the existing mobile menu behavior

---

## Technical Details

### Data Flow
```
Layout Component
    ↓
useUserGroup() hook
    ↓
Supabase Query (group_memberships + groups)
    ↓
RLS Policies (user can only see own memberships)
    ↓
Return group data or null
    ↓
Conditional Rendering (Show/Hide "My Group" nav item)
```

### Hook Behavior
The `useUserGroup()` hook:
- Fetches the user's **first group** from `group_memberships` table
- Returns `null` if user has no group memberships (solo mode)
- Handles loading and error states gracefully
- Uses RLS policies to ensure users only see their own memberships

### Multi-Group Handling
Per the platform's design:
- Users can only be **active in one group at a time**
- The `useUserGroup()` hook returns the user's primary (first) group
- If a user is in multiple groups (edge case), they see the first group
- Future enhancement: Allow users to switch between groups if needed

---

## User Experience

### For Users With a Group
1. User logs in and is assigned to a group
2. "My Group" appears in the sidebar navigation
3. Clicking "My Group" navigates to `/tribe/{groupId}`
4. User sees the Group Hub with tabs: Profile, Members, Events, Photos

### For Solo Mode Users
1. User logs in without a tenant or group assignment
2. "My Group" does **not** appear in the sidebar
3. User sees standard navigation without group features
4. User can still access other features (Dashboard, Check-in, Goals, etc.)

### For Tenant Users Without Groups
1. User belongs to a tenant but is not assigned to any groups
2. "My Group" does **not** appear in the sidebar
3. User can join groups via the `/groups` page
4. Once assigned to a group, "My Group" appears automatically

---

## Testing Checklist

- [ ] **Solo Mode User**: Verify "My Group" is hidden
- [ ] **User With Group**: Verify "My Group" appears and routes correctly
- [ ] **User Without Group (but has tenant)**: Verify "My Group" is hidden
- [ ] **Collapsed Sidebar**: Verify Shield icon appears and tooltip shows "My Group"
- [ ] **Mobile View**: Verify "My Group" appears in mobile menu when applicable
- [ ] **Active State**: Verify left border indicator appears when on `/tribe/{groupId}` route
- [ ] **Navigation Order**: Verify "My Group" appears between "My Goals" and "Tribe Feed"

---

## Related Files

- **Component**: `src/components/Layout.tsx` (modified)
- **Hook**: `src/hooks/useUserGroup.ts` (existing)
- **Route**: `src/App.tsx` - Route `/tribe/:groupId` → `TribePage`
- **Group Hub**: `src/components/tribe/TribePage.tsx` (existing)

---

## Future Enhancements

1. **Multi-Group Switching**: If users can be in multiple groups, add a dropdown to switch between groups
2. **Group Notifications**: Add badge indicator for unread group activity
3. **Quick Actions**: Add hover menu with quick actions (Create Event, Upload Photo, etc.)
4. **Group Avatar**: Display group avatar/icon instead of Shield icon for personalization

---

## Notes

- The implementation follows the existing navigation patterns in `Layout.tsx`
- Uses the same styling classes and responsive behavior as other nav items
- Leverages the existing `useUserGroup()` hook for data fetching
- No database changes required - uses existing schema and RLS policies
- Compatible with the multi-tenant architecture (Tenant → Groups → Users)

