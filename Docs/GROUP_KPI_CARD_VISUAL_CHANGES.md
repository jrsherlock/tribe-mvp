# Group KPI Card - Visual Changes Summary

## Before and After Comparison

### BEFORE: Journey Status Card (3rd KPI Card)
```
┌─────────────────────────────────┐
│                                 │
│         ┌─────────┐             │
│         │ 📈      │             │  Icon: TrendingUp
│         └─────────┘             │  Background: primary-600
│                                 │
│         Growing                 │  Title: "Growing" (hardcoded)
│      Journey Status             │  Subtitle: "Journey Status"
│                                 │
└─────────────────────────────────┘
```

**Issues with old card**:
- Static content ("Growing") - not dynamic
- No real user data displayed
- Not aligned with multi-tenant group architecture
- Doesn't provide actionable information

---

### AFTER: Group Information Card (3rd KPI Card)

#### Scenario 1: User Belongs to a Group
```
┌─────────────────────────────────┐
│                                 │
│         ┌─────────┐             │
│         │ 👥      │             │  Icon: Users
│         └─────────┘             │  Background: primary-600
│                                 │
│     Default Group               │  Title: {group.name} (dynamic)
│        My Group                 │  Subtitle: "My Group"
│                                 │
└─────────────────────────────────┘
```

#### Scenario 2: Solo Mode User (No Group)
```
┌─────────────────────────────────┐
│                                 │
│         ┌─────────┐             │
│         │ 👥      │             │  Icon: Users
│         └─────────┘             │  Background: primary-600
│                                 │
│        No Group                 │  Title: "No Group" (smaller text)
│        Solo mode                │  Subtitle: "Solo mode" (smaller text)
│                                 │
└─────────────────────────────────┘
```

---

## Complete KPI Cards Layout

### Full Profile Stats Grid (3 Cards)

```
┌──────────────────┬──────────────────┬──────────────────┐
│   Card 1         │   Card 2         │   Card 3         │
│   Days Sober     │   Member Since   │   My Group       │
├──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │
│   ┌────────┐     │   ┌────────┐     │   ┌────────┐     │
│   │ 🏆     │     │   │ 📅     │     │   │ 👥     │     │
│   └────────┘     │   └────────┘     │   └────────┘     │
│                  │                  │                  │
│      235         │   Oct 2025       │  Default Group   │
│   Days Sober     │  Member Since    │    My Group      │
│  7 months, ...   │                  │                  │
│                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## Styling Details

### Group Card (User in Group)
- **Container**: `bg-secondary rounded-3xl p-6 shadow-lg border border-primary-200`
- **Icon Container**: `w-16 h-16 bg-primary-600 rounded-2xl`
- **Icon**: `Users` (lucide-react) - `w-8 h-8 text-white`
- **Title**: `text-lg font-bold text-primary-800 mb-2`
- **Subtitle**: `text-primary-600`
- **Animation**: Fade in with 0.5s delay

### Group Card (Solo Mode)
- **Container**: Same as above
- **Icon Container**: Same as above
- **Icon**: Same as above
- **Title**: `text-sm font-medium text-primary-700 mb-2` (smaller, medium weight)
- **Subtitle**: `text-xs text-primary-500` (extra small, lighter color)

---

## Responsive Behavior

The KPI cards grid uses Tailwind's responsive grid classes:
```css
grid grid-cols-1 md:grid-cols-3 gap-6
```

- **Mobile (< 768px)**: Single column, cards stack vertically
- **Tablet/Desktop (≥ 768px)**: Three columns, cards side by side

---

## Animation Sequence

All three KPI cards animate in sequence:
1. **Card 1 (Days Sober)**: delay: 0.3s
2. **Card 2 (Member Since)**: delay: 0.4s
3. **Card 3 (My Group)**: delay: 0.5s

Each card uses:
```javascript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: [0.3/0.4/0.5] }}
```

---

## Color Palette

### Icon Backgrounds
- **Days Sober**: `bg-accent` (green/teal accent color)
- **Member Since**: `bg-primary-600` (calendar icon)
- **My Group**: `bg-primary-600` (users icon)

### Text Colors
- **Primary Title**: `text-primary-800` (dark)
- **Subtitle**: `text-primary-600` (medium)
- **Solo Mode Title**: `text-primary-700` (slightly lighter)
- **Solo Mode Subtitle**: `text-primary-500` (lighter)

---

## User Experience Improvements

### For Group Members
✅ **Clear Group Identity**: Users immediately see which group they belong to
✅ **Community Connection**: Reinforces sense of belonging
✅ **Consistent Branding**: Group name matches what they see elsewhere in the app

### For Solo Users
✅ **Clear Status**: Users understand they're in solo mode
✅ **No Confusion**: "No Group" is clear and unambiguous
✅ **Potential CTA**: Future enhancement could add "Join a Group" button

---

## Accessibility Considerations

- **Icon Semantics**: Users icon clearly represents group/community
- **Text Contrast**: All text meets WCAG AA standards
- **Responsive Text**: Font sizes adjust appropriately for different states
- **Loading States**: Spinner shown while group data loads

---

## Technical Implementation

### Data Flow
```
User Profile Page
    ↓
useUserGroup() hook
    ↓
Supabase Query (group_memberships + groups)
    ↓
RLS Policies (user can only see own memberships)
    ↓
Return group data or null
    ↓
Conditional Rendering (Group vs Solo Mode)
```

### Performance
- **Single Query**: One database call to fetch group data
- **Cached Results**: React hook caches results until user changes
- **Optimistic Loading**: Shows loading spinner during fetch
- **Error Handling**: Gracefully handles database errors

---

## Future Enhancement Ideas

1. **Group Avatar**: Display group profile picture instead of generic icon
2. **Member Count Badge**: Show "12 members" below group name
3. **Group Activity**: Show recent group activity or stats
4. **Quick Actions**: "View Group" or "Group Settings" button
5. **Multiple Groups**: If user is in multiple groups, show count or carousel
6. **Join Group CTA**: For solo users, add "Browse Groups" button

