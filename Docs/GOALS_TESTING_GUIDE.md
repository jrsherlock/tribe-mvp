# Personal Goals Feature - Testing Guide

## Quick Start Testing

### 1. Apply Database Migration

First, you need to apply the database migration to create the necessary tables and functions.

#### Option A: Using Supabase CLI (Local Development)
```bash
# If you have Supabase running locally
supabase migration up
```

#### Option B: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251007000004_create_goals_tables.sql`
4. Paste and run the SQL

#### Option C: Using Direct Database Connection
```bash
# Connect to your dev database
psql <your-dev-database-url>

# Run the migration file
\i supabase/migrations/20251007000004_create_goals_tables.sql
```

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Navigate to Goals Tab

1. Open your browser to `http://localhost:5173`
2. Log in with your test account
3. Navigate to **Profile** (user icon in navigation)
4. Click the **Goals** tab

## Test Scenarios

### Scenario 1: Empty State
**Expected**: 
- See "No Goals Yet" message
- See "Create Your First Goal" button
- Clean, centered layout with Target icon

**Steps**:
1. Navigate to Goals tab (first time)
2. Verify empty state displays

### Scenario 2: Create a Goal
**Expected**:
- Modal opens with smooth animation
- Form validates input
- Success toast appears
- Goal appears in grid

**Steps**:
1. Click "+ Add New Goal" button
2. Fill in form:
   - Title: "Daily Meditation"
   - Description: "Meditate for 10 minutes each morning"
   - Frequency: Daily
   - Privacy: Private
3. Click "Create Goal"
4. Verify:
   - ✅ Success toast: "Goal created successfully! 🎯"
   - ✅ Modal closes
   - ✅ Goal appears in grid
   - ✅ Current Streak: 0
   - ✅ Best Streak: 0
   - ✅ Total: 0 days
   - ✅ Lock icon (private)

### Scenario 3: Create Multiple Goals
**Expected**:
- Multiple goals display in responsive grid
- Stats summary appears at bottom

**Steps**:
1. Create 3 different goals:
   - "Daily Meditation" (Daily, Private)
   - "Weekly Exercise" (Weekly, Public)
   - "Monthly Reading" (Monthly, Private)
2. Verify:
   - ✅ All 3 goals display in grid
   - ✅ Responsive layout (1 column mobile, 2 tablet, 3 desktop)
   - ✅ Stats summary shows:
     - Active Goals: 3
     - Daily Goals: 1
     - Public Goals: 1

### Scenario 4: Log Progress (Manual Test)
**Expected**:
- Streak increments after logging progress
- "Active Today" indicator appears

**Steps**:
1. Open Supabase SQL Editor
2. Run this query (replace with your goal_key):
   ```sql
   SELECT log_goal_progress('daily_meditation');
   ```
3. Refresh the Goals tab
4. Verify:
   - ✅ Current Streak: 1
   - ✅ Best Streak: 1
   - ✅ Total: 1 day
   - ✅ "🔥 Active Today!" appears

### Scenario 5: Multi-Day Streak
**Expected**:
- Streak calculates correctly across multiple days
- Best streak tracks highest value

**Steps**:
1. In Supabase SQL Editor, insert progress for multiple days:
   ```sql
   -- Get your goal ID first
   SELECT id, goal_key FROM user_goals WHERE goal_key = 'daily_meditation';
   
   -- Insert progress for past 5 days (replace <goal_id> and <user_id>)
   INSERT INTO goal_progress (goal_id, user_id, logged_at)
   VALUES 
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '4 days'),
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '3 days'),
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '2 days'),
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '1 day'),
     ('<goal_id>', '<user_id>', NOW());
   ```
2. Refresh the Goals tab
3. Verify:
   - ✅ Current Streak: 5
   - ✅ Best Streak: 5
   - ✅ Total: 5 days
   - ✅ Progress dots show (up to 7 dots)

### Scenario 6: Broken Streak
**Expected**:
- Current streak resets when day is missed
- Best streak remains unchanged

**Steps**:
1. Insert progress with a gap:
   ```sql
   INSERT INTO goal_progress (goal_id, user_id, logged_at)
   VALUES 
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '10 days'),
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '9 days'),
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '8 days'),
     -- Gap here (day 7 missing)
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '6 days'),
     ('<goal_id>', '<user_id>', NOW() - INTERVAL '5 days');
   ```
2. Refresh the Goals tab
3. Verify:
   - ✅ Current Streak: 2 (last 2 consecutive days)
   - ✅ Best Streak: 3 (longest streak was 3 days)

