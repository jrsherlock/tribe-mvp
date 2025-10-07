# Goals & Streaks Redesign - Visual Guide

## Quick Comparison

### Before vs After

#### Page Header
**Before:**
```
┌─────────────────────────────────────────────────┐
│ [Icon] Personal Goals              [+ Custom]   │
│        Track your progress                      │
└─────────────────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────────────┐
│ [Icon] My Goals Journey            [+ Add Goal] │
│        Build streaks, celebrate progress        │
├─────────────────────────────────────────────────┤
│ Progress Overview                               │
│ [🔥 3 Active] [🎯 2 Daily] [🌍 1 Shared]       │
└─────────────────────────────────────────────────┘
```

#### Goal Card Layout

**Before:**
```
┌──────────────────────────────────┐
│ [Icon] Morning Walk              │
│        Daily Goal          [🔒]  │
│                                  │
│ Description text here...         │
│                                  │
│ ┌──────────┐  ┌──────────┐     │
│ │ 🔥  5     │  │ 🏆  12   │     │
│ │ Current  │  │ Best     │     │
│ │ 🔥 Active!│  │          │     │
│ └──────────┘  └──────────┘     │
│                                  │
│ 📈 Total: 15 days  ●●●●●●●     │
└──────────────────────────────────┘
```

**After:**
```
┌──────────────────────────────────┐
│ Morning Walk            [✓]      │
│ Daily Goal              [🔒]     │
│                                  │
│         ╭─────────╮              │
│        │    5     │              │
│        │   Days   │              │
│         ╰─────────╯              │
│      Current Streak              │
│                                  │
│ ┌──────┐  ┌──────┐              │
│ │  12  │  │  15  │              │
│ │ Best │  │Total │              │
│ └──────┘  └──────┘              │
│                                  │
│ [✓ Completed Today]              │
└──────────────────────────────────┘
```

## Component Breakdown

### 1. Circular Progress Ring

**Visual Structure:**
```
     Outer Ring (background)
          ╭─────────╮
         │           │
        │   ╭─────╮   │
        │  │  5   │  │  ← Value
        │  │ Days │  │  ← Label
        │   ╰─────╯   │
         │           │
          ╰─────────╯
     Inner Ring (progress)
```

