# Admin Tree Loading State Fix

## Issue Summary

**Problem:** After making edits to facility data (updating facility details, managing users, or modifying groups), the Admin Tree UI gets stuck displaying "Loading Admin Tree..." indefinitely and never returns to the normal view.

**Symptoms:**
- User makes an edit in the Admin console (e.g., updates facility name, adds/removes users, modifies groups)
- After the edit is submitted, the UI shows "Loading admin tree..." spinner
- The spinner never completes - the UI remains stuck in loading state
- Manual navigation away and back shows the changes ARE reflected correctly (backend update succeeded)
- Console logs show `FacilityProfile` component re-rendering repeatedly in a loop

**Location:** `src/hooks/useAdminTreeData.ts`

## Root Cause Analysis

The issue was in the `refetch` function of the `useAdminTreeData` hook:

### **Original Broken Code (Lines 81-85)**

```typescript
refetch: () => {
  // Trigger re-fetch by updating a dependency
  setData(null);
  setIsLoading(true);
}
```

### **The Problem**

1. When `onUpdate` is called from `FacilityProfile`, it calls `refetch()`
2. `refetch()` sets `setData(null)` and `setIsLoading(true)`
3. **However**, the `useEffect` that fetches data only runs when `userRole`, `userId`, or `tenantId` change (line 68):
   ```typescript
   }, [userRole, userId, tenantId]);
   ```
4. Since none of these dependencies change when `refetch()` is called, the `useEffect` never runs again
5. This leaves `isLoading` stuck at `true` forever, causing the infinite "Loading admin tree..." state
6. The data fetch never happens, so the UI never updates

### **Why the Backend Updates Worked**

The backend updates were successful because:
- The `FacilityProfile` component correctly calls the update functions
- The Supabase database is updated successfully
- The issue is purely in the frontend state management - the refetch mechanism was broken

## Solution Implemented

### **New Fixed Code**

Added a `refetchTrigger` state variable that increments on each refetch call:

```typescript
export function useAdminTreeData(
  userRole: UserRole,
  userId: string,
  tenantId: string | null
) {
  const [data, setData] = useState<TreeDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0); // ← NEW

  useEffect(() => {
    // ... fetch logic ...
  }, [userRole, userId, tenantId, refetchTrigger]); // ← Added refetchTrigger

  return {
    treeNodes,
    rawData: data,
    isLoading,
    error,
    refetch: () => {
      // Trigger re-fetch by incrementing the refetch trigger
      setRefetchTrigger(prev => prev + 1); // ← FIXED
    }
  };
}
```

### **How It Works**

1. Added a new state variable `refetchTrigger` initialized to `0`
2. Added `refetchTrigger` to the `useEffect` dependency array
3. Changed `refetch()` to increment `refetchTrigger` instead of manually setting state
4. When `refetch()` is called:
   - `refetchTrigger` increments (e.g., 0 → 1)
   - This triggers the `useEffect` to run (dependency changed)
   - The `useEffect` sets `isLoading: true` and fetches fresh data
   - After data is fetched, `isLoading` is set to `false`
   - The UI updates with the new data

## Files Modified

- **src/hooks/useAdminTreeData.ts**
  - Added `refetchTrigger` state variable (line 30)
  - Added `refetchTrigger` to `useEffect` dependencies (line 69)
  - Updated `refetch()` function to increment trigger (lines 82-85)

## Testing Checklist

### Before Testing
- Dev server is running at http://localhost:5174
- Open browser console to monitor for errors and render loops

### Test 1: Edit Facility Details
- [ ] Navigate to Admin console
- [ ] Select a facility (e.g., "Top of the World Ranch")
- [ ] Click "Edit" button on facility profile
- [ ] Change the facility name
- [ ] Click "Save"
- [ ] **Expected**: UI briefly shows loading, then returns to normal view
- [ ] **Expected**: Facility name is updated in the tree
- [ ] **Expected**: No "Loading admin tree..." stuck state
- [ ] **Expected**: Console shows single render, not infinite loop

### Test 2: Upload Facility Photo
- [ ] Click the camera icon to upload a new facility photo
- [ ] Select an image file
- [ ] **Expected**: Photo uploads and UI updates
- [ ] **Expected**: No stuck loading state
- [ ] **Expected**: Tree refreshes with new data

### Test 3: User Management
- [ ] Click on "Users" tab
- [ ] Invite a new user or change a user's role
- [ ] **Expected**: UI updates after operation completes
- [ ] **Expected**: No stuck loading state
- [ ] **Expected**: User count in tree updates
- [ ] Remove a user from the facility
- [ ] **Expected**: UI updates correctly

### Test 4: Group Management
- [ ] Click on "Groups" tab
- [ ] Create a new group
- [ ] **Expected**: UI updates after group is created
- [ ] **Expected**: No stuck loading state
- [ ] **Expected**: Group appears in tree
- [ ] Edit a group name
- [ ] **Expected**: UI updates correctly
- [ ] Delete a group
- [ ] **Expected**: UI updates and group is removed from tree

### Test 5: Console Verification
- [ ] Check browser console for errors
- [ ] Verify no infinite render loops (repeated "[FacilityProfile] Rendering..." messages)
- [ ] Verify no "Loading admin tree..." stuck state
- [ ] Verify refetch completes within 1-2 seconds

## Expected Behavior After Fix

1. **Edit Facility Details**: 
   - User clicks "Edit" on facility profile
   - Makes changes and clicks "Save"
   - UI shows brief loading state
   - UI returns to normal view with updated data
   - Tree reflects the changes

2. **User Management**:
   - User adds/removes users from facility
   - UI shows brief loading state
   - UI returns to normal view
   - Tree shows updated user count

3. **Group Management**:
   - User creates/edits/deletes groups
   - UI shows brief loading state
   - UI returns to normal view
   - Tree shows updated group structure

4. **No Infinite Loading**:
   - Loading state completes within 1-2 seconds
   - No stuck "Loading admin tree..." spinner
   - No infinite render loops in console

## Related Components

- `src/components/admin/AdminTreeView.tsx` - Uses `useAdminTreeData` hook and passes `refetch` to child components
- `src/components/admin/FacilityProfile.tsx` - Calls `onUpdate()` which triggers `refetch()`
- `src/components/admin/FacilityUserManagement.tsx` - Calls `onUpdate()` after user changes
- `src/components/admin/FacilityGroupManagement.tsx` - Calls `onUpdate()` after group changes

## Additional Notes

- This fix uses a common React pattern for triggering effects on demand
- The `refetchTrigger` is a simple counter that increments on each refetch
- This approach is more reliable than manually managing loading states
- The fix maintains all existing functionality while solving the loading state issue

## Prevention

To prevent similar issues in the future:

1. **Always include trigger dependencies in useEffect**: If you have a refetch function, make sure the useEffect has a dependency that changes when refetch is called
2. **Test loading states**: Always test that loading states complete and don't get stuck
3. **Use refetch triggers**: The pattern of using a counter/trigger state is a reliable way to trigger effects on demand
4. **Avoid manual state management**: Don't manually set `isLoading` outside of the effect - let the effect manage its own loading state

