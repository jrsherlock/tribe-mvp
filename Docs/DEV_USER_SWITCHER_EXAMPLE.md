# Dev User Switcher - Display Examples

## Current State (After Fixes)

### Dropdown Display Format
```
{display_name} - {platform_role}
```

### Example Users

#### SuperUser
```
jrsherlock@gmail.com - SuperUser
```

#### Facility Admin (Owner)
```
John Doe - Facility Admin (Owner)
```

#### Facility Admin
```
Jane Smith - Facility Admin
```

#### Basic User (Facility Member)
```
Bob Johnson - Basic User
```

#### Solo User (No Tenant)
```
Alice Williams - Solo User
```

---

## Before vs After

### BEFORE (Cluttered)
```
jrsherlock@gmail.com (jrsherlock@gmail.com) - Solo User
John Doe (john@example.com) - Top of the World Ranch [OWNER]
Jane Smith (jane@example.com) - Top of the World Ranch [ADMIN]
Bob Johnson (bob@example.com) - Top of the World Ranch [MEMBER]
```

### AFTER (Clean)
```
jrsherlock@gmail.com - SuperUser
John Doe - Facility Admin (Owner)
Jane Smith - Facility Admin
Bob Johnson - Basic User
Alice Williams - Solo User
```

---

## Role Mapping

| Database State | Display Role |
|----------------|--------------|
| In `superusers` table | **SuperUser** |
| `tenant_members.role = 'OWNER'` | **Facility Admin (Owner)** |
| `tenant_members.role = 'ADMIN'` | **Facility Admin** |
| `tenant_members.role = 'MEMBER'` | **Basic User** |
| No tenant membership | **Solo User** |

---

## Current Database State

**Only User**: jrsherlock@gmail.com
- **Display**: "jrsherlock@gmail.com - SuperUser"
- **Reason**: User is in the `superusers` table
- **Also**: OWNER of "Top of the World Ranch" tenant (but SuperUser takes precedence)

---

## Testing the Component

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Open the app** in your browser

3. **Look for the purple box** in the bottom-right corner

4. **Check the dropdown** - it should show:
   ```
   -- Choose a user --
   jrsherlock@gmail.com - SuperUser
   ```

5. **Select the user** and click "Instant Sign In" (if service key is configured)

6. **Verify** you're logged in as the SuperUser

---

## Creating Test Users

To test different roles, create users with different configurations:

### Create a Solo User
```sql
-- User will show as "Solo User" in dropdown
INSERT INTO auth.users (email, ...) VALUES ('solo@example.com', ...);
INSERT INTO user_profiles (user_id, display_name) VALUES (..., 'Solo User');
-- Don't add to tenant_members or superusers
```

### Create a Facility Admin
```sql
-- User will show as "Facility Admin (Owner)" in dropdown
INSERT INTO auth.users (email, ...) VALUES ('admin@example.com', ...);
INSERT INTO user_profiles (user_id, display_name) VALUES (..., 'Facility Admin');
INSERT INTO tenant_members (user_id, tenant_id, role) VALUES (..., ..., 'OWNER');
```

### Create a Basic User
```sql
-- User will show as "Basic User" in dropdown
INSERT INTO auth.users (email, ...) VALUES ('member@example.com', ...);
INSERT INTO user_profiles (user_id, display_name) VALUES (..., 'Basic User');
INSERT INTO tenant_members (user_id, tenant_id, role) VALUES (..., ..., 'MEMBER');
```

---

## Notes

- The dropdown is sorted alphabetically by `display_name`
- Email is no longer shown in the dropdown (cleaner UI)
- Platform role clearly indicates the user's permissions
- SuperUser status takes precedence over tenant membership
- The component works in both "instant" mode (with service key) and "magic link" mode (without)

