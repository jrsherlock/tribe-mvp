# Activity Streaks - Testing Checklist

## 🎯 Overview
This checklist helps verify that the Daily Engagement Streak and Daily Check-In Streak features are working correctly.

---

## ✅ Database Testing

### Table Creation
- [ ] Verify `daily_user_activity` table exists in Supabase
- [ ] Check table has correct columns: `id`, `user_id`, `activity_date`, `was_active`, `completed_check_in`, `created_at`, `updated_at`
- [ ] Verify UNIQUE constraint on (user_id, activity_date)
- [ ] Check indexes are created: `idx_daily_user_activity_user_id`, `idx_daily_user_activity_date`, `idx_daily_user_activity_user_date`

### RLS Policies
- [ ] Verify RLS is enabled on `daily_user_activity` table
- [ ] Test that users can only see their own activity records
- [ ] Test that users cannot see other users' activity records
- [ ] Verify policy name: "Allow users to manage their own activity"

### RPC Functions
- [ ] Verify `record_user_activity()` function exists
- [ ] Verify `record_check_in_activity()` function exists
- [ ] Verify `get_user_streaks()` function exists
- [ ] Check that all functions have EXECUTE permission for authenticated users

---

## ✅ Backend Function Testing

### record_user_activity()
- [ ] Call function manually via Supabase SQL Editor
- [ ] Verify record is created in `daily_user_activity` table
- [ ] Call function again on same day - verify no duplicate record (UPSERT)
- [ ] Verify `was_active` is set to TRUE
- [ ] Verify `updated_at` is updated on subsequent calls

### record_check_in_activity()
- [ ] Call function manually via Supabase SQL Editor
- [ ] Verify record is created in `daily_user_activity` table
- [ ] Call function again on same day - verify no duplicate record (UPSERT)
- [ ] Verify `completed_check_in` is set to TRUE
- [ ] Verify `updated_at` is updated on subsequent calls

### get_user_streaks()
- [ ] Call function with no activity records - verify returns `{"engagement_streak": 0, "check_in_streak": 0}`
- [ ] Create activity record for today - verify returns `{"engagement_streak": 1, "check_in_streak": 0}`
- [ ] Create check-in record for today - verify returns `{"engagement_streak": 1, "check_in_streak": 1}`
- [ ] Create consecutive day records - verify streak counts correctly
- [ ] Create records with gaps - verify streak resets correctly

---

## ✅ Frontend Hook Testing

### useUserStreaks Hook
- [ ] Verify hook fetches streaks on mount
- [ ] Check `isLoading` is TRUE initially, then FALSE after fetch
- [ ] Verify `streaks` object has correct shape: `{ engagement_streak: number, check_in_streak: number }`
- [ ] Test `recordActivity()` function - verify it calls RPC and refetches
- [ ] Test `recordCheckIn()` function - verify it calls RPC and refetches
- [ ] Test `refetch()` function - verify it fetches latest data
- [ ] Test error handling - verify `error` state is set on failure

---

## ✅ App.tsx Integration Testing

### Engagement Tracking on App Load
- [ ] Open the app in browser
- [ ] Check browser console for any errors
- [ ] Verify `record_user_activity()` is called automatically
- [ ] Check Supabase database - verify activity record is created for today
- [ ] Refresh the page - verify no duplicate records (UPSERT works)
- [ ] Log out and log back in - verify activity is recorded again

---

## ✅ DailyCheckin.tsx Integration Testing

### Check-In Tracking on Submission
- [ ] Navigate to Check-in page (/checkin)
- [ ] Fill out a MEPSS check-in
- [ ] Submit the check-in
- [ ] Verify `record_check_in_activity()` is called after successful submission
- [ ] Check Supabase database - verify `completed_check_in` is TRUE for today
- [ ] Submit another check-in on same day - verify no duplicate records

---

## ✅ Dashboard Visual Testing

### Streak Cards Display
- [ ] Navigate to Dashboard (/)
- [ ] Verify 4 KPI cards are displayed in correct order:
  1. Days Sober (purple)
  2. Today's Check-in Status (green/yellow)
  3. **Engagement Streak (orange)** - NEW
  4. **Check-In Streak (teal)** - NEW

### Engagement Streak Card
- [ ] Verify card has orange gradient background (`from-orange-500 to-orange-600`)
- [ ] Verify Flame icon is displayed
- [ ] Verify label says "STREAK"
- [ ] Verify streak count is displayed (e.g., "1")
- [ ] Verify text says "day visiting" (singular) or "days visiting" (plural)
- [ ] Test hover effect - card should lift and change gradient
- [ ] Verify loading state shows "..." while fetching

### Check-In Streak Card
- [ ] Verify card has teal gradient background (`from-teal-500 to-teal-600`)
- [ ] Verify CheckCircle icon is displayed
- [ ] Verify label says "CHECK-INS"
- [ ] Verify streak count is displayed (e.g., "0")
- [ ] Verify text says "day consistent" (singular) or "days consistent" (plural)
- [ ] Test hover effect - card should lift and change gradient
- [ ] Verify loading state shows "..." while fetching

