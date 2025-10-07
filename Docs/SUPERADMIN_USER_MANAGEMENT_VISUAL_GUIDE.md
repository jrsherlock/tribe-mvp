# SuperAdmin User Management - Visual Guide

## Interface Overview

### 1. View Toggle (Top of Admin Interface)

```
┌────────────────────────────────────────────────────────────────┐
│  Admin Management                                              │
│  SuperUser - Full Access                                       │
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  🏢 Tree View    │  │  👥 All Users    │                  │
│  │  (Active)        │  │                  │                  │
│  └──────────────────┘  └──────────────────┘                  │
└────────────────────────────────────────────────────────────────┘
```

---

### 2. All Users View - Full Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  All Users                                          [🔄 Refresh] [📥 Export CSV] │
│  ──────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  🔍 Search: [Type name or email...]                                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📊 SUMMARY CARDS                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│   │
│  │  │   💙 156     │  │   💚 142     │  │   🧡 14      │  │   💜 3       ││   │
│  │  │   Total      │  │   Facility   │  │   Solo       │  │   SuperUser  ││   │
│  │  │   Users      │  │   Users      │  │   Users      │  │   Admins     ││   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 FILTERS                                                             │   │
│  │  Role: [All Roles ▼]  Facility: [All Facilities ▼]  Group: [All ▼]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────┬────────────────────────────────────┐  │
│  │  📋 USER TABLE                      │  👤 USER DETAILS                   │  │
│  │  ─────────────────────────────────  │  ────────────────────────────────  │  │
│  │                                     │                                    │  │
│  │  Name      Email      Role  Fac.   │   [S] Sarah Martinez               │  │
│  │  ────────  ─────────  ────  ─────  │   📧 sarah@example.com             │  │
│  │  [S] Sarah sarah@...  Super  -     │◄──┤   🛡️ SuperUser                  │  │
│  │  John D    john@...   Solo   -     │   │                                │  │
│  │  Mike J    mike@...   Admin  Sun   │   │   [🏢 Change Facility]         │  │
│  │  Lisa K    lisa@...   Member Hope  │   │   [👥 Manage Groups]           │  │
│  │  Tom R     tom@...    Member Sun   │   │   [🛡️ Revoke SuperUser]        │  │
│  │                                     │   │                                │  │
│  │  ← Prev  Page 1/8  Next →          │   │   ┌──────────────────────┐    │  │
│  │                                     │   │   │ 🏢 Facility          │    │  │
│  │                                     │   │   │ Solo User            │    │  │
│  │                                     │   │   └──────────────────────┘    │  │
│  │                                     │   │                                │  │
│  │                                     │   │   ┌──────────────────────┐    │  │
│  │                                     │   │   │ 👥 Groups            │    │  │
│  │                                     │   │   │ No groups            │    │  │
│  │                                     │   │   └──────────────────────┘    │  │
│  │                                     │   │                                │  │
│  │                                     │   │   ┌──────────────────────┐    │  │
│  │                                     │   │   │ 📅 Account Info      │    │  │
│  │                                     │   │   │ Created: Jan 15      │    │  │
│  │                                     │   │   │ Last Login: Today    │    │  │
│  │                                     │   │   └──────────────────────┘    │  │
│  └─────────────────────────────────────┴────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Assign to Facility Modal

```
┌────────────────────────────────────────────────────────┐
│  🏢 Assign to Facility                            [✕]  │
│  Sarah Martinez (sarah@example.com)                    │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  🏢 Currently Assigned                           │ │
│  │  Sunrise Center (MEMBER)                         │ │
│  │  👥 Member of 2 groups                           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ⚠️  WARNING                                           │
│  Moving this user to a different facility will         │
│  remove them from all 2 groups in Sunrise Center.     │
│                                                        │
│  Select Facility:                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Hope House Recovery Center              ▼      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Role in Facility:                                     │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │   Member     │  │   Admin      │                  │
│  │  (Selected)  │  │              │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                        │
│  ──────────────────────────────────────────────────    │
│  [Remove from Facility]      [Cancel] [Update]        │
└────────────────────────────────────────────────────────┘
```

---

### 4. Toggle SuperUser Modal

```
┌────────────────────────────────────────────────────────┐
│  🛡️ Grant SuperUser                               [✕]  │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  User                                            │ │
│  │  Sarah Martinez                                  │ │
│  │  sarah@example.com                               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ⚠️  Granting SuperUser Access                   │ │
│  │                                                  │ │
│  │  This user will gain access to:                 │ │
│  │  • All facilities and users (global view)       │ │
│  │  • Ability to create/delete facilities          │ │
│  │  • Ability to manage any user                   │ │
│  │  • All SuperUser features                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ☐ I understand the implications and want to          │
│    grant SuperUser access for Sarah Martinez          │
│                                                        │
│  ──────────────────────────────────────────────────    │
│                          [Cancel] [Grant SuperUser]    │
└────────────────────────────────────────────────────────┘
```

---

### 5. Summary Cards - Detailed View

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ 💙 BLUE        │  │ 💚 GREEN       │  │ 🧡 ORANGE      │        │
│  │ GRADIENT       │  │ GRADIENT       │  │ GRADIENT       │        │
│  │                │  │                │  │                │        │
│  │  👥 Total      │  │  🏢 Facilities │  │  🏠 Solo       │        │
│  │                │  │                │  │                │        │
│  │     156        │  │     142        │  │      14        │        │
│  │  total users   │  │  in facilities │  │  solo users    │        │
│  │                │  │                │  │                │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│  ┌────────────────┐                                                 │
│  │ 💜 PURPLE      │                                                 │
│  │ GRADIENT       │                                                 │
│  │                │                                                 │
│  │  🛡️ Admins     │                                                 │
│  │                │                                                 │
│  │       3        │                                                 │
│  │  superusers    │                                                 │
│  │                │                                                 │
│  └────────────────┘                                                 │
│                                                                      │
│  ✨ Features:                                                       │
│  • Animated number count-up on load                                │
│  • Spring animation entrance                                       │
│  • Hover shadow effect                                             │
│  • Shows filtered count when filters active                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 6. User Table - Column Details

