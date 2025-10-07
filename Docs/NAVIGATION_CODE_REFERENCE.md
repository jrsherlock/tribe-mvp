# Navigation Panel Code Reference

## Component Structure

### File Location
`src/components/Layout.tsx`

## Key Code Sections

### 1. Imports & Dependencies

```typescript
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Target, PlusCircle, Users, Camera, BarChart3,
  Menu, X, LogOut, ChevronsLeft, ChevronsRight,
  MoreHorizontal, UserCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getOwnProfile } from '../lib/services/profiles';
import { useTenant } from '../lib/tenant';
```

### 2. Type Definitions

```typescript
interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  color: NavColor; // Legacy, not currently used
}

interface UserProfileData {
  display_name: string;
  avatar_url?: string;
}
```

### 3. State Management

```typescript
// UI State
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
const [isCollapsed, setIsCollapsed] = useState(false);
const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

// Data State
const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

// Hooks
const { user, signOut } = useAuth();
const { currentTenantId } = useTenant();
const location = useLocation();
```

### 4. Navigation Configuration

```typescript
const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home, color: 'ocean' },
  { name: 'Check-in', href: '/checkin', icon: PlusCircle, color: 'ocean' },
  { name: 'My Goals', href: '/profile', icon: Target, color: 'ocean' },
  { name: 'Tribe Feed', href: '/sangha', icon: Users, color: 'ocean' },
  { name: 'Photo Albums', href: '/albums', icon: Camera, color: 'ocean' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, color: 'ocean' },
];
```

### 5. Effects & Side Effects

#### localStorage Persistence (Load)
```typescript
useEffect(() => {
  const savedCollapsedState = localStorage.getItem('sidebar-collapsed');
  if (savedCollapsedState !== null) {
    setIsCollapsed(savedCollapsedState === 'true');
  }
}, []);
```

#### localStorage Persistence (Save)
```typescript
useEffect(() => {
  localStorage.setItem('sidebar-collapsed', String(isCollapsed));
}, [isCollapsed]);
```

#### User Profile Fetching
```typescript
useEffect(() => {
  const fetchUserProfile = async () => {
    if (!user?.userId) return;
    
    try {
      const { data, error } = await getOwnProfile(user.userId, currentTenantId || null);
      if (error) {
        console.warn('Failed to fetch user profile:', error);
        return;
      }
      
      if (data) {
        setUserProfile({
          display_name: data.display_name || user.email || 'User',
          avatar_url: data.avatar_url
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  fetchUserProfile();
}, [user, currentTenantId]);
```

### 6. Helper Functions

#### Active Route Detection
```typescript
const isActive = (href: string) => {
  return location.pathname === href;
};
```

#### Sign Out Handler
```typescript
const handleSignOut = async () => {
  try {
    await signOut();
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
```

#### Navigation Item Styling
```typescript
const getNavItemClasses = (isActiveItem: boolean) => {
  const baseClasses = 'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative';
  
  if (isActiveItem) {
    return `${baseClasses} bg-slate-200 text-slate-900 font-semibold border-l-2 border-ocean-600`;
  }
  
  return `${baseClasses} text-slate-600 hover:bg-slate-200`;
};
```

## Component Hierarchy

```
Layout
├── Mobile Menu Button (lg:hidden)
├── Sidebar (fixed, collapsible)
│   ├── Logo Section
│   ├── Navigation Items
│   │   └── Each Item (with tooltip in collapsed mode)
│   ├── Collapse Toggle Button
│   └── User Profile Block
│       └── Profile Dropdown Menu
├── Mobile Overlay (when menu open)
├── Profile Menu Overlay (when menu open)
└── Main Content Area (responsive padding)
```

## Styling Classes Reference

### Sidebar
- **Expanded**: `w-64 bg-slate-100 shadow-xl border-r border-slate-200`
- **Collapsed**: `w-20 bg-slate-100 shadow-xl border-r border-slate-200`
- **Transition**: `transition-all duration-300 ease-in-out`

### Navigation Items
- **Base**: `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative`
- **Inactive**: `text-slate-600 hover:bg-slate-200`
- **Active**: `bg-slate-200 text-slate-900 font-semibold border-l-2 border-ocean-600`

### Tooltips (Collapsed Mode)
- **Container**: `absolute left-full ml-2 top-1/2 -translate-y-1/2`
- **Style**: `px-3 py-2 bg-slate-800 text-white text-sm rounded-lg`
- **Animation**: `opacity-0 group-hover:opacity-100 transition-opacity duration-200`
- **Z-Index**: `z-50`