**Color Progression:**
- 0 days: Gray (#9CA3AF)
- 1-6 days: Teal (#2A9D90) - "Getting started"
- 7-29 days: Orange (#F4A462) - "Building momentum"
- 30+ days: Red (#E76E50) - "On fire!"

**Animation:**
- Ring fills from 0° to calculated angle over 1 second
- Value counter fades in after 0.3s delay
- Smooth easing curve for natural feel

### 2. Completion States

**Pending Goal:**
```
┌──────────────────────────────────┐
│ Goal Title                       │
│ Daily Goal              [🔒]     │
│                                  │
│         ╭─────────╮              │
│        │    0     │              │
│        │   Days   │              │
│         ╰─────────╯              │
│    Start Your Streak             │
│                                  │
│ [○ Mark Complete]                │
└──────────────────────────────────┘
```

**Completed Goal:**
```
┌══════════════════════════════════┐ ← Accent border
║ Goal Title            [✓]        ║ ← Checkmark badge
║ Daily Goal              [🔒]     ║
║                                  ║
║         ╭─────────╮              ║
║        │    5     │              ║
║        │   Days   │              ║
║         ╰─────────╯              ║
║      Current Streak              ║
║                                  ║
║ [✓ Completed Today]              ║ ← Disabled state
└══════════════════════════════════┘
   Subtle gradient background
```

### 3. Progress Overview Card

```
┌─────────────────────────────────────────────────┐
│ [📈] Your Progress Overview                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  🔥      │  │  🎯      │  │  🏆      │     │
│  │   3      │  │   2      │  │   1      │     │
│  │ Active   │  │  Daily   │  │ Shared   │     │
│  │ Goals    │  │  Goals   │  │  Goals   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. Confetti Animation

**Milestone Achievement Flow:**
```
1. User clicks "Log Progress"
   ↓
2. System detects milestone (e.g., 7 days)
   ↓
3. Confetti particles spawn at top
   ↓
4. Particles fall with rotation
   ↓
5. Toast appears: "🎉 Amazing! 7 day streak!"
   ↓
6. Particles fade out after 3 seconds
```

**Particle Properties:**
- Count: 60-80 particles
- Colors: Theme palette (teal, orange, red, gold, purple)
- Shapes: Mix of circles and squares
- Size: 4-12px random
- Velocity: Random horizontal drift, consistent fall
- Rotation: 0-720° during fall
- Duration: 3 seconds

### 5. Template Integration

**Before (Collapsed):**
```
┌─────────────────────────────────────────────────┐
│ [✨] Goal Templates                    [▼]      │
└─────────────────────────────────────────────────┘
```

**After (Always Visible):**
```
┌─────────────────────────────────────────────────┐
│ [✨] Add More Goals                              │
├─────────────────────────────────────────────────┤
│ [✨] Goal Templates                    [▼]      │
│                                                 │
│ [All] [Wellness] [Social] [Spiritual]          │
│                                                 │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│ │[Icon]    │  │[Icon]    │  │[Icon]    │      │
│ │Morning   │  │Attend AA │  │Gratitude │      │
│ │Walk      │  │Meeting   │  │Journal   │      │
│ │[+ Add]   │  │[+ Add]   │  │[+ Add]   │      │
│ └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

## Interaction Patterns

### 1. Card Click Flow
```
User clicks card
    ↓
Card scales up (1.02x) and lifts (-4px)
    ↓
Detail modal opens with spring animation
    ↓
User can log progress, edit, or delete
```

### 2. Progress Logging Flow
```
User clicks "Log Progress" in modal
    ↓
Loading state shows spinner
    ↓
API call completes
    ↓
Check if milestone reached
    ↓
YES: Trigger confetti + special toast
NO: Standard success toast
    ↓
Refresh streak data
    ↓
Update UI with new values
    ↓
Progress ring animates to new value
```

### 3. Empty State Flow
```
New user arrives
    ↓
Sees empty state message
    ↓
Templates section visible below
    ↓
User clicks template or "Add Goal"
    ↓
Modal opens with pre-filled data (if template)
    ↓
User creates goal
    ↓
First goal card appears with animation
    ↓
Progress overview appears
```

## Responsive Behavior

### Desktop (lg: 1024px+)
```
┌─────────────────────────────────────────────────┐
│ Header                                          │
├─────────────────────────────────────────────────┤
│ Progress Overview                               │
├─────────────────────────────────────────────────┤
│ Your Active Goals                               │
│ ┌──────┐  ┌──────┐  ┌──────┐                  │
│ │Goal 1│  │Goal 2│  │Goal 3│                  │
│ └──────┘  └──────┘  └──────┘                  │
├─────────────────────────────────────────────────┤
│ Add More Goals                                  │
│ Templates...                                    │
└─────────────────────────────────────────────────┘
```

### Tablet (md: 768px)
```
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│ Progress Overview                   │
├─────────────────────────────────────┤
│ Your Active Goals                   │
│ ┌──────┐  ┌──────┐                 │
│ │Goal 1│  │Goal 2│                 │
│ └──────┘  └──────┘                 │
│ ┌──────┐                            │
│ │Goal 3│                            │
│ └──────┘                            │
├─────────────────────────────────────┤
│ Add More Goals                      │
│ Templates...                        │
└─────────────────────────────────────┘
```

### Mobile (sm: 640px)
```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ Progress Overview   │
├─────────────────────┤
│ Your Active Goals   │
│ ┌─────────────────┐ │
│ │    Goal 1       │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │    Goal 2       │ │
│ └─────────────────┘ │
├─────────────────────┤
│ Add More Goals      │
│ Templates...        │
└─────────────────────┘
```

## Animation Timing

### Card Entrance
- **Stagger**: 0.1s per card
- **Duration**: 0.2s
- **Easing**: ease-out
- **Transform**: translateY(20px) → translateY(0)
- **Opacity**: 0 → 1

### Progress Ring
- **Duration**: 1s
- **Easing**: easeInOut
- **Delay**: 0s (starts immediately)
- **Value Counter Delay**: 0.3s

### Completion Badge
- **Type**: Spring animation
- **Delay**: 0.2s
- **Transform**: scale(0) rotate(-180deg) → scale(1) rotate(0)

### Confetti
- **Spawn**: Instant
- **Fall Duration**: 3s
- **Fade Start**: 2.1s (70% through)
- **Rotation**: Continuous during fall

## Color Palette

### Progress States
```
Not Started:    #9CA3AF  (gray-400)
Getting Started: #2A9D90  (accent-500)
Building:       #F4A462  (accent-400)
On Fire:        #E76E50  (accent-600)
```

### UI Elements
```
Background:     #FFFFFF  (white)
Border Default: #E5E7EB  (primary-200)
Border Active:  #F4A462  (accent-400)
Text Primary:   #264653  (primary-800)
Text Secondary: #6B7280  (primary-600)
```

### Confetti Colors
```
#2A9D90  (Teal)
#F4A462  (Orange)
#E76E50  (Red)
#264653  (Navy)
#F1C40F  (Gold)
#9B59B6  (Purple)
```

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Focus visible on all elements

### Screen Reader Support
- Progress ring: "Progress: 5 out of 30 days"
- Completion state: "Goal completed today"
- Milestone: "Congratulations! 7 day streak achieved"
- Empty state: "No goals yet. Create your first goal to get started"

### Color Contrast
- All text meets WCAG AA (4.5:1 minimum)
- Interactive elements have clear focus indicators
- Icons paired with text labels
- Status conveyed through multiple visual cues (not just color)

## Performance Metrics

### Target Performance
- First Paint: < 100ms
- Card Animation: 60fps
- Progress Ring: 60fps
- Confetti: 60fps (80 particles)
- Modal Open: < 200ms

### Optimization Techniques
- CSS transforms (GPU accelerated)
- Framer Motion (optimized React animations)
- Conditional rendering
- Memoized calculations
- Lazy particle generation