### Scenario 7: Animations
**Expected**:
- Smooth animations throughout
- Number Ticker animates on load

**Steps**:
1. Navigate away from Goals tab
2. Navigate back to Goals tab
3. Verify:
   - ✅ Cards fade in with stagger effect
   - ✅ Numbers animate from 0 to actual value
   - ✅ Hover effects work (scale, shadow)
   - ✅ Modal opens/closes smoothly

### Scenario 8: Responsive Design
**Expected**:
- Layout adapts to screen size
- All features work on mobile

**Steps**:
1. Open browser DevTools
2. Toggle device toolbar (mobile view)
3. Test on different sizes:
   - Mobile (375px): 1 column grid
   - Tablet (768px): 2 column grid
   - Desktop (1024px+): 3 column grid
4. Verify:
   - ✅ All content readable
   - ✅ Buttons accessible
   - ✅ Modal fits screen
   - ✅ No horizontal scroll

### Scenario 9: Error Handling
**Expected**:
- Graceful error messages
- No crashes

**Steps**:
1. Try to create goal with empty title
2. Verify:
   - ✅ "Please enter a goal title" toast
   - ✅ Form doesn't submit
3. Disconnect internet
4. Try to create goal
5. Verify:
   - ✅ "Failed to create goal" toast
   - ✅ App doesn't crash

### Scenario 10: RLS Policies
**Expected**:
- Users only see their own goals
- Cannot access other users' goals

**Steps**:
1. Create a goal as User A
2. Log out
3. Log in as User B
4. Navigate to Goals tab
5. Verify:
   - ✅ User B sees empty state (not User A's goals)
6. Try to query User A's goals directly:
   ```sql
   -- This should return empty for User B
   SELECT * FROM user_goals WHERE user_id = '<user_a_id>';
   ```
7. Verify:
   - ✅ Query returns no results (RLS blocks access)

## Performance Testing

### Load Test: Many Goals
**Steps**:
1. Create 20+ goals
2. Navigate to Goals tab
3. Verify:
   - ✅ Page loads in < 2 seconds
   - ✅ Animations remain smooth
   - ✅ No lag when scrolling

### Load Test: Long Streak
**Steps**:
1. Insert 365 progress entries (1 year)
2. Navigate to Goals tab
3. Verify:
   - ✅ Streak calculates correctly
   - ✅ Page loads quickly
   - ✅ No performance issues

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

## Accessibility Testing

1. **Keyboard Navigation**:
   - ✅ Tab through all interactive elements
   - ✅ Enter/Space activates buttons
   - ✅ Escape closes modal

2. **Screen Reader**:
   - ✅ All images have alt text
   - ✅ Form labels are associated
   - ✅ ARIA labels present

3. **Color Contrast**:
   - ✅ Text meets WCAG AA standards
   - ✅ Interactive elements clearly visible

## Common Issues & Solutions

### Issue: Migration fails
**Solution**: Check if tables already exist. Drop them first:
```sql
DROP TABLE IF EXISTS goal_progress CASCADE;
DROP TABLE IF EXISTS user_goals CASCADE;
DROP TYPE IF EXISTS goal_frequency CASCADE;
```

### Issue: Goals don't appear
**Solution**: 
1. Check browser console for errors
2. Verify Supabase connection
3. Check RLS policies are enabled
4. Verify user is authenticated

### Issue: Streaks calculate incorrectly
**Solution**:
1. Check timezone settings
2. Verify date-fns is installed
3. Check progress entries in database:
   ```sql
   SELECT * FROM goal_progress WHERE goal_id = '<goal_id>' ORDER BY logged_at DESC;
   ```

### Issue: Number Ticker doesn't animate
**Solution**:
1. Check framer-motion is installed
2. Verify no CSS conflicts
3. Check browser console for errors

## Next Steps After Testing

Once all tests pass:

1. **Deploy Migration**:
   ```bash
   # Deploy to production
   supabase db push --db-url <prod-supabase-url>
   ```

2. **Monitor**:
   - Check Supabase logs for errors
   - Monitor performance metrics
   - Gather user feedback

3. **Iterate**:
   - Add goal detail modal
   - Implement quick-log button
   - Add calendar view
   - Build analytics dashboard

## Support

If you encounter issues:
1. Check `GOALS_FEATURE_IMPLEMENTATION.md` for architecture details
2. Review migration file for RLS policies
3. Check browser console for errors
4. Verify Supabase connection and auth
5. Test with a fresh user account

---

**Happy Testing! 🎯**

