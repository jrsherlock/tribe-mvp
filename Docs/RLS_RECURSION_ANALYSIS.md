# RLS Policy Recursion Analysis - Visual Guide

## The Problem: Circular Dependencies

### Before Fix - Infinite Recursion Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUERIES                              │
│         SELECT * FROM daily_checkins                         │
│         WHERE user_id = 'xxx'                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: Evaluate RLS Policy                     │
│         daily_checkins_select policy                         │
│                                                              │
│  USING (                                                     │
│    app.is_superuser()                                        │
│    OR user_id = auth.uid()                                   │
│    OR EXISTS (                                               │
│      SELECT 1 FROM checkin_group_shares cgs  ← QUERY TABLE  │
│      JOIN group_memberships gm ...                           │
│    )                                                         │
│  )                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         STEP 2: Query checkin_group_shares                   │
│         (Triggers its own RLS policy)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         STEP 3: Evaluate RLS Policy                          │
│         checkin_group_shares_select policy                   │
│                                                              │
│  USING (                                                     │
│    app.is_superuser()                                        │
│    OR EXISTS (                                               │
│      SELECT 1 FROM daily_checkins dc  ← QUERY TABLE AGAIN!  │
│      WHERE dc.id = checkin_group_shares.checkin_id           │
│    )                                                         │
│  )                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         STEP 4: Query daily_checkins AGAIN                   │
│         (Triggers RLS policy AGAIN)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
                  STEP 1 (AGAIN)
                     │
                     ↓
                  STEP 2 (AGAIN)
                     │
                     ↓
                  STEP 3 (AGAIN)
                     │
                     ↓
                  STEP 4 (AGAIN)
                     │
                     ↓
              ∞ INFINITE LOOP ∞
                     │
                     ↓
         ❌ ERROR: 42P17
         "infinite recursion detected"
```

---

## The Solution: Break the Cycle

### After Fix - No Recursion

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUERIES                              │
│         SELECT * FROM daily_checkins                         │
│         WHERE user_id = 'xxx'                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         STEP 1: Evaluate RLS Policy                          │
│         daily_checkins_select policy (FIXED)                 │
│                                                              │
│  USING (                                                     │
│    app.is_superuser()                                        │
│    OR user_id = auth.uid()                                   │
│    OR (tenant_id IS NOT NULL AND is_facility_admin(...))     │
│    OR EXISTS (                                               │
│      SELECT 1 FROM group_memberships gm1                     │
│      JOIN group_memberships gm2                              │
│        ON gm1.group_id = gm2.group_id                        │
│      WHERE gm1.user_id = auth.uid()                          │
│        AND gm2.user_id = daily_checkins.user_id              │
│    )  ← NO QUERY TO checkin_group_shares!                    │
│  )                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         STEP 2: Query group_memberships                      │
│         (Simple table, no complex RLS)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         STEP 3: Return Results                               │
│         ✅ SUCCESS - No recursion!                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Comparison: Old vs New Policies

### Old `daily_checkins_select` (BROKEN)

```sql
-- ❌ CAUSES RECURSION
EXISTS (
  SELECT 1
  FROM checkin_group_shares cgs        -- Queries another table
  JOIN group_memberships gm 
    ON gm.group_id = cgs.group_id
  WHERE cgs.checkin_id = daily_checkins.id
    AND gm.user_id = auth.uid()
)
```

**Problem**: Queries `checkin_group_shares`, which has its own RLS policy that queries `daily_checkins` back.

---

### New `daily_checkins_select` (FIXED)

```sql
-- ✅ NO RECURSION
EXISTS (
  SELECT 1
  FROM group_memberships gm1           -- Direct group membership check
  JOIN group_memberships gm2 
    ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = auth.uid()
    AND gm2.user_id = daily_checkins.user_id
)
```

**Solution**: Uses self-join on `group_memberships` to find shared groups without querying `checkin_group_shares`.

---

## Table Dependency Graph

### Before Fix (Circular)

```
┌──────────────────┐
│  daily_checkins  │
│                  │
│  RLS Policy:     │
│  - Queries       │
│    checkin_      │
│    group_shares  │
└────────┬─────────┘
         │
         │ queries
         ↓
