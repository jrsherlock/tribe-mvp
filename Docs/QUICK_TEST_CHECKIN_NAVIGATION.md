# Quick Test: Check-In Navigation Issue

## 🎯 Goal
Test if check-in submission navigates to group feed and identify where it fails.

---

## 📋 Quick Test Steps

### 1. Open App & Console
```
1. Go to: http://localhost:5175/checkin
2. Press F12 (or Cmd+Option+I on Mac)
3. Click "Console" tab
4. Clear console (Cmd+K or Ctrl+L)
```

### 2. Fill Out Check-In
```
✓ Set all 5 MEPSS ratings (Mental, Emotional, Physical, Social, Spiritual)
✓ Choose "Share with Groups" or "Private"
✓ If sharing, select at least one group
```

### 3. Submit & Watch Console
```
1. Click "Complete Check-in" button
2. Watch console for log messages
3. Wait 2 seconds
4. Note if navigation happens
```

---

## ✅ Success Looks Like

**Console Output:**
```
[DailyCheckin] handleSubmit called
[DailyCheckin] User authenticated, proceeding with submission
[DailyCheckin] Loading state set to true
[DailyCheckin] Upserting check-in to database...
[DailyCheckin] Check-in saved successfully: {id: "...", ...}
[DailyCheckin] Sharing check-in to groups: [...]
[DailyCheckin] Check-in shared to groups successfully
[DailyCheckin] Recording check-in activity for streak tracking...
[DailyCheckin] Streak activity recorded
[DailyCheckin] Scheduling navigation to /sangha in 1.5 seconds...
[DailyCheckin] Loading state set to false, handleSubmit complete
[DailyCheckin] Navigating to /sangha now
```

**Visual:**
- Loading spinner appears briefly
- Success toast notification shows
- After 1.5 seconds, page navigates to Tribe Feed (`/sangha`)
- Your check-in appears in the feed (if shared with groups)

---

## ❌ Failure Scenarios

### Scenario A: No Console Logs
**What you see:**
- Nothing in console
- Button doesn't respond

**Diagnosis:** Button click not triggering

---

### Scenario B: Stops at "No user found"
**Console:**
```
[DailyCheckin] handleSubmit called
[DailyCheckin] No user found, cannot submit
```

**Diagnosis:** User not authenticated  
**Fix:** Sign in again

---

### Scenario C: Database Error
**Console:**
```
[DailyCheckin] handleSubmit called
[DailyCheckin] User authenticated, proceeding with submission
[DailyCheckin] Loading state set to true
[DailyCheckin] Upserting check-in to database...
[DailyCheckin] Error saving check-in: {...}
[DailyCheckin] Failed to save check-in: {...}
```

**Diagnosis:** Database save failed  
**Action:** Copy error details and report

---

### Scenario D: Group Sharing Error
**Console:**
```
[DailyCheckin] handleSubmit called
...
[DailyCheckin] Check-in saved successfully: {...}
[DailyCheckin] Sharing check-in to groups: [...]
[DailyCheckin] Error sharing to groups: {...}
[DailyCheckin] Failed to save check-in: {...}
```

**Diagnosis:** Group sharing failed  
**Action:** Copy error details and report

---

### Scenario E: Navigation Doesn't Execute
**Console:**
```
[DailyCheckin] handleSubmit called
...
[DailyCheckin] Scheduling navigation to /sangha in 1.5 seconds...
[DailyCheckin] Loading state set to false, handleSubmit complete
(No "Navigating to /sangha now" after 1.5 seconds)
```

**Diagnosis:** Navigation timeout not executing  
**Action:** Report this specific scenario

---

## 📸 What to Report

If the test fails, please provide:

1. **Console Output** (copy all `[DailyCheckin]` logs)
2. **Last Log Message** (where did it stop?)
3. **Any Error Messages** (red text in console)
4. **Visual Behavior** (what did you see on screen?)
5. **User Type** (solo user, in groups, etc.)

---

## 🔧 Quick Fixes to Try

### If Nothing Happens
1. Refresh page (Cmd+R or Ctrl+R)
2. Clear browser cache
3. Check if button is disabled (grayed out)

### If "No user found"
1. Sign out and sign back in
2. Check if session expired

### If Database Error
1. Check network connection
2. Verify Supabase is accessible
3. Check browser Network tab for failed requests

---

## 📞 Support

If issue persists after testing:
1. Copy console output
2. Take screenshot of error
3. Note which scenario matches your issue
4. Report findings

---

**Test Duration:** ~2 minutes  
**Required:** Browser DevTools, logged-in user  
**Output:** Console logs showing where submission fails