### Responsive Design
- [ ] Test on desktop (1920x1080) - verify 4 cards in a row
- [ ] Test on tablet (768x1024) - verify 2 cards per row
- [ ] Test on mobile (375x667) - verify 1 card per row
- [ ] Verify cards maintain proper spacing and alignment
- [ ] Verify text is readable at all screen sizes

---

## ✅ Streak Calculation Testing

### Engagement Streak
- [ ] **Day 1**: Log in - verify streak shows "1 day visiting"
- [ ] **Day 2**: Log in - verify streak shows "2 days visiting"
- [ ] **Day 3**: Log in - verify streak shows "3 days visiting"
- [ ] **Day 5** (skip Day 4): Log in - verify streak resets to "1 day visiting"

### Check-In Streak
- [ ] **Day 1**: Complete check-in - verify streak shows "1 day consistent"
- [ ] **Day 2**: Complete check-in - verify streak shows "2 days consistent"
- [ ] **Day 3**: Complete check-in - verify streak shows "3 days consistent"
- [ ] **Day 5** (skip Day 4): Complete check-in - verify streak resets to "1 day consistent"

### Combined Testing
- [ ] Complete check-in on Day 1 - verify both streaks are "1"
- [ ] Visit app on Day 2 but don't check in - verify engagement is "2", check-in is "1"
- [ ] Complete check-in on Day 2 - verify both streaks are "2"

---

## ✅ Edge Case Testing

### New User
- [ ] Create a new user account
- [ ] Verify both streaks show "0 days"
- [ ] Log in - verify engagement streak shows "1 day visiting"
- [ ] Complete check-in - verify check-in streak shows "1 day consistent"

### User with No Activity
- [ ] Find user with no activity records
- [ ] Verify both streaks show "0 days"
- [ ] Verify no errors in console

### Multiple Logins Same Day
- [ ] Log in to app
- [ ] Log out
- [ ] Log in again
- [ ] Verify streak count doesn't change (still "1 day")
- [ ] Verify no duplicate records in database

### Multiple Check-Ins Same Day
- [ ] Complete a check-in
- [ ] Update the check-in
- [ ] Verify streak count doesn't change (still "1 day")
- [ ] Verify no duplicate records in database

---

## ✅ Performance Testing

### Load Time
- [ ] Measure time to fetch streaks on Dashboard load
- [ ] Verify streaks load within 500ms
- [ ] Check for any slow queries in Supabase logs

### Database Queries
- [ ] Verify queries use indexes (check Supabase query plan)
- [ ] Verify no full table scans
- [ ] Check query execution time in Supabase logs

### Network Requests
- [ ] Open browser DevTools Network tab
- [ ] Verify `get_user_streaks` RPC call is made
- [ ] Verify response is JSON with correct structure
- [ ] Verify no unnecessary duplicate requests

---

## ✅ Error Handling Testing

### Network Errors
- [ ] Disconnect from internet
- [ ] Refresh Dashboard
- [ ] Verify streaks show "0" (fallback)
- [ ] Verify error is logged to console
- [ ] Reconnect - verify streaks load correctly

### Database Errors
- [ ] Temporarily disable RPC function in Supabase
- [ ] Refresh Dashboard
- [ ] Verify error is handled gracefully
- [ ] Verify app doesn't crash
- [ ] Re-enable function - verify recovery

### Authentication Errors
- [ ] Log out of app
- [ ] Verify streaks are not displayed (user not authenticated)
- [ ] Log back in - verify streaks load correctly

---

## ✅ Accessibility Testing

### Keyboard Navigation
- [ ] Tab through Dashboard cards
- [ ] Verify streak cards are focusable
- [ ] Verify focus indicators are visible

### Screen Reader
- [ ] Use screen reader (VoiceOver, NVDA, JAWS)
- [ ] Verify streak cards are announced correctly
- [ ] Verify streak counts are read aloud
- [ ] Verify labels are descriptive

### Color Contrast
- [ ] Verify text on orange card meets WCAG AA standards
- [ ] Verify text on teal card meets WCAG AA standards
- [ ] Test with color blindness simulator

---

## ✅ Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome - verify all features work
- [ ] Firefox - verify all features work
- [ ] Safari - verify all features work
- [ ] Edge - verify all features work

### Mobile Browsers
- [ ] iOS Safari - verify all features work
- [ ] Android Chrome - verify all features work

---

## 🐛 Known Issues / Notes

### Issues Found
- [ ] List any issues discovered during testing
- [ ] Include steps to reproduce
- [ ] Note severity (critical, major, minor)

### Notes
- [ ] Any observations or recommendations
- [ ] Performance metrics
- [ ] User feedback

---

## ✅ Final Checklist

- [ ] All database tests passed
- [ ] All backend function tests passed
- [ ] All frontend hook tests passed
- [ ] All integration tests passed
- [ ] All visual tests passed
- [ ] All streak calculation tests passed
- [ ] All edge case tests passed
- [ ] All performance tests passed
- [ ] All error handling tests passed
- [ ] All accessibility tests passed
- [ ] All cross-browser tests passed
- [ ] Documentation is complete and accurate
- [ ] Code is committed to version control
- [ ] Ready for production deployment

---

## 📝 Test Results Summary

**Date Tested**: _________________

**Tested By**: _________________

**Overall Status**: ⬜ Pass  ⬜ Fail  ⬜ Needs Review

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Sign-off**: _________________