```
┌──────────────────────────────────────────────────────────────────┐
│  Name ↑        Email           Role        Facility    Groups    │
│  ────────────  ──────────────  ──────────  ─────────  ─────────  │
│                                                                  │
│  [S] Sarah M   sarah@ex.com    SuperUser   -          -         │
│  ↑ Avatar      ↑ Email         ↑ Badge     ↑ Italic   ↑ Count  │
│  ↑ SuperUser                                "Solo"              │
│     Badge                                                        │
│                                                                  │
│  John D        john@ex.com     Solo User   -          -         │
│  ↑ No badge    ↑ Email         ↑ Gray      ↑ Italic   ↑ Italic │
│                                  badge      "Solo"     "No"     │
│                                                                  │
│  Mike J        mike@ex.com     Facility    Sunrise    2 groups  │
│  ↑ No badge    ↑ Email         Admin       Center     ↑ Count  │
│                                ↑ Blue       ↑ Name              │
│                                  badge      ↑ Role              │
│                                             (ADMIN)             │
│                                                                  │
│  ✨ Features:                                                   │
│  • Click column header to sort                                  │
│  • Click row to select (highlights blue)                        │
│  • Avatar shows first letter of name                            │
│  • SuperUser badge (🛡️) for SuperUsers                         │
│  • Color-coded role badges                                      │
│  • Facility shows name + role                                   │
│  • Groups shows count                                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 7. User Detail Panel - Full View

```
┌────────────────────────────────────────────────────────┐
│  👤 USER DETAILS                                       │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  ┌────┐                                               │
│  │ SM │  Sarah Martinez  🛡️                          │
│  └────┘  📧 sarah@example.com                         │
│  Avatar  SuperUser                                     │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ 🏢 Change    │  │ 👥 Manage    │  │ 🛡️ Revoke    ││
│  │   Facility   │  │   Groups     │  │   SuperUser  ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  🏢 Facility Assignment                          │ │
│  │  ──────────────────────────────────────────────  │ │
│  │  Facility: Sunrise Center                        │ │
│  │  Role: MEMBER                                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  👥 Group Memberships                            │ │
│  │  ──────────────────────────────────────────────  │ │
│  │  Recovery Group A          MEMBER                │ │
│  │  Support Circle            ADMIN                 │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  👤 Account Information                          │ │
│  │  ──────────────────────────────────────────────  │ │
│  │  📅 Created: Jan 15, 2025 10:30 AM              │ │
│  │  🕐 Last Sign In: Today 2:45 PM                 │ │
│  │  🛡️ SuperUser: Yes                              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Quick Stats                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐            │ │
│  │  │      2       │  │      1       │            │ │
│  │  │   Groups     │  │   Facility   │            │ │
│  │  └──────────────┘  └──────────────┘            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### 8. Filter States

```
┌────────────────────────────────────────────────────────┐
│  🔍 FILTERS                                            │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Role:                                                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │  All Roles                                    ▼  │ │
│  │  ────────────────────────────────────────────    │ │
│  │  All Roles                                       │ │
│  │  SuperUser                                       │ │
│  │  Facility Admin                                  │ │
│  │  Basic User                                      │ │
│  │  Solo User                                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Facility:                                             │
│  ┌──────────────────────────────────────────────────┐ │
│  │  All Facilities                               ▼  │ │
│  │  ────────────────────────────────────────────    │ │
│  │  All Facilities                                  │ │
│  │  Solo Users (No Facility)                        │ │
│  │  ────────────────────────────────────────────    │ │
│  │  Sunrise Center                                  │ │
│  │  Hope House Recovery                             │ │
│  │  Healing Path Wellness                           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Group:                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │  All Groups                                   ▼  │ │
│  │  ────────────────────────────────────────────    │ │
│  │  All Groups                                      │ │
│  │  No Groups                                       │ │
│  │  ────────────────────────────────────────────    │ │
│  │  Recovery Group A                                │ │
│  │  Support Circle                                  │ │
│  │  Wellness Warriors                               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Color Palette

### Summary Cards
- **Total Users**: Blue gradient (`from-blue-500 to-indigo-400`)
- **Facility Users**: Green gradient (`from-green-500 to-teal-400`)
- **Solo Users**: Orange gradient (`from-orange-500 to-amber-400`)
- **SuperUsers**: Purple gradient (`from-purple-500 to-pink-400`)

### Role Badges
- **SuperUser**: Purple (`bg-purple-100 text-purple-800`)
- **Facility Admin**: Blue (`bg-blue-100 text-blue-800`)
- **Basic User**: Green (`bg-green-100 text-green-800`)
- **Solo User**: Gray (`bg-gray-100 text-gray-800`)

### Action Buttons
- **Primary**: Blue (`bg-blue-600 hover:bg-blue-700`)
- **Secondary**: Purple (`bg-purple-600 hover:bg-purple-700`)
- **Warning**: Yellow (`bg-yellow-600 hover:bg-yellow-700`)
- **Danger**: Red (`bg-red-600 hover:bg-red-700`)

---

**Built with ❤️ by Augment Agent**

