# Tree View Badge Reference Guide

## Quick Reference for User Node Badges

This guide explains all the badges displayed on user nodes in the Admin Tree View.

---

## Badge Categories

User nodes display two categories of badges:

1. **Information Badges** (NEW) - Show facility and group assignments
2. **Status Badges** (Existing) - Show user roles and status

---

## Information Badges

### Facility Badge

Shows which facility (tenant) the user belongs to and their role.

#### With Facility Assignment

```
┌──────────────────────────────┐
│ 🏢 Sunrise Center (ADMIN)    │
│    ↑ Icon  ↑ Name    ↑ Role  │
└──────────────────────────────┘
```

**Colors:**
- Background: Light blue (`bg-blue-50`)
- Border: Blue (`border-blue-200`)
- Icon: Blue (`text-blue-600`)
- Text: Dark blue (`text-blue-900`)
- Role: Blue (`text-blue-600`)

**Roles:**
- `OWNER` - Facility owner (highest permission)
- `ADMIN` - Facility administrator
- `MEMBER` - Regular facility member

**Example:**
```
👤 Sarah Martinez  [🏢 Hope House Recovery (OWNER)]
```

---

#### Solo User (No Facility)

```
┌──────────────┐
│ 🏢 Solo      │
│    ↑ Icon    │
└──────────────┘
```

**Colors:**
- Background: Light gray (`bg-gray-50`)
- Border: Gray (`border-gray-200`)
- Icon: Gray (`text-gray-400`)
- Text: Gray italic (`text-gray-500 italic`)

**Meaning:** User is not assigned to any facility

**Example:**
```
👤 John Doe  [🏢 Solo]
```

---

### Groups Badge

Shows how many groups the user belongs to.

#### With Group Memberships

```
┌──────────────┐
│ 👥 3 groups  │
│    ↑ Icon    │
└──────────────┘
```

**Colors:**
- Background: Light green (`bg-green-50`)
- Border: Green (`border-green-200`)
- Icon: Green (`text-green-600`)
- Text: Dark green (`text-green-900`)

**Text:**
- Singular: "1 group"
- Plural: "2 groups", "3 groups", etc.

**Example:**
```
👤 Mike Johnson  [👥 2 groups]
```

---

#### No Group Memberships

```
┌──────────────┐
│ 👥 No groups │
│    ↑ Icon    │
└──────────────┘
```

**Colors:**
- Background: Light gray (`bg-gray-50`)
- Border: Gray (`border-gray-200`)
- Icon: Gray (`text-gray-400`)
- Text: Gray italic (`text-gray-500 italic`)

**Meaning:** User is not assigned to any groups

**Example:**
```
👤 Lisa Anderson  [👥 No groups]
```

---

## Status Badges

### SuperUser Badge

```
┌──────┐
│ 🛡️ SU │
└──────┘
```

**Colors:**
- Background: Purple (`bg-purple-100`)
- Text: Purple (`text-purple-800`)

**Meaning:** User has SuperUser privileges (highest system access)

**Example:**
```
👤 Admin User  [🏢 Solo] [👥 No groups]  🛡️ SU
```

---

### Current User Badge

```
┌──────────┐
│ 👤 You   │
└──────────┘
```

**Colors:**
- Background: Blue (`bg-blue-100`)
- Text: Blue (`text-blue-800`)

**Meaning:** This is the currently logged-in user

**Example:**
```
👤 Jim Sherlock  [🏢 Top of the World (ADMIN)] [👥 1 group]  👤 You
```

---

### Group Admin Badge

```
┌──────────┐
│ 👥 GA    │
└──────────┘
```

**Colors:**
- Background: Yellow (`bg-yellow-100`)
- Text: Yellow (`text-yellow-800`)

**Meaning:** User is an admin in at least one group

**Example:**
```
👤 Team Lead  [🏢 Wellness Center (MEMBER)] [👥 2 groups]  👥 GA
```

---

## Complete Examples

### Example 1: SuperUser with Facility and Groups

```
👤 Sarah Martinez  [🏢 Sunrise Center (ADMIN)] [👥 3 groups]  🛡️ SU  👤 You
```

**Interpretation:**
- Name: Sarah Martinez
- Facility: Sunrise Center
- Role: ADMIN (facility administrator)
- Groups: Member of 3 groups
- Status: SuperUser (highest privileges)
- Current: This is you (logged-in user)

---

### Example 2: Solo SuperUser

```
👤 Global Admin  [🏢 Solo] [👥 No groups]  🛡️ SU
```

**Interpretation:**
- Name: Global Admin
- Facility: None (solo user)
- Groups: None
- Status: SuperUser (can manage all facilities)

---

### Example 3: Facility Member with Groups

```
👤 John Smith  [🏢 Hope House Recovery (MEMBER)] [👥 2 groups]
```

