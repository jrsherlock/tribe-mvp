# Activity Streaks - Quick Start Guide

## 🚀 What's New?

Two new automatically tracked streaks have been added to The Tribe application:

1. **Daily Engagement Streak** 🔥 - Tracks consecutive days you visit the app
2. **Daily Check-In Streak** ✓ - Tracks consecutive days you complete your MEPSS check-in

---

## 📍 Where to Find Them

The new streak cards are displayed on the **Dashboard** (home page) alongside your existing stats:

### Dashboard Layout (4 KPI Cards)

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Days Sober    │  Today's Check  │  Engagement     │   Check-In      │
│   (Purple)      │  (Green/Yellow) │  Streak (🔥)    │   Streak (✓)    │
│                 │                 │  (Orange)       │   (Teal)        │
│   Existing      │   Existing      │   NEW           │   NEW           │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

## 🎯 How It Works

### Engagement Streak 🔥
- **Automatically tracked** when you log in or visit the app
- **No action required** - just open the app!
- **Resets to 0** if you skip a day
- **Example**: Visit app on Monday, Tuesday, Wednesday = 3 day streak

### Check-In Streak ✓
- **Automatically tracked** when you complete a MEPSS check-in
- **Resets to 0** if you skip a day
- **Example**: Complete check-in on Monday, Tuesday, Wednesday = 3 day streak

---

## 🎨 Visual Design

### Engagement Streak Card (Orange)
```
┌─────────────────────────────┐
│ 🔥              STREAK      │
│                             │
│        15                   │
│     days visiting           │
└─────────────────────────────┘
```
- **Color**: Orange gradient
- **Icon**: Flame 🔥
- **Label**: "STREAK"
- **Text**: "X days visiting"

### Check-In Streak Card (Teal)
```
┌─────────────────────────────┐
│ ✓            CHECK-INS      │
│                             │
│         8                   │
│    days consistent          │
└─────────────────────────────┘
```
- **Color**: Teal gradient
- **Icon**: CheckCircle ✓
- **Label**: "CHECK-INS"
- **Text**: "X days consistent"

---

## 📱 User Experience

### First Time User
1. **Sign up** for The Tribe
2. **Log in** - Engagement streak shows "1 day visiting"
3. **Complete check-in** - Check-in streak shows "1 day consistent"
4. **Come back tomorrow** - Both streaks increment to "2 days"

### Returning User
1. **Log in** - Engagement streak automatically increments
2. **View Dashboard** - See your current streaks
3. **Complete check-in** - Check-in streak automatically increments
4. **Stay motivated** - Watch your streaks grow!

---

## 🔄 Streak Behavior

### Maintaining Your Streak
- **Visit the app daily** to maintain engagement streak
- **Complete check-in daily** to maintain check-in streak
- **Both are independent** - you can have different streak counts

### Streak Resets
- **Skip a day** - Streak resets to 0
- **Example**: 
  - Day 1: Visit app (streak = 1)
  - Day 2: Visit app (streak = 2)
  - Day 3: Don't visit (streak = 0)
  - Day 4: Visit app (streak = 1)

### Multiple Actions Same Day
- **Multiple logins** on same day = still counts as 1 day
- **Multiple check-ins** on same day = still counts as 1 day
- **No penalty** for updating or editing check-ins

---

## 💡 Tips for Success

### Building Your Engagement Streak
1. **Make it a habit** - Log in at the same time each day
2. **Set reminders** - Use phone notifications
3. **Start small** - Focus on 7 days first, then 30
4. **Don't stress** - If you miss a day, just start again

### Building Your Check-In Streak
1. **Daily routine** - Complete check-in at same time each day
2. **Morning or evening** - Choose what works best for you
3. **Be honest** - Authentic check-ins are more valuable
4. **Celebrate milestones** - 7, 30, 100 day streaks!

---

## 🎉 Milestone Ideas

### Engagement Streak Milestones
- 🥉 **7 days** - One week strong!
- 🥈 **30 days** - One month committed!
- 🥇 **100 days** - Century club!
- 💎 **365 days** - Full year champion!

### Check-In Streak Milestones
- 🥉 **7 days** - Weekly warrior!
- 🥈 **30 days** - Monthly master!
- 🥇 **100 days** - Consistency king/queen!
- 💎 **365 days** - Year-long dedication!

---

## 🔍 Viewing Your Streaks

### Dashboard (Home Page)
1. **Log in** to The Tribe
2. **Navigate to Dashboard** (home icon in sidebar)
3. **View KPI cards** at the top of the page
4. **See your streaks** in the orange and teal cards

### What You'll See
- **Current streak count** (e.g., "15")
- **Descriptive label** (e.g., "days visiting")
- **Visual icon** (flame or checkmark)
- **Loading state** ("...") while fetching data

---

## 🛠️ Technical Details (For Developers)

### Database
- **Table**: `daily_user_activity`
- **Columns**: `user_id`, `activity_date`, `was_active`, `completed_check_in`
- **RLS**: Enabled (users can only see their own data)

### RPC Functions
- `record_user_activity()` - Called on app load
- `record_check_in_activity()` - Called after check-in submission
- `get_user_streaks()` - Returns current streak counts

### Frontend
- **Hook**: `useUserStreaks` - Manages streak state
- **Component**: `StreakBadge` - Reusable badge component
- **Integration**: App.tsx, DailyCheckin.tsx, Dashboard.tsx

---

## 🐛 Troubleshooting

### Streaks Not Updating
**Problem**: Streak count doesn't change after logging in or completing check-in

**Solutions**:
1. **Refresh the page** - Sometimes data needs to reload
2. **Check internet connection** - Ensure you're online
3. **Clear browser cache** - Old data might be cached
4. **Log out and log back in** - Reset your session

### Streaks Show Zero
**Problem**: Both streaks show "0 days" even after using the app

**Solutions**:
1. **Wait a moment** - Data might still be loading
2. **Check if you're logged in** - Streaks only work for authenticated users
3. **Complete a check-in** - This will initialize your check-in streak
4. **Contact support** - If issue persists

### Streaks Reset Unexpectedly
**Problem**: Streak reset to 0 even though you used the app yesterday

**Possible Causes**:
1. **Timezone differences** - App uses server time (Central Time)
2. **Missed a day** - Check your activity history
3. **Database issue** - Contact support if this happens frequently

---

## 📞 Support

### Need Help?
- **Check documentation** - See `Docs/ACTIVITY_STREAKS_IMPLEMENTATION.md`
- **Review testing checklist** - See `Docs/ACTIVITY_STREAKS_TESTING_CHECKLIST.md`
- **Contact support** - Reach out to the development team

### Feedback
We'd love to hear your thoughts on the new streak features!
- What do you like?
- What could be improved?
- What other features would you like to see?

---

## 🎯 Summary

The new activity streaks are designed to:
- **Motivate daily engagement** with the app
- **Encourage consistent check-ins** for better self-awareness
- **Provide visual feedback** on your commitment to recovery
- **Celebrate your progress** with growing streak counts

**Remember**: The goal isn't perfection - it's progress. If you miss a day, don't get discouraged. Just start your streak again and keep moving forward! 💪

---

## 📚 Additional Resources

- **Full Implementation Guide**: `Docs/ACTIVITY_STREAKS_IMPLEMENTATION.md`
- **Testing Checklist**: `Docs/ACTIVITY_STREAKS_TESTING_CHECKLIST.md`
- **Summary Document**: `ACTIVITY_STREAKS_SUMMARY.md`

---

**Version**: 1.0  
**Last Updated**: January 7, 2025  
**Status**: ✅ Production Ready

