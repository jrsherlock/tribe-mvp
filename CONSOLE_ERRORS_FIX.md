# Console Errors Fix: Table Name Mismatch Resolution

## Problem Summary

Three console errors were occurring in the React application due to a database schema mismatch where the application code referenced a table called `memberships` but the actual Supabase database table is named `tenant_members`.

### Errors Encountered

1. **Error 1: Load memberships error**
   ```
   Load memberships error Object
   ```
   - **Location**: `src/lib/tenant.tsx` line 41
   - **Cause**: Query to non-existent `memberships` table
   - **Impact**: Tenant context failed to load user's tenant memberships

2. **Error 2: React key prop warning**
   ```
   Warning: Each child in a list should have a unique "key" prop.
   Check the render method of `Dashboard`.
   ```
   - **Location**: Dashboard component
   - **Cause**: Likely a side effect of failed data loading (empty arrays being mapped)
   - **Impact**: React warning in console

3. **Error 3: Failed to fetch feed**
   ```
   Failed to fetch feed: Object
   ```
   - **Location**: `src/components/SanghaFeed.tsx` line 176
   - **Cause**: Cascading failure from missing tenant membership data
   - **Impact**: Community feed failed to load

## Root Cause Analysis

### Database Schema vs Application Code Mismatch

**Database Reality** (from Supabase dev project: ohlscdojhsifvnnkoiqi):
- Table name: `tenant_members`
- Columns: `user_id`, `tenant_id`, `role`, `created_at`
- Constraints: PK on (user_id, tenant_id), unique index on user_id (enforces single tenant per user)

**Application Code Expectation**:
- Table name: `memberships` ❌ (incorrect)
- Same column structure

### Why This Happened

Based on our earlier schema analysis, the database table was likely renamed from `memberships` to `tenant_members` directly in the Supabase dashboard, but the application code was never updated to reflect this change. Evidence:
- Database constraint names still reference "memberships" (e.g., `memberships_pkey`, `uq_memberships_single_tenant`)
- This suggests a manual rename operation in the database

### RLS Policy Impact

Additionally, the `tenant_members` table has RLS enabled but **no policies defined**, which means:
- Even with the correct table name, client queries would be denied by default
- This is a separate issue that needs to be addressed with proper RLS policies (see earlier schema analysis)

## Files Fixed

### 1. `src/lib/tenant.tsx`

**Before**:
```typescript
const { data, error } = await supabase.from('memberships').select('*')
if (!isMounted) { inFlight = false; return }
if (error) {
  console.error('Load memberships error', error)
```

**After**:
```typescript
const { data, error } = await supabase.from('tenant_members').select('*')
if (!isMounted) { inFlight = false; return }
if (error) {
  console.error('Load tenant_members error', error)
```

**Impact**: 
- Fixes Error #1 (Load memberships error)
- Tenant context now queries the correct table
- User's tenant memberships will load (once RLS policies are added)

---

### 2. `src/lib/services/tenants.ts`

**Changed Functions**:

#### `listMembershipsByTenant()`
```typescript
// Before
return supabase.from('memberships').select('*').eq('tenant_id', tenantId)

// After
return supabase.from('tenant_members').select('*').eq('tenant_id', tenantId)
```

#### `upsertMembership()`
```typescript
// Before
const { data, error } = await supabase
  .from('memberships')
  .upsert({ user_id: params.user_id, tenant_id: params.tenant_id, role: params.role ?? 'MEMBER' })

// After
const { data, error } = await supabase
  .from('tenant_members')
  .upsert({ user_id: params.user_id, tenant_id: params.tenant_id, role: params.role ?? 'MEMBER' })
```

#### `updateMembershipRole()`
```typescript
// Before
return supabase.from('memberships').update({ role: params.role })

// After
return supabase.from('tenant_members').update({ role: params.role })
```

#### `deleteMembership()`
```typescript
// Before
return supabase.from('memberships').delete()

// After
return supabase.from('tenant_members').delete()
```

**Impact**:
- All tenant membership CRUD operations now target the correct table
- Admin dashboard tenant member management will work
- Invite system can verify caller permissions

---

### 3. `supabase/functions/invite_user/index.ts` (Edge Function)

