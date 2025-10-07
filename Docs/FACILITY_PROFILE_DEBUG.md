# FacilityProfile Not Displaying - Debug Guide

## Issue
When clicking on a facility/tenant node in the Admin Tree, the right panel shows the old basic tenant information (or debug JSON) instead of the new FacilityProfile component with tabs.

## Diagnostic Steps

### 1. Check Console Logs

After refreshing the browser and clicking on a facility node, you should see these console logs:

```
[AdminTreeView] Rendering FacilityProfile for tenant: <tenant-id> <tenant-name>
[FacilityProfile] Rendering with tenantId: <tenant-id> tenantName: <tenant-name>
[FacilityProfile] Fetching facility data for tenantId: <tenant-id>
[FacilityProfile] Facility data loaded: {id: "...", name: "...", ...}
[FacilityProfile] Rendering facility profile for: <facility-name>
```

### 2. Possible Scenarios

#### Scenario A: No logs at all
**Meaning**: The FacilityProfile component is not being called
**Possible causes**:
- `selectedNode.type !== 'tenant'` (check the selectedNode type in debug panel)
- Conditional rendering issue
- Import issue

#### Scenario B: Logs show "Rendering with tenantId" but nothing after
**Meaning**: Component is called but useEffect isn't running
**Possible causes**:
- useEffect dependency issue
- Component unmounting immediately

#### Scenario C: Logs show "Loading state..."
**Meaning**: Component is stuck in loading state
**Possible causes**:
- `getTenant()` function not resolving
- API error
- Infinite loading loop

#### Scenario D: Logs show "No facility data found"
**Meaning**: Data fetch succeeded but returned null/undefined
**Possible causes**:
- Tenant doesn't exist in database
- `getTenant()` returning null
- Database query issue

#### Scenario E: All logs show, including "Rendering facility profile for: ..."
**Meaning**: Component IS rendering successfully
**Possible causes**:
- Component is rendering but visually hidden (CSS issue)
- Component is rendering below the fold (scroll down to see it)
- Component is rendering but looks the same as old UI

### 3. Visual Inspection

If logs show the component is rendering, check:

1. **Scroll down** in the right panel - the FacilityProfile might be below the debug panel
2. **Collapse the debug panel** - click "Show raw data (debug)" to collapse it
3. **Inspect the DOM** - use browser DevTools to find the FacilityProfile component in the DOM tree
4. **Check for CSS issues** - look for `display: none`, `visibility: hidden`, or `opacity: 0`

### 4. Expected Visual Structure

When a facility is selected, the right panel should show:

```
┌─────────────────────────────────────┐
│ Header Section (AdminTreeView)     │
│ - Facility icon + name              │
│ - Badges (if any)                   │
│ - Action buttons (Create Group,     │
│   Invite User, Edit, Delete)        │
├─────────────────────────────────────┤
│ FacilityProfile Component           │
│ ┌─────────────────────────────────┐ │
│ │ Facility Header                 │ │
│ │ - Building icon + name          │ │
│ ├─────────────────────────────────┤ │
│ │ Tabs: Profile | Albums |        │ │
│ │       Users | Groups            │ │
│ ├─────────────────────────────────┤ │
│ │ Tab Content                     │ │
│ │ (Profile tab shows facility     │ │
│ │  details, bio, photo, etc.)     │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Debug Panel (collapsible)           │
│ ▼ Show raw data (debug)             │
│   { JSON data... }                  │
└─────────────────────────────────────┘
```

### 5. Known Issues

#### Duplicate Headers
The AdminTreeView shows a header with the facility name, and the FacilityProfile component ALSO shows a header with the facility name. This creates a duplicate header, which might be confusing.

**Solution**: We should remove the duplicate header from either AdminTreeView or FacilityProfile.

#### Debug Panel Position
The debug panel is currently positioned AFTER all node-specific details, which means it should be at the bottom. If it's showing at the top, something is wrong with the rendering order.

## Quick Fixes to Try

### Fix 1: Remove Duplicate Header from FacilityProfile

If the component is rendering but looks wrong, try removing the duplicate header from FacilityProfile:

**File**: `src/components/admin/FacilityProfile.tsx`
**Lines**: 156-160

Comment out or remove:
```typescript
{/* Header */}
<div className="flex items-center gap-3">
  <Building2 className="w-8 h-8 text-blue-600" />
  <h2 className="text-2xl font-bold text-gray-900">{facility.name}</h2>
</div>
```

### Fix 2: Ensure Proper Rendering Order

Check that the FacilityProfile is rendering in the correct position in the DOM.

### Fix 3: Check selectedNode.type

In the debug panel, verify that `selectedNode.type === 'tenant'` when you click on a facility node.

## Next Steps

1. **Refresh browser** (hard refresh: Cmd+Shift+R)
2. **Open browser console** (F12 or Cmd+Option+I)
3. **Click on a facility node** (e.g., "Top of the World Ranch")
4. **Check console logs** - which scenario matches?
5. **Scroll down** in the right panel - is FacilityProfile below the fold?
6. **Inspect DOM** - is FacilityProfile in the DOM tree?
7. **Report findings** - share console logs and observations

## Files Involved

- `src/components/admin/AdminTreeView.tsx` - Main container, renders FacilityProfile at line 633-639
- `src/components/admin/FacilityProfile.tsx` - The facility profile component with tabs
- `src/lib/services/tenants.ts` - `getTenant()` function used to fetch facility data
- `src/hooks/useUserRole.ts` - Used to check permissions

## Console Log Reference

All console logs are prefixed with `[FacilityProfile]` or `[AdminTreeView]` for easy filtering.

To filter logs in browser console:
```
[FacilityProfile]
```

or

```
[AdminTreeView]
```

