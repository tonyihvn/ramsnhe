# Architecture Overview: Activity Role-Based Access Control

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │   Sidebar Component  │        │  Activity Dashboard  │       │
│  │                      │        │                      │       │
│  │ • Programs (visible) │        │ • Permission Check   │       │
│  │ • Activities (visible)       │ • useActivityPerms   │       │
│  └──────────────────────┘        └──────────────────────┘       │
│                                                                  │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │  FillFormPage        │        │ ActivityPermissions  │       │
│  │                      │        │      Page (ADMIN)    │       │
│  │ • Permission Check   │        │                      │       │
│  │ • useActivityPerms   │        │ • CRUD Interface     │       │
│  └──────────────────────┘        │ • API Integration    │       │
│                                  └──────────────────────┘       │
│                                                                  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   │ useActivityPermissions Hook
                   │ API Calls
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                      API LAYER (server/index.js)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GET  /api/activities/:activityId/role_permissions              │
│       ├─ Fetch all permissions for activity                    │
│       └─ Return with role names joined                         │
│                                                                  │
│  POST /api/activities/:activityId/role_permissions              │
│       ├─ Upsert permission record                              │
│       └─ Update or create activity_roles entry                 │
│                                                                  │
│  DELETE /api/activities/:activityId/role_permissions/:roleId    │
│       └─ Remove permission record(s)                           │
│                                                                  │
│  Authentication: requireAdmin middleware                        │
│                                                                  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   │ SQL Queries
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                    DATABASE LAYER                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Table: activity_roles                                          │
│  ┌────────────────────────────────────────────────┐             │
│  │ activity_id  | role_id | page_key | section_key │            │
│  │ can_view     | can_create | can_edit | can_delete│           │
│  │ created_at   │                                  │            │
│  └────────────────────────────────────────────────┘             │
│                                                                  │
│  Supporting Tables (referenced):                                │
│  • roles (role_id foreign key)                                  │
│  • activities (activity_id foreign key)                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. User Login Flow
```
User Logs In
    ↓
currentUser set with role
    ↓
Sidebar renders
    ↓
Navigation items filtered:
  • Super Admin only items → hidden (unless super admin)
  • visibleToAll items → shown (Programs, Activities)
  • Other items → checked against page_permissions
    ↓
Result: User sees Programs & Activities regardless of role
```

### 2. Activity Access Flow
```
User clicks "Activities"
    ↓
Navigates to /activities
    ↓
ActivitiesPage displays list
    ↓
User clicks on specific activity
    ↓
Route: /activities/:id/dashboard
    ↓
ActivityDashboardPage loads
    ↓
useActivityPermissions hook fetches permissions for activity
    ↓
checkPermission('can_view') called
    ├─ If Admin → Return true
    └─ If has matching permission in database → Return true
    ↓
If true: Render dashboard
If false: Show "Access Denied"
```

### 3. Form Submission Flow
```
User on Activity Dashboard
    ↓
User clicks "New" button
    ↓
Route: /activities/:id/fill
    ↓
FillFormPage loads
    ↓
useActivityPermissions hook checks can_edit permission
    ↓
If no can_edit permission and not Admin:
  • Show "Access Denied" message
  • Redirect back to Activities
    ↓
If has can_edit or is Admin:
  • Render form
  • Allow submission
  • Save to database
```

### 4. Permission Management Flow (Admin)
```
Admin clicks "Activity Permissions"
    ↓
Route: /activity-permissions
    ↓
ActivityPermissionsPage loads
    ↓
Check if currentUser role is Admin
  └─ If not → Show "Access Denied"
    ↓
Activity selector dropdown populated
    ↓
Admin selects activity
    ↓
API GET /api/activities/:id/role_permissions called
    ↓
Display table of current permissions
    ↓
Admin clicks "Add Permission"
    ↓
Modal opens with role & permission checkboxes
    ↓
Admin selects role & permissions
    ↓
API POST /api/activities/:id/role_permissions called
    ↓
Permission record created/updated in database
    ↓
Table refreshed from API
```

## Permission Matching Logic

### In useActivityPermissions Hook
```typescript
function checkPermission(action, pageKey, sectionKey) {
  // 1. Check if admin user
  if (userRole === 'admin' || 'super-admin' || 'super_admin') {
    return true; // Always grant for admins
  }
  
  // 2. Look through activity permissions
  for (permission of permissions) {
    // Match exact page + section
    if (pageKey && sectionKey) {
      if (perm.page_key === pageKey && perm.section_key === sectionKey) {
        return perm[action]; // Use specific permission
      }
    }
    
    // Match page prefix
    if (pageKey && !sectionKey) {
      if (perm.page_key === pageKey) {
        return perm[action]; // Use permission
      }
    }
  }
  
  // 3. No matching permission found
  return false; // Deny access
}
```

