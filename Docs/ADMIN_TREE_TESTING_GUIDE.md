# Admin Tree Navigation - Testing Guide

**Date**: October 3, 2025  
**Status**: ✅ Ready for Testing  
**Version**: Phase 2 Complete

---

## 🎯 WHAT'S BEEN BUILT

### Core Features Implemented:
1. ✅ **Hierarchical Tree Navigation** - Tenants → Groups → Users
2. ✅ **Role-Based Views** - SuperUser, Facility Admin, Group Admin
3. ✅ **Visual Indicators** - Badges for roles, statuses, counts
4. ✅ **Expand/Collapse** - Interactive tree with state management
5. ✅ **Detail Panel** - Formatted information display
6. ✅ **Test Data** - 7 users, 6 groups, realistic scenarios

---

## 🚀 HOW TO TEST

### Step 1: Start the Development Server

```bash
cd /Users/sherlock/Downloads/Tribe
npm run dev
```

### Step 2: Navigate to Admin Tree

Open your browser and go to:
```
http://localhost:5173/admin/tree
```

### Step 3: What You Should See

#### **SuperUser View** (You are logged in as Jim Sherlock - SuperUser)

You should see a tree structure with these sections:

1. **⚠️ Orphaned Tenants (2)**
   - Demo Facility (0 users)
   - Top of the World Ranch - totw-ranch (0 users)

2. **🏢 Active Tenants (1)**
   - Top of the World Ranch (5 users, 3 groups)
     - Default Group (3 members)
       - Jim Sherlock [SU] [YOU]
       - Sarah Johnson [FA]
       - Michael Chen
     - Morning Warriors (2 members)
       - Sarah Johnson [GA] [FA]
       - Michael Chen
     - Weekend Support (2 members)
       - Emily Rodriguez [GA]
       - David Thompson

3. **🚶 Solo Users (2)**
   - Jim Sherlock (jsherlock@cybercade.com)
   - Lisa Martinez

---

## ✅ TESTING CHECKLIST

### Visual Elements:
- [ ] Tree renders with proper indentation (24px per level)
- [ ] Icons display correctly (🏢 for tenants, 👥 for groups, 👤 for users)
- [ ] Expand/collapse chevrons work (click to toggle)
- [ ] Badges display correctly:
  - [ ] Purple "SU" badge for SuperUser (Jim Sherlock)
  - [ ] Blue "FA" badge for Facility Admin (Sarah Johnson)
  - [ ] Green "GA" badge for Group Admins (Sarah, Emily)
  - [ ] Animated "You" badge for current user
  - [ ] Count badges show correct numbers
  - [ ] Warning badges on empty groups/orphaned tenants

### Functionality:
- [ ] Click "Expand All" - all nodes expand
- [ ] Click "Collapse All" - all nodes collapse
- [ ] Click individual chevrons - only that node toggles
- [ ] Click on a node - detail panel updates on right
- [ ] Search bar is visible (not functional yet)
- [ ] Toolbar buttons are visible

### Detail Panel:
- [ ] Click on tenant - shows tenant info (slug, user count, group count, created date)
- [ ] Click on group - shows group info (tenant name, member count, description, created date)
- [ ] Click on user - shows user info (email, tenant, groups, memberships)
- [ ] Badges appear in detail panel header
- [ ] "Show raw data (debug)" expands to show JSON

### Data Accuracy:
- [ ] Top of the World Ranch shows 5 users
- [ ] Default Group shows 3 members
- [ ] Morning Warriors shows 2 members
- [ ] Weekend Support shows 2 members
- [ ] Jim Sherlock appears twice (once in tenant, once in solo users)
- [ ] Lisa Martinez appears only in solo users
- [ ] Orphaned tenants show "0 users" badge

---

## 🐛 KNOWN ISSUES / LIMITATIONS

### Not Yet Implemented:
- ⚠️ **Search functionality** - Search bar is visible but not functional
- ⚠️ **Filter dropdowns** - Not yet implemented
- ⚠️ **Actions/modals** - No CRUD operations yet (Phase 4)
- ⚠️ **Bulk selection** - Not yet implemented (Phase 5)
- ⚠️ **Animations** - No Framer Motion animations yet (Phase 5)
- ⚠️ **Real-time updates** - No Supabase subscriptions yet (Phase 5)
- ⚠️ **Drag and drop** - Not implemented (Phase 5)

### Expected Behavior:
- ✅ Tree should load within 1-2 seconds
- ✅ Expand/collapse should be instant
- ✅ Detail panel should update immediately on click
- ✅ No console errors should appear