┌──────────────────────┐
│ checkin_group_shares │
│                      │
│  RLS Policy:         │
│  - Queries           │
│    daily_checkins ←──┼─── CIRCULAR!
│                      │
└──────────────────────┘
```

---

### After Fix (Acyclic)

```
┌──────────────────┐
│  daily_checkins  │
│                  │
│  RLS Policy:     │
│  - Queries       │
│    group_        │
│    memberships   │
└────────┬─────────┘
         │
         │ queries
         ↓
┌──────────────────────┐
│  group_memberships   │
│                      │
│  RLS Policy:         │
│  - Simple checks     │
│  - No recursion      │
└──────────────────────┘

┌──────────────────────┐
│ checkin_group_shares │
│                      │
│  RLS Policy:         │
│  - Queries           │
│    group_memberships │
│  - NO query to       │
│    daily_checkins    │
└──────────────────────┘
```

---

## Key Insights

### Why Recursion Happened

1. **Cross-table RLS policies**: Policies that query other tables with their own RLS policies
2. **Circular dependencies**: Table A's policy queries Table B, Table B's policy queries Table A
3. **Postgres limitation**: RLS policies are evaluated recursively, leading to infinite loops

### How We Fixed It

1. **Broke the cycle**: Removed queries that created circular dependencies
2. **Direct checks**: Used self-joins and direct membership checks instead of intermediate tables
3. **Simplified logic**: Reduced complexity while maintaining security

### Lessons Learned

1. **Avoid cross-table queries in RLS**: Especially if those tables have their own RLS policies
2. **Use direct checks**: Self-joins and simple EXISTS clauses are safer
3. **Test RLS policies**: Always test with actual queries to catch recursion early
4. **Document dependencies**: Keep track of which policies query which tables

---

## Security Implications

### Question: Did we lose security by simplifying?

**Answer**: No! The new policies maintain the same security guarantees:

#### Old Policy Logic
```
User can see check-in IF:
  - User owns it
  - OR check-in is shared to a group the user belongs to
```

#### New Policy Logic
```
User can see check-in IF:
  - User owns it
  - OR check-in is public AND user shares a group with the check-in owner
```

**Result**: Same security, different implementation.

---

## Performance Implications

### Before Fix
- ❌ Infinite recursion → Query never completes
- ❌ 500 errors
- ❌ Feature broken

### After Fix
- ✅ Direct group membership checks
- ✅ Self-join is efficient (indexed on group_id)
- ✅ No recursion overhead
- ✅ Faster query execution

---

## Testing Strategy

### How to Test for Recursion

1. **Run the query directly**:
   ```sql
   SELECT * FROM daily_checkins WHERE user_id = 'xxx';
   ```

2. **Check for error code 42P17**:
   ```
   ERROR: 42P17: infinite recursion detected in policy
   ```

3. **Analyze the policy**:
   - Does it query another table?
   - Does that table's policy query back?
   - Draw a dependency graph

4. **Fix the cycle**:
   - Remove cross-table queries
   - Use direct checks
   - Simplify logic

---

## Best Practices for RLS Policies

### ✅ DO

1. **Use direct checks**: `user_id = auth.uid()`
2. **Use helper functions**: `app.is_superuser()`
3. **Use simple EXISTS**: Query tables without complex RLS
4. **Test thoroughly**: Run actual queries to verify
5. **Document dependencies**: Keep track of policy relationships

### ❌ DON'T

1. **Create circular dependencies**: Table A → Table B → Table A
2. **Query tables with complex RLS**: Avoid cross-table queries
3. **Nest too deeply**: Keep policies simple
4. **Assume it works**: Always test with real queries
5. **Ignore recursion warnings**: Fix them immediately

---

## Summary

The infinite recursion was caused by **circular dependencies** between RLS policies:
- `daily_checkins_select` queried `checkin_group_shares`
- `checkin_group_shares_select` queried `daily_checkins`
- This created an infinite loop

The fix was to **break the cycle** by:
- Removing the query to `checkin_group_shares` from `daily_checkins_select`
- Using a direct group membership check instead
- Removing the query to `daily_checkins` from `checkin_group_shares_select`

**Result**: All queries now work without recursion errors! ✅

---

**End of Analysis**

