# Quick Test Guide: Admin Tree Fix

## 🚀 Quick Verification Steps

### 1. Check the Browser Console (FIRST!)

**Before doing anything else:**
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Clear the console (click 🚫 icon or Cmd+K)
4. Refresh the page at `http://localhost:5173/admin/tree`

**✅ SUCCESS if you see:**
- No "Maximum update depth exceeded" error
- Normal component logs
- Tree loads successfully

**❌ FAILURE if you see:**
- Red error: "Maximum update depth exceeded"
- Browser becomes unresponsive
- Blank screen

---

### 2. Test Basic Tree Functionality

**Steps:**
1. Navigate to `/admin/tree` (should already be there)
2. Look at the left panel - you should see the tree structure
3. Click "Active Tenants (1)" to expand
4. You should see facility nodes

**✅ SUCCESS if:**
- Tree expands/collapses smoothly
- No lag or freezing
- No console errors

---

### 3. Test Facility Profile Display

**Steps:**
1. Click on a facility/tenant node in the tree (e.g., "Active Tenants (1)" → first facility)
2. Look at the right panel

**✅ SUCCESS if you see:**
- Facility profile header with name and photo
- Four tabs: Profile, Photo Albums, Users, Groups
- Facility details displayed
- Edit button (if you have permissions)

**❌ FAILURE if you see:**
- Old basic tenant info (just ID and name)
- No tabs
- Blank right panel

---

### 4. Test All Tabs

**Steps:**
1. With a facility selected, click each tab:
   - **Profile** - Should show facility details, bio, etc.
   - **Photo Albums** - Should show albums or "No albums yet"
   - **Users** - Should show list of users in this facility
   - **Groups** - Should show list of groups in this facility

**✅ SUCCESS if:**
- All tabs switch smoothly
- Content loads in each tab
- No console errors

---

### 5. Test Search Functionality

**Steps:**
1. In the search box at top of tree, type a facility name
2. Watch the tree filter
3. Clear the search

**✅ SUCCESS if:**
- Matching nodes appear
- Parent nodes auto-expand
- Clearing search restores full tree
- **NO infinite loop errors**

---

## 🔍 What Was Fixed

**The Problem:**
- Infinite loop in `useEffect` hooks
- Browser would freeze
- "Maximum update depth exceeded" error
- Component completely broken

**The Fix:**
- Modified search `useEffect` to only update state when necessary
- Added change detection to prevent unnecessary re-renders
- Broke the circular dependency between useEffects

**File Changed:**
- `src/components/admin/AdminTreeView.tsx` (lines 177-234)

---

## 🐛 If It's Still Broken

### Try These Steps:

1. **Hard Refresh**
   - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - This ensures you have the latest code

2. **Check HMR Updated**
   - Look at terminal output
   - Should see: `[vite] hmr update /src/components/admin/AdminTreeView.tsx`

3. **Restart Dev Server**
   ```bash
   # In terminal, press Ctrl+C to stop
   npm run dev
   ```

4. **Clear Browser Cache**
   - DevTools → Application → Clear storage → Clear site data

5. **Check the Code**
   - Open `src/components/admin/AdminTreeView.tsx`
   - Go to lines 224-234
   - Verify the fix is present (should have `if (nodesToExpand.size > 0)`)

---

## 📊 Expected Console Output

### Good (No Errors):
```
[AdminTreeView] Component mounted
[useAdminTreeData] Fetching tree data...
[useAdminTreeData] Tree data loaded: 5 tenants
[FacilityProfile] Loading facility: abc-123
[FacilityProfile] Facility data loaded
```

### Bad (Infinite Loop):
```
Warning: Maximum update depth exceeded. This can happen when a component 
calls setState inside useEffect, but useEffect either doesn't have a 
dependency array, or one of the dependencies changes on every render.
    at AdminTreeView
    at div
    ...
```

---

## ✅ Success Criteria

All of these should be true:
- [ ] No "Maximum update depth exceeded" error
- [ ] Tree loads and displays correctly
- [ ] Can select facility nodes
- [ ] FacilityProfile component renders (not old tenant info)
- [ ] All 4 tabs work (Profile, Albums, Users, Groups)
- [ ] Search works without errors
- [ ] No browser freezing or lag

---

## 📝 Report Back

If everything works, you should see:
- ✅ Admin Tree loads successfully
- ✅ Facility Profile displays with tabs
- ✅ No console errors
- ✅ Smooth, responsive UI

If something is still broken:
- 📸 Take a screenshot of the console errors
- 📋 Note which step failed
- 🔍 Check if the code change is actually present in the file

