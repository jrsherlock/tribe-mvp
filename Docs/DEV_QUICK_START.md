# Development Quick Start Guide

## 🚀 User Impersonation - Quick Setup

### Option 1: Magic Link Mode (No Setup Required)

1. Start dev server: `npm run dev`
2. Open landing page
3. See purple panel in bottom-right
4. Select user → Click "Send Magic Link"
5. Check email → Click link

**Pros:** No setup needed  
**Cons:** Requires email access, slower

---

### Option 2: Instant Mode (Recommended) ⚡

1. **Get Service Role Key:**
   - Supabase Dashboard → Settings → API
   - Copy `service_role` key

2. **Add to `.env.local`:**
   ```bash
   VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Use it:**
   - Select user → Click "Instant Sign In"
   - Page reloads, you're logged in!

**Pros:** Instant, no email needed  
**Cons:** Requires one-time setup

---

## 🎯 Quick Testing Scenarios

### Test Solo User
```
Select: User with no tenant
Verify: Only sees own check-ins
```

### Test Facility Admin
```
Select: User with OWNER or ADMIN role
Verify: Can create groups, manage users
```

### Test Group Member
```
Select: User in a group
Verify: Sees group check-ins
```

### Test SuperUser
```
Select: jrsherlock@gmail.com (or other superuser)
Verify: Can create facilities, see all data
```

---

## 🔄 Switching Users

1. Click "Sign Out" in app
2. Redirected to landing page
3. Select different user
4. Sign in again

---

## ⚠️ Important Notes

- **Only works in development** (`npm run dev`)
- **Not visible in production** builds
- **Never commit** service role key
- **Service key is optional** but recommended

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Panel not visible | Check you're in dev mode (`npm run dev`) |
| "Failed to load users" | Check database connection, RLS policies |
| Magic link not received | Check spam, or use instant mode |
| Instant mode not working | Verify service key in `.env.local`, restart server |

---

## 📚 Full Documentation

See [DEV_USER_IMPERSONATION.md](./DEV_USER_IMPERSONATION.md) for complete details.

---

## 🎨 Visual Guide

```
┌─────────────────────────────────────┐
│ DEV: User Impersonation    [Instant]│
├─────────────────────────────────────┤
│ ⚠️  Development only                │
├─────────────────────────────────────┤
│ Select User Account:                │
│ ┌─────────────────────────────────┐ │
│ │ John Doe (john@example.com)     │ │
│ │ - Facility A [ADMIN]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │    🔓 Instant Sign In           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 5 users available                   │
└─────────────────────────────────────┘
```

---

**Happy Testing! 🎉**