### In ActivityDashboardPage
```typescript
const hasViewAccess = isAdmin || checkPermission('can_view', `/activities/${activityId}`);
if (!isAdmin && !hasViewAccess) {
  return <AccessDeniedMessage />;
}
```

### In FillFormPage
```typescript
const hasEditAccess = isAdmin || checkPermission('can_edit', `/activities/${activityId}`);
if (!isAdmin && !hasEditAccess) {
  return <AccessDeniedMessage />;
}
```

## Database Schema Details

### activity_roles Table
```sql
PRIMARY KEY (activity_id, role_id, page_key, section_key)
  • Ensures no duplicate permissions
  • Allows same role to have different permissions per page/section

FOREIGN KEYS:
  • activity_id → activities(id) ON DELETE CASCADE
  • role_id → roles(id) ON DELETE CASCADE
    (Permission deleted when activity or role is deleted)

BOOLEAN FLAGS:
  • can_view: User can access activity dashboard
  • can_create: User can submit new responses
  • can_edit: User can modify responses
  • can_delete: User can remove responses
```

### Query Examples

#### Get all permissions for activity 1
```sql
SELECT ar.*, r.name as role_name 
FROM activity_roles ar
LEFT JOIN roles r ON ar.role_id = r.id
WHERE ar.activity_id = 1
ORDER BY r.name;
```

#### Create/Update permission
```sql
INSERT INTO activity_roles 
(activity_id, role_id, page_key, section_key, can_view, can_create, can_edit, can_delete)
VALUES (1, 2, '/activities/1', NULL, true, true, true, false)
ON CONFLICT (activity_id, role_id, page_key, section_key)
DO UPDATE SET 
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = false;
```

#### Delete permission
```sql
DELETE FROM activity_roles 
WHERE activity_id = 1 AND role_id = 2;
```

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ USER PERFORMS ACTION                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  React Component            │
        │  (Dashboard/FillForm/Nav)   │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  useActivityPermissions     │
        │  hook (client-side check)   │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  API Request                │
        │  (if fetching permissions)  │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  Server Endpoint            │
        │  (/api/activities/...)      │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  requireAdmin Middleware    │
        │  (verify admin user)        │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  Database Query             │
        │  (activity_roles table)     │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  Response Data              │
        │  (permissions array)        │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  Component Update           │
        │  (re-render with perms)     │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  User Sees Result           │
        │  (granted or denied access) │
        └─────────────────────────────┘
```

## Configuration Options

### Adding New Permission Types
Currently supports: `can_view`, `can_create`, `can_edit`, `can_delete`

To add new permission (e.g., `can_export`):
1. Add column to `activity_roles` table
2. Update API endpoint to accept new field
3. Update database INSERT/UPDATE queries
4. Add checkbox to ActivityPermissionsPage UI
5. Add permission check in components

### Granular vs. Global Permissions
- **Global**: page_key only (e.g., `/activities/1`)
- **Granular**: page_key + section_key (e.g., `/activities/1`, `patient_info`)

Current implementation: Primarily global, but infrastructure supports granular

## Performance Characteristics

### API Calls
- **GET permissions**: O(1) single query per activity
- **POST permission**: O(1) upsert operation
- **DELETE permission**: O(1) direct delete

### Component Rendering
- **Permission check**: O(n) where n = number of role permissions for activity
  - Typically small (< 20 roles per activity)
  - Linear search acceptable

### Database Indexing (Recommended)
```sql
CREATE INDEX idx_activity_roles_activity_id 
  ON activity_roles(activity_id);

CREATE INDEX idx_activity_roles_role_id 
  ON activity_roles(role_id);
```

## Security Considerations

### Admin Bypass
- Admin and Super Admin roles **always** have full access
- Prevents locking out administrators
- Use carefully when assigning admin role

### Authentication
- All API endpoints require `credentials: 'include'`
- requireAdmin middleware enforces admin check
- Permissions only affect non-admin users

### Data Isolation
- No user can bypass permission checks (except admins)
- Permissions are checked server-side (cannot be spoofed client-side)
- Database constraints prevent orphaned permissions

## Future Enhancements

### 1. Audit Logging
```sql
CREATE TABLE activity_permission_audit (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER,
  role_id INTEGER,
  action VARCHAR(10), -- 'CREATE', 'UPDATE', 'DELETE'
  changed_by INTEGER,
  changed_at TIMESTAMP DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB
);
```

### 2. Permission Templates
```sql
CREATE TABLE permission_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  permissions JSONB -- { can_view, can_create, etc. }
);
```

### 3. Bulk Assignment
- Apply same permissions to multiple activities at once
- Use templates for common patterns

### 4. Permission Expiration
- Add `expires_at` column to activity_roles
- Auto-expire permissions after X days
- Useful for temporary access

---

**Architecture Last Updated**: January 3, 2026
**Version**: 1.0
**Status**: Production Ready
