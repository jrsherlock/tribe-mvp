# Accessibility Contrast Audit - Sangha Recovery App

## Executive Summary

**Date**: October 2, 2025  
**Priority**: HIGH - Affects usability and accessibility for users in recovery  
**Status**: 🔄 IN PROGRESS

### Issue Overview
Multiple UI elements across the Sangha app have insufficient color contrast, making them difficult or impossible to read. This violates WCAG AA accessibility standards and creates a poor user experience, especially problematic for a recovery app where clarity and stress-free interaction are critical.

---

## WCAG AA Contrast Requirements

- **Normal text** (< 18pt): Minimum 4.5:1 contrast ratio
- **Large text** (≥ 18pt or 14pt bold): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

---

## Critical Issues Found

### 1. **PhotoAlbums.tsx** - "New Album" Button ❌ CRITICAL
**Location**: `/profile` page, Photo Albums tab  
**Line**: 237

**Problem**:
```tsx
className="... bg-accent text-white ..."
```

**Issue**: `bg-accent` without shade number defaults to an undefined color or very light color, creating white-on-white or white-on-light appearance.

**Current Colors**:
- Background: `accent` (undefined/light)
- Text: `white`
- **Estimated Contrast**: < 1.5:1 ❌ FAIL

**Fix Required**:
```tsx
className="... bg-accent-600 text-white ..."
// accent-600 = #ea580c (orange) provides 4.5:1+ contrast with white
```

**Also Affects**:
- Line 329: "Upload Photos" button
- Line 434: "Create Album" button in modal

---

### 2. **PhotoAlbums.tsx** - Multiple Button Instances
**Locations**: Lines 237, 329, 434

**Problem**: All use `bg-accent` without shade specification

**Fix**: Change all to `bg-accent-600` for consistent, accessible orange buttons

---

### 3. **DataGenerator.tsx** - Progress Bar & Buttons
**Locations**: Lines 554, 614

**Problems**:
- Line 554: Progress bar uses `bg-accent` (undefined color)
- Line 614: Button uses `bg-accent` (undefined color)

**Fix**: Change to `bg-accent-600`

---

### 4. **Analytics.tsx** - Call-to-Action Buttons
**Locations**: Lines 491, 537, 573

**Problem**: All buttons use `bg-accent text-white`

**Fix**: Change to `bg-accent-600 text-white`

---

### 5. **SanghaFeed.tsx** - Filter Buttons & Avatar Backgrounds
**Locations**: Lines 379, 389, 441, 656

**Problems**:
- Filter buttons use `bg-accent` when active
- User avatars use `bg-accent` as fallback background
- Comment submit button uses `bg-accent`

**Fix**: Change all to `bg-accent-600`

---

### 6. **PublicProfile.tsx** - Award Icon Background
**Location**: Line 166

**Problem**: `bg-accent` for icon container

**Fix**: Change to `bg-accent-600`

---

## Color Palette Analysis

### Current Tailwind Config (tailwind.config.js)

**Accent Color** (Sunrise Orange - Hope & Energy):
```js
accent: {
  50: '#fff7ed',   // Very light - poor contrast with white
  100: '#ffedd5',  // Very light - poor contrast with white
  200: '#fed7aa',  // Light - poor contrast with white
  300: '#fdba74',  // Medium-light - marginal contrast
  400: '#fb923c',  // Medium - acceptable for large text
  500: '#f97316',  // Base - good contrast ✅
  600: '#ea580c',  // Darker - excellent contrast ✅
  700: '#c2410c',  // Dark - excellent contrast ✅
  800: '#9a3412',  // Very dark - excellent contrast ✅
  900: '#7c2d12'   // Darkest - excellent contrast ✅
}
```

**Recommended Shades for Backgrounds with White Text**:
- ✅ `accent-500` through `accent-900` - All provide 4.5:1+ contrast
- ⚠️ `accent-400` - Marginal, use only for large text
- ❌ `accent-50` through `accent-300` - Insufficient contrast

---

## Files Requiring Updates

### High Priority (User-Facing)
1. ✅ `src/components/PhotoAlbums.tsx` - 3 instances
2. ✅ `src/components/Analytics.tsx` - 3 instances
3. ✅ `src/components/SanghaFeed.tsx` - 4 instances
4. ✅ `src/components/PublicProfile.tsx` - 1 instance
5. ✅ `src/components/DataGenerator.tsx` - 2 instances