**Interpretation:**
- Name: John Smith
- Facility: Hope House Recovery
- Role: MEMBER (regular member)
- Groups: Member of 2 groups
- Status: None (regular user)

---

### Example 4: Facility Admin, Group Admin

```
👤 Team Lead  [🏢 Wellness Center (ADMIN)] [👥 4 groups]  👥 GA
```

**Interpretation:**
- Name: Team Lead
- Facility: Wellness Center
- Role: ADMIN (facility administrator)
- Groups: Member of 4 groups
- Status: Group Admin (admin in at least one group)

---

### Example 5: Unassigned Facility User

```
👤 New User  [🏢 Sunrise Center (MEMBER)] [👥 No groups]
```

**Interpretation:**
- Name: New User
- Facility: Sunrise Center
- Role: MEMBER
- Groups: None (needs to be assigned to groups)
- Status: None

**Action Needed:** Assign to groups

---

### Example 6: Solo User (Not in System)

```
👤 Jane Doe  [🏢 Solo] [👥 No groups]
```

**Interpretation:**
- Name: Jane Doe
- Facility: None
- Groups: None
- Status: None (completely solo)

**Action Needed:** Assign to facility or keep as solo user

---

## Badge Order

Badges always appear in this order (left to right):

1. **User Icon** - 👤
2. **User Name** - Display name
3. **Facility Badge** - 🏢 (blue or gray)
4. **Groups Badge** - 👥 (green or gray)
5. **SuperUser Badge** - 🛡️ SU (if applicable)
6. **Current User Badge** - 👤 You (if applicable)
7. **Group Admin Badge** - 👥 GA (if applicable)

---

## Color Legend

### Information Badges

| Badge Type | With Data | Without Data |
|------------|-----------|--------------|
| Facility | Blue | Gray |
| Groups | Green | Gray |

### Status Badges

| Badge Type | Color |
|------------|-------|
| SuperUser | Purple |
| Current User | Blue |
| Group Admin | Yellow |

---

## Common Patterns

### Pattern 1: New User Setup

```
Before Assignment:
👤 New User  [🏢 Solo] [👥 No groups]

After Facility Assignment:
👤 New User  [🏢 Sunrise Center (MEMBER)] [👥 No groups]

After Group Assignment:
👤 New User  [🏢 Sunrise Center (MEMBER)] [👥 2 groups]
```

---

### Pattern 2: Promotion to Admin

```
Before Promotion:
👤 John Smith  [🏢 Hope House (MEMBER)] [👥 3 groups]

After Facility Admin:
👤 John Smith  [🏢 Hope House (ADMIN)] [👥 3 groups]

After Group Admin:
👤 John Smith  [🏢 Hope House (ADMIN)] [👥 3 groups]  👥 GA
```

---

### Pattern 3: SuperUser Assignment

```
Before SuperUser:
👤 Sarah Martinez  [🏢 Sunrise (ADMIN)] [👥 2 groups]

After SuperUser:
👤 Sarah Martinez  [🏢 Sunrise (ADMIN)] [👥 2 groups]  🛡️ SU
```

---

## Troubleshooting

### "I don't see facility information"

**Possible Causes:**
1. User is a solo user (will show gray "Solo" badge)
2. Data hasn't loaded yet (refresh the page)
3. User was just created (assign to facility)

---

### "Groups count seems wrong"

**Possible Causes:**
1. User was just added/removed from groups (refresh)
2. Viewing cached data (hard refresh: Cmd+Shift+R)
3. Groups were deleted (count updates automatically)

---

### "Badge colors look different"

**Possible Causes:**
1. Browser dark mode (badges adapt to theme)
2. Custom CSS overrides (check browser extensions)
3. Different screen/monitor (color calibration)

---

## Accessibility

### Screen Readers

All badges include proper ARIA labels:

- Facility badge: "Facility: [Name], Role: [Role]"
- Groups badge: "Member of [count] groups"
- Solo badge: "Solo user, no facility"
- No groups badge: "Not assigned to any groups"

### Keyboard Navigation

- Tab through user nodes
- Enter to select user
- Arrow keys to navigate tree
- Badges are visible when node is focused

---

## Quick Tips

### Finding Users

1. **Solo Users**: Look for gray "Solo" badges
2. **Unassigned Users**: Look for gray "No groups" badges
3. **Admins**: Look for "ADMIN" or "OWNER" in facility badge
4. **SuperUsers**: Look for purple 🛡️ SU badge
5. **Group Admins**: Look for yellow 👥 GA badge

### Understanding Roles

- **OWNER**: Can do everything in facility
- **ADMIN**: Can manage users and groups
- **MEMBER**: Regular facility member
- **SuperUser**: Can manage all facilities
- **Group Admin**: Can manage specific groups

---

**Built with ❤️ by Augment Agent**

*Quick reference for understanding user badges in Tree View*

