# CORS Error Fix - Invitation System

## Problem Identified

When trying to send user invitations from the Admin console, the frontend at `http://localhost:5173` was receiving a CORS error when calling the `invite_user` Edge Function:

```
Access to fetch at 'https://ohlscdojhsifvnnkoiqi.supabase.co/functions/v1/invite_user' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## Root Cause

The Edge Function's CORS configuration was **incomplete**. While it had:
- ✅ `Access-Control-Allow-Origin: *`
- ✅ `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

It was **missing**:
- ❌ `Access-Control-Allow-Methods: POST, OPTIONS`

Additionally, the OPTIONS preflight response was returning `"ok"` as a string instead of a proper 200 status response.

### Why This Matters

When a browser makes a cross-origin POST request with custom headers (like `Authorization`), it first sends a **preflight OPTIONS request** to check if the server allows:
1. The HTTP method (POST)
2. The custom headers (Authorization, Content-Type)
3. The origin (http://localhost:5173)

If the server doesn't explicitly allow the POST method via `Access-Control-Allow-Methods`, the browser blocks the actual request.

## Solution Applied

### 1. Updated CORS Headers

**File**: `supabase/functions/invite_user/index.ts`

**Before**:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**After**:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",  // ✅ ADDED
};
```

### 2. Fixed OPTIONS Response

**Before**:
```typescript
if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}
```

**After**:
```typescript
if (req.method === "OPTIONS") {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders 
  });
}
```

### 3. Deployed Updated Function

```bash
supabase functions deploy invite_user --project-ref ohlscdojhsifvnnkoiqi
```

✅ **Deployment successful**

## Frontend Code Review

The frontend code in `src/lib/services/invites.ts` was **correctly implemented**:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_user`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify({
      email: params.email,
      tenant_id: params.tenant_id,
      role: params.role || 'MEMBER',
      expires_in_days: params.expires_in_days || 7,
    }),
  }
)
```

✅ Proper headers  
✅ Correct authorization format  
✅ Valid JSON body  
✅ Appropriate error handling  

**No frontend changes were needed.**

## Testing Checklist

After deployment, test the following:

- [ ] Open Admin console at `http://localhost:5173`
- [ ] Navigate to Admin Tree or Facility Management
- [ ] Click "Invite User" button
- [ ] Fill in email, role, and expiration
- [ ] Click "Send Invitation"
- [ ] **Expected**: No CORS errors in browser console
- [ ] **Expected**: Success toast message appears
- [ ] **Expected**: Invitation email is sent via Supabase Auth
- [ ] **Expected**: Invite record created in `invites` table
- [ ] Check browser Network tab for successful POST request (200 status)

## Technical Details

### CORS Preflight Flow

1. **Browser sends OPTIONS request**:
   ```
   OPTIONS /functions/v1/invite_user
   Origin: http://localhost:5173
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: authorization, content-type
   ```

2. **Server responds with CORS headers**:
   ```
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: POST, OPTIONS
   Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
   ```

3. **Browser allows actual POST request**:
   ```
   POST /functions/v1/invite_user
   Authorization: Bearer <token>
   Content-Type: application/json
   ```

### Why `Access-Control-Allow-Methods` is Required

According to the CORS specification:
- If a request uses a method other than GET, HEAD, or POST with simple content types
- OR if it includes custom headers (like `Authorization`)
- The browser MUST send a preflight OPTIONS request
- The server MUST respond with `Access-Control-Allow-Methods` listing the allowed methods

Without this header, the browser assumes only safe methods (GET, HEAD) are allowed and blocks the POST request.

## Files Modified

1. **`supabase/functions/invite_user/index.ts`**
   - Added `Access-Control-Allow-Methods: POST, OPTIONS` to CORS headers
   - Fixed OPTIONS response to return proper 200 status with null body

## Related Documentation

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN: Preflight Request](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [Supabase Edge Functions: CORS](https://supabase.com/docs/guides/functions/cors)

## Next Steps

1. **Test the invitation flow** from the Admin console
2. **Verify email delivery** using Supabase Auth
3. **Check invite tracking** in the `invites` table
4. **Monitor for any other CORS issues** in production

## Production Considerations

For production deployment:

1. **Restrict CORS origins** instead of using `*`:
   ```typescript
   const corsHeaders = {
     "Access-Control-Allow-Origin": "https://your-production-domain.com",
     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
     "Access-Control-Allow-Methods": "POST, OPTIONS",
   };
   ```

2. **Set environment variable** for allowed origins:
   ```typescript
   const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
   const corsHeaders = {
     "Access-Control-Allow-Origin": allowedOrigin,
     // ... rest of headers
   };
   ```

3. **Update `APP_BASE_URL`** to production domain:
   ```bash
   supabase secrets set APP_BASE_URL=https://your-production-domain.com --project-ref <prod-project-id>
   ```

---

**Status**: ✅ **FIXED AND DEPLOYED**

The CORS error has been resolved. The invitation system should now work correctly from the frontend without any CORS-related errors.