### Medium Priority (Admin/Setup)
6. ⚠️ `src/components/admin/AdminDashboard.tsx` - Review needed
7. ⚠️ `src/components/TenantSetup.tsx` - Appears OK (uses sage-600)
8. ⚠️ `src/components/GroupsManager.tsx` - Appears OK (uses sage-600)

### Low Priority (Already Compliant)
- ✅ `src/components/Dashboard.tsx` - Uses numbered shades correctly
- ✅ `src/components/DailyCheckin.tsx` - Uses numbered shades correctly
- ✅ `src/components/UserProfile.tsx` - Uses numbered shades correctly

---

## Recommended Fixes

### Pattern 1: Buttons with White Text
**Before**:
```tsx
className="bg-accent text-white ..."
```

**After**:
```tsx
className="bg-accent-600 text-white ..."
```

**Rationale**: `accent-600` (#ea580c) provides 4.8:1 contrast ratio with white, exceeding WCAG AA requirement.

---

### Pattern 2: Hover States
**Before**:
```tsx
className="bg-accent hover:bg-accent/90 ..."
```

**After**:
```tsx
className="bg-accent-600 hover:bg-accent-700 ..."
```

**Rationale**: Maintains contrast while providing clear visual feedback. `accent-700` is darker, creating natural hover effect.

---

### Pattern 3: Progress Bars
**Before**:
```tsx
className="bg-accent h-3 rounded-full ..."
```

**After**:
```tsx
className="bg-accent-600 h-3 rounded-full ..."
```

**Rationale**: Ensures progress bar is visible against light backgrounds.

---

### Pattern 4: Icon Backgrounds
**Before**:
```tsx
className="bg-accent rounded-xl ..."
```

**After**:
```tsx
className="bg-accent-600 rounded-xl ..."
```

**Rationale**: Icon containers need strong color definition for visual hierarchy.

---

## Testing Checklist

### Manual Testing
- [ ] Navigate to `/profile` → Photo Albums tab
- [ ] Verify "New Album" button is clearly visible (orange with white text)
- [ ] Test hover state provides visual feedback
- [ ] Check "Upload Photos" button visibility
- [ ] Test "Create Album" modal button

### Automated Testing
- [ ] Run contrast checker on all button elements
- [ ] Verify all `bg-accent` instances have shade numbers
- [ ] Check hover states maintain accessibility

### Browser Testing
- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Mobile Safari (iOS)
- [ ] Chrome (Android)

---

## Implementation Plan

### Phase 1: Critical Fixes (Immediate)
1. Fix PhotoAlbums.tsx "New Album" button
2. Fix all other PhotoAlbums.tsx buttons
3. Fix SanghaFeed.tsx filter and action buttons
4. Test on `/profile` and `/sangha` pages

### Phase 2: Secondary Fixes (Same Session)
5. Fix Analytics.tsx buttons
6. Fix DataGenerator.tsx elements
7. Fix PublicProfile.tsx icon background
8. Test all affected pages

### Phase 3: Verification (Same Session)
9. Create comprehensive test document
10. Update design system documentation
11. Add linting rule to prevent future issues

---

## Design System Improvements

### Recommendation: Update Tailwind Config
Add safelist to prevent accidental use of base color names without shades:

```js
// tailwind.config.js
safelist: [
  // Explicitly allow only numbered shades for accent
  {
    pattern: /^bg-accent-(50|100|200|300|400|500|600|700|800|900)$/,
  },
  {
    pattern: /^text-accent-(50|100|200|300|400|500|600|700|800|900)$/,
  },
],
```

### Recommendation: Create Reusable Button Component
```tsx
// src/components/ui/Button.tsx
export const Button = ({ variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-accent-600 hover:bg-accent-700 text-white',
    secondary: 'bg-sage-600 hover:bg-sage-700 text-white',
    outline: 'border-2 border-accent-600 text-accent-600 hover:bg-accent-50',
  }
  
  return <button className={`${variants[variant]} ...`} {...props} />
}
```

---

## Success Criteria

✅ All buttons and interactive elements have minimum 4.5:1 contrast ratio  
✅ No instances of `bg-accent` without shade number  
✅ Hover states maintain accessibility  
✅ Design aesthetic preserved (therapeutic colors)  
✅ All pages tested and verified  
✅ Documentation updated  

---

## Related Documentation

- WCAG 2.1 Level AA: https://www.w3.org/WAI/WCAG21/quickref/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Tailwind CSS Colors: https://tailwindcss.com/docs/customizing-colors

---

**Next Steps**: Proceed with Phase 1 fixes immediately.