---

## 🔍 WHAT TO LOOK FOR

### Good Signs:
- ✅ Tree structure matches the database state
- ✅ All 7 users are visible somewhere in the tree
- ✅ Badges are colorful and distinct
- ✅ Current user (Jim Sherlock) has animated "You" badge
- ✅ Empty groups show warning badges
- ✅ Orphaned tenants are in their own section

### Red Flags:
- ❌ Tree is empty or shows "No data available"
- ❌ Console errors about missing data
- ❌ Badges not displaying
- ❌ Expand/collapse not working
- ❌ Detail panel not updating

---

## 📸 EXPECTED VISUAL LAYOUT

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin Tree                                                       │
│ SuperUser - Full Access                                          │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Search tenants, groups, users...                             │
├─────────────────────────────────────────────────────────────────┤
│ [Expand All] [Collapse All]                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ▼ ⚠️ Orphaned Tenants (2)                                       │
│   ▶ 🏢 Demo Facility                          [0 users]         │
│   ▶ 🏢 Top of the World Ranch - totw-ranch    [0 users]         │
│                                                                  │
│ ▼ 🏢 Active Tenants (1)                                         │
│   ▼ 🏢 Top of the World Ranch                 [5 users]         │
│     ▼ 👥 Default Group                        [3]               │
│       👤 Jim Sherlock                         [SU] [YOU]        │
│       👤 Sarah Johnson                        [FA]              │
│       👤 Michael Chen                                           │
│     ▶ 👥 Morning Warriors                     [2]               │
│     ▶ 👥 Weekend Support                      [2]               │
│                                                                  │
│ ▼ 🚶 Solo Users (2)                                             │
│   👤 Jim Sherlock (jsherlock@cybercade.com)                     │
│   👤 Lisa Martinez                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 ADVANCED TESTING

### Test Different User Roles:

#### To Test as Facility Admin (Sarah Johnson):
1. You would need to log in as Sarah Johnson
2. Expected view: Only "Top of the World Ranch" tenant
3. No orphaned tenants or solo users sections
4. Can see all groups and users within the tenant

#### To Test as Group Admin (Emily Rodriguez):
1. You would need to log in as Emily Rodriguez
2. Expected view: Only "Weekend Support" group
3. No tenant-level view
4. Can see only members of Weekend Support group

### Test Edge Cases:
- [ ] Click on empty group - should show "0 members" badge
- [ ] Click on orphaned tenant - should show "0 users" badge
- [ ] Click on solo user - should show "No tenant" in detail panel
- [ ] Expand all then collapse all - should return to initial state

---

## 📊 DATABASE VERIFICATION

### Verify Data Matches Tree:

Run these queries in Supabase to verify:

```sql
-- Count users
SELECT COUNT(*) FROM user_profiles;
-- Expected: 7

-- Count users in active tenant
SELECT COUNT(*) FROM user_profiles 
WHERE tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d';
-- Expected: 5

-- Count solo users
SELECT COUNT(*) FROM user_profiles WHERE tenant_id IS NULL;
-- Expected: 2

-- Count groups in active tenant
SELECT COUNT(*) FROM groups 
WHERE tenant_id = 'a77d4b1b-7e8d-48e2-b509-b305c5615f4d';
-- Expected: 3

-- Count group memberships
SELECT COUNT(*) FROM group_memberships;
-- Expected: 7
```

---

## 🎨 VISUAL DESIGN VERIFICATION

### Badge Colors:
- **SuperUser**: Purple background, purple text, crown icon
- **Facility Admin**: Blue background, blue text, shield icon
- **Group Admin**: Green background, green text, star icon
- **Current User**: Indigo background, animated pulse dot
- **Warning**: Yellow background, yellow text, alert icon
- **Count**: Gray background, gray text

### Spacing:
- Tree nodes: 24px indent per level
- Node height: ~40px
- Badge spacing: 4px gap between badges
- Sidebar width: 384px (96 * 4)

---

## 🚀 NEXT STEPS AFTER TESTING

Once you've verified the tree is working:

1. **Provide Feedback**: What works well? What needs improvement?
2. **Request Features**: Which Phase 4 actions are most important?
3. **Report Issues**: Any bugs or unexpected behavior?

---

## 📞 SUPPORT

If you encounter issues:

1. Check browser console for errors (F12 → Console tab)
2. Verify you're logged in as Jim Sherlock (SuperUser)
3. Check that dev server is running
4. Verify database connection is working

---

**Happy Testing! 🎉**