### Profile Block
- **Container**: `p-4 border-t border-slate-200 relative`
- **Button**: `flex items-center w-full px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg`
- **Avatar**: `w-8 h-8 rounded-full object-cover flex-shrink-0`

### Profile Menu
- **Expanded Position**: `bottom-full mb-2 left-4 right-4`
- **Collapsed Position**: `left-full ml-2 bottom-4`
- **Style**: `bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50`

### Main Content
- **Expanded Sidebar**: `lg:pl-64`
- **Collapsed Sidebar**: `lg:pl-20`
- **Transition**: `transition-all duration-300`

## Responsive Breakpoints

### Mobile (< 1024px)
- Sidebar hidden by default
- Hamburger menu button visible
- Sidebar slides in from left when opened
- Overlay dims background
- Full-width sidebar (w-64)

### Desktop (≥ 1024px)
- Sidebar always visible
- Can be collapsed to icon-only (w-20)
- No hamburger menu
- No overlay
- Main content adjusts padding

## State Flow Diagrams

### Sidebar Collapse Flow
```
User clicks collapse button
  ↓
setIsCollapsed(!isCollapsed)
  ↓
useEffect triggers
  ↓
localStorage.setItem('sidebar-collapsed', value)
  ↓
Sidebar width changes (w-64 → w-20)
  ↓
Main content padding adjusts (pl-64 → pl-20)
  ↓
Navigation items hide text, show tooltips
```

### Profile Menu Flow
```
User clicks profile block
  ↓
setIsProfileMenuOpen(true)
  ↓
Menu renders with absolute positioning
  ↓
Overlay renders behind menu
  ↓
User clicks menu item OR outside
  ↓
setIsProfileMenuOpen(false)
  ↓
Menu and overlay removed
```

## Integration Points

### Authentication
- Uses `useAuth()` hook for user data and signOut function
- Requires `user.userId` to fetch profile

### Tenant Context
- Uses `useTenant()` hook for currentTenantId
- Passes to `getOwnProfile()` for tenant-specific data

### Profile Service
- Calls `getOwnProfile(userId, tenantId)` to fetch user data
- Returns display_name and avatar_url

### Routing
- Uses `useLocation()` to detect active route
- Uses `Link` component for navigation
- Supports React Router's navigation patterns

## Performance Considerations

### Optimizations
- Profile data fetched once on mount (with dependency array)
- localStorage operations are synchronous but minimal
- Transitions use CSS (hardware accelerated)
- Tooltips use CSS opacity (no re-renders)

### Potential Improvements
- Debounce collapse toggle if users spam click
- Lazy load profile image
- Memoize navigation item classes
- Add loading state for profile data

## Accessibility Features

### ARIA Labels
- Add `aria-label` to collapse button
- Add `aria-expanded` to profile menu button
- Add `role="navigation"` to nav element

### Keyboard Support
- All interactive elements are keyboard accessible
- Consider adding keyboard shortcuts (Cmd+B for collapse)
- Add Escape key to close menus

### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- Announce state changes

## Testing Checklist

### Unit Tests
- [ ] Navigation items render correctly
- [ ] Active state detection works
- [ ] Collapse state persists
- [ ] Profile data loads
- [ ] Sign out function calls

### Integration Tests
- [ ] Navigation between routes
- [ ] Profile menu interactions
- [ ] Mobile menu functionality
- [ ] Responsive behavior

### E2E Tests
- [ ] Full user flow from login to navigation
- [ ] Collapse/expand persistence across sessions
- [ ] Profile menu sign out flow

## Common Issues & Solutions

### Issue: Profile image not loading
**Solution**: Check CORS settings, verify avatar_url is valid, add error handling

### Issue: Collapsed state not persisting
**Solution**: Verify localStorage is enabled, check for quota exceeded errors

### Issue: Menu positioning incorrect
**Solution**: Check parent positioning, verify z-index values, test in different browsers

### Issue: Tooltips not showing
**Solution**: Verify group/group-hover classes, check z-index, ensure pointer-events-none

## Future Enhancements

1. **Keyboard Shortcuts**: Add Cmd+B to toggle sidebar
2. **Animations**: Add spring animations to menu
3. **Themes**: Support light/dark mode toggle
4. **Customization**: Allow users to reorder nav items
5. **Notifications**: Add badge to profile menu
6. **Search**: Add quick search in navigation
7. **Recent Pages**: Show recently visited pages
8. **Favorites**: Allow pinning favorite pages

