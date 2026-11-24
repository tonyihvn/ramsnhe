# Role Handling Documentation

## Overview
This application uses role-based access control (RBAC) with consistent role handling across frontend and backend. The system supports the following roles:

### Standard Roles (from database seeding)
- **Admin** - Full system administrator with all permissions
- **Super Admin / super-admin** - Super administrator (highest level)
- **Form Builder** - Can design and publish forms
- **Data Collector** - Can collect and submit data
- **Reviewer** - Can review submitted reports
- **Viewer** - Read-only access

### Role Storage and Variations
Roles are stored in the `users.role` column with various capitalizations:
- Database stores: `Admin`, `super-admin`, `Form Builder`, `Data Collector`, `Reviewer`, `Viewer`
- Frontend/Backend accept variations: `admin`, `Admin`, `super-admin`, `super_admin`, `super admin`, `Super Admin`

## Centralized Role Utilities

### Backend (`server/roleUtils.js`)
```javascript
import { isAdminRole, isSuperAdminRole, isFormBuilderRole, hasAdminAccess, normalizeRoleName } from './roleUtils.js';

// Check if user is admin
if (isAdminRole(user.role)) { /* ... */ }

// Get normalized role name
const normalized = normalizeRoleName(user.role); // Returns 'Admin' or 'super-admin'
```

### Frontend (`utils/roleUtils.ts`)
```typescript
import { isAdminRole, isSuperAdminRole, hasAdminAccess, getHumanReadableRole } from '../utils/roleUtils';

// Check if user is admin
if (isAdminRole(currentUser?.role)) { /* ... */ }

// Get display-friendly role name
const display = getHumanReadableRole(currentUser?.role); // Returns 'Admin' or 'Super Admin'
```

## Available Functions

### Common to Both Backend and Frontend
- **`isAdminRole(role)`** - Returns true if role is admin or super-admin (any variation)
- **`isSuperAdminRole(role)`** - Returns true if role is super-admin only
- **`isFormBuilderRole(role)`** - Returns true if role is form builder
- **`isDataCollectorRole(role)`** - Returns true if role is data collector
- **`isReviewerRole(role)`** - Returns true if role is reviewer
- **`isViewerRole(role)`** - Returns true if role is viewer
- **`hasAdminAccess(role)`** - Alias for `isAdminRole()`
- **`getRoleLevel(role)`** - Returns numeric hierarchy level (0-6)

### Backend Only (`server/roleUtils.js`)
- **`normalizeRoleName(role)`** - Normalizes role to database format ('Admin', 'super-admin', etc.)

### Frontend Only (`utils/roleUtils.ts`)
- **`getHumanReadableRole(role)`** - Converts role to display-friendly format ('Admin', 'Super Admin', etc.)

## Key Features

### Case-Insensitive Comparisons
All role checks are case-insensitive:
```
'Admin', 'ADMIN', 'admin' → all recognized as admin
'super-admin', 'SUPER_ADMIN', 'Super Admin' → all recognized as super-admin
```

### Email Verification Bypass
Admin and Super-Admin accounts bypass email verification during login:
```javascript
const isAdminOrSuperAdmin = isAdminRole(user.role);
if (requireVerify && !isAdminOrSuperAdmin) {
    // Enforce email verification for non-admin users
}
```

### Admin Middleware
Protected admin endpoints use centralized checking:
```javascript
async function requireAdmin(req, res, next) {
    const r = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
    if (isAdminRole(r.rows[0].role)) return next();
    return res.status(403).json({ error: 'Forbidden - admin only' });
}
```

## Database Role Storage

### Roles Table (`roles` table)
Seeded roles:
```
id | name            | description
1  | Admin           | Full system administrator
2  | Form Builder    | Design and publish forms
3  | Data Collector  | Collect and submit data
4  | Reviewer        | Review submitted reports
5  | Viewer          | Read-only access
```

### Users Table (`users` table)
```
id | role        | email          | ...
1  | super-admin | admin@demo.com | ...
2  | Admin       | user@demo.com  | ...
3  | Form Builder| builder@demo.com | ...
```

**Note:** The `super-admin` role is stored directly in `users.role`, not in the `roles` table.

## Permission Mapping

### Admin/Super-Admin Permissions
- `manage_users` - Create, update, delete users
- `manage_roles` - Manage roles and permissions
- `manage_settings` - Update system settings
- `edit_forms` - Create and edit forms
- `submit_reports` - Submit reports
- `view_reports` - View reports and dashboards
- `manage_llm` - Manage LLM providers

### Other Role Permissions
Configured via `role_permissions` table and checked during data access.

## Migration Notes

If you have existing users with non-standard role values:

1. **Update Database:**
   ```sql
   UPDATE users SET role = 'Admin' WHERE LOWER(role) = 'admin';
   UPDATE users SET role = 'super-admin' WHERE LOWER(role) IN ('super-admin', 'super_admin');
   ```

2. **Or** rely on the centralized functions which handle all variations automatically.

## Best Practices

1. **Always use centralized functions** instead of inline role comparisons
2. **Import from roleUtils** in both frontend and backend
3. **Use case-insensitive checks** - the utilities handle this automatically
4. **Normalize roles** before storing in database using `normalizeRoleName()`
5. **Use `getHumanReadableRole()`** or `getRoleLevel()` for UI/display logic

## Examples

### Express Middleware
```javascript
import { isAdminRole } from './roleUtils.js';

app.get('/api/admin/users', async (req, res) => {
    const user = await db.getUser(req.session.userId);
    if (!isAdminRole(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    // ... admin logic
});
```

### React Component
```typescript
import { isAdminRole } from '../utils/roleUtils';

function AdminPanel({ currentUser }) {
    if (!isAdminRole(currentUser?.role)) {
        return <div>Access Denied</div>;
    }
    return <AdminContent />;
}
```

### Role-Based Features
```javascript
import { getRoleLevel, ROLE_HIERARCHY } from '../utils/roleUtils';

function canEditForm(userRole) {
    return getRoleLevel(userRole) >= ROLE_HIERARCHY['form builder'];
}
```