**Changes**:

#### Table Name Fix
```typescript
// Before
const { data: membership, error: membershipError } = await supabase
  .from("memberships")
  .select("role")

// After
const { data: membership, error: membershipError } = await supabase
  .from("tenant_members")
  .select("role")
```

#### Removed Non-Existent Column
```typescript
// Before
.insert({
  tenant_id: tenantId,
  email: targetEmail,
  role: requestedRole,
  token,
  invited_by: authData.user.id,  // ❌ Column doesn't exist in invites table
  expires_at: expiresAt,
})

// After
.insert({
  tenant_id: tenantId,
  email: targetEmail,
  role: requestedRole,
  token,
  expires_at: expiresAt,
})
```

**Impact**:
- Edge function can now verify caller has OWNER/ADMIN role in tenant
- Invite creation will succeed (no longer tries to insert into non-existent column)

## Verification Steps

### 1. Check Console Errors (Before Fix)
```
✗ Load memberships error Object
✗ Warning: Each child in a list should have a unique "key" prop
✗ Failed to fetch feed: Object
```

### 2. After Fix (Expected)
```
✓ No "Load memberships error"
✓ No React key warnings (data loads correctly)
✓ Feed loads successfully (if RLS policies are in place)
```

### 3. Test in Browser
1. Navigate to `http://localhost:5174/`
2. Open browser console (F12)
3. Verify no errors related to "memberships" table
4. Check Network tab for successful queries to `tenant_members`

## Remaining Issues & Next Steps

### ⚠️ RLS Policies Still Missing

Even with the table name fixed, the `tenant_members` table has **RLS enabled but no policies**, which means:

**Current State**:
- RLS enabled: ✅
- SELECT policy: ❌ Missing
- INSERT policy: ❌ Missing
- UPDATE policy: ❌ Missing
- DELETE policy: ❌ Missing

**Impact**:
- Client queries to `tenant_members` will be **denied by default**
- Users cannot read their own memberships
- Admins cannot manage tenant members

**Required RLS Policies** (from earlier analysis):

```sql
-- Allow users to read their own membership
CREATE POLICY tenant_members_read_own ON public.tenant_members
  FOR SELECT USING (tenant_members.user_id = auth.uid());

-- Allow tenant OWNER/ADMIN to read all members
CREATE POLICY tenant_members_read_for_admins ON public.tenant_members
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.tenant_members me
    WHERE me.user_id = auth.uid()
      AND me.tenant_id = tenant_members.tenant_id
      AND me.role IN ('OWNER','ADMIN')
  ));

-- Allow tenant OWNER/ADMIN to manage members
CREATE POLICY tenant_members_admin_write ON public.tenant_members
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.tenant_members me
    WHERE me.user_id = auth.uid()
      AND me.tenant_id = tenant_members.tenant_id
      AND me.role IN ('OWNER','ADMIN')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members me
    WHERE me.user_id = auth.uid()
      AND me.tenant_id = tenant_members.tenant_id
      AND me.role IN ('OWNER','ADMIN')
  ));
```

### Other Tables Needing RLS Policies

From our earlier schema analysis, these tables also need policies:
- `tenants` (RLS enabled, no policies)
- `superusers` (RLS enabled, no policies)

## Summary

### ✅ Fixed
- Table name mismatch: `memberships` → `tenant_members` in all client code
- Edge function table reference
- Removed non-existent `invited_by` column from invites insert

### ⚠️ Still Required
- Add RLS policies for `tenant_members` table
- Add RLS policies for `tenants` table
- Add RLS policies for `superusers` table
- Test full tenant membership flow end-to-end

### 📝 Related Documentation
- See `SCHEMA_ANALYSIS.md` for complete database schema analysis
- See earlier conversation for detailed RLS policy recommendations
- See `DEV_FEATURE_SAMPLE_DATA.md` for check-in sample data feature

## Testing Checklist

- [ ] No console errors on Dashboard load
- [ ] Tenant context loads memberships successfully
- [ ] Admin dashboard can view tenant members (once RLS added)
- [ ] Invite edge function can verify caller permissions
- [ ] No React key prop warnings
- [ ] Community feed loads (once RLS added)

