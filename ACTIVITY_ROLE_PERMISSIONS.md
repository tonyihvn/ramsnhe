# Activity Role-Based Access Control Implementation

## Overview
This document describes the new role-based access control system for activities. It allows administrators to configure which roles can:
- View the activity dashboard
- Submit responses to activities
- Edit individual activity form sections

Additionally, all user roles can now see the Programs and Activities menu items in the sidebar when they log in.

## Key Changes

### 1. **Sidebar Navigation Updates**
- **File**: `components/layout/navigation.ts`, `components/layout/Sidebar.tsx`
- Programs and Activities menu items are now visible to all user roles (added `visibleToAll: true`)
- The sidebar component has been updated to respect this flag and bypass permission checks for these items

### 2. **Activity Role Permissions Table**
- **Table Name**: `activity_roles` (or `{prefix}activity_roles` for multi-tenancy)
- **Fields**:
  - `activity_id` - Reference to the activity
  - `role_id` - Reference to the role
  - `page_key` - Page/form key (e.g., `/activities/123`)
  - `section_key` - Optional section key for granular permissions
  - `can_view` - Can view the activity dashboard
  - `can_create` - Can create new submissions
  - `can_edit` - Can edit form sections
  - `can_delete` - Can delete submissions
  - `created_at` - Timestamp

### 3. **Backend API Endpoints**

#### GET `/api/activities/:activityId/role_permissions`
Retrieve all role permissions for an activity.
**Response**:
```json
[
  {
    "activity_id": 1,
    "role_id": 2,
    "page_key": "/activities/1",
    "section_key": null,
    "can_view": true,
    "can_create": true,
    "can_edit": true,
    "can_delete": false,
    "role_name": "Data Collector"
  }
]
```

#### POST `/api/activities/:activityId/role_permissions`
Set or update role permissions for an activity.
**Request Body**:
```json
{
  "roleId": 2,
  "pageKey": "/activities/1",
  "sectionKey": null,
  "canView": true,
  "canCreate": true,
  "canEdit": true,
  "canDelete": false
}
```

#### DELETE `/api/activities/:activityId/role_permissions/:roleId`
Delete role permissions from an activity.
**Query Parameters**:
- `pageKey` (optional) - Remove permissions for specific page
- `sectionKey` (optional) - Remove permissions for specific section

### 4. **Frontend Hook: useActivityPermissions**
- **File**: `hooks/useActivityPermissions.ts`
- **Usage**:
```typescript
const { permissions, loading, checkPermission } = useActivityPermissions(activityId);

// Check if current user can perform an action
const canView = checkPermission('can_view', '/activities/123');
const canEdit = checkPermission('can_edit', '/activities/123', 'section1');
```

### 5. **Authorization in ActivityDashboardPage**
- **File**: `pages/ActivityDashboardPage.tsx`
- Access check added to prevent unauthorized users from viewing activity dashboards
- Shows "Access Denied" message if user lacks `can_view` permission
- Admins and Super Admins bypass permission checks

### 6. **Authorization in FillFormPage**
- **File**: `pages/FillFormPage.tsx`
- Access check added to prevent unauthorized form submissions
- Checks for `can_edit` permission (for creating/editing responses)
- Standalone mode bypasses permission checks (for public forms)
- Shows "Access Denied" message if user lacks permission

## How to Use

### For Administrators

1. **Assign Permissions via API**:
   ```bash
   # Give "Data Collector" role permission to view and edit Activity 1
   curl -X POST http://localhost:3000/api/activities/1/role_permissions \
     -H "Content-Type: application/json" \
     -d '{
       "roleId": 2,
       "pageKey": "/activities/1",
       "canView": true,
       "canCreate": true,
       "canEdit": true,
       "canDelete": false
     }'
   ```

2. **Create an Admin UI** (Optional):
   - Create a new page like `pages/ActivityPermissionsPage.tsx`
   - Use the provided API endpoints to build a UI for managing role permissions
   - Allow selecting role, activity, and setting can_view, can_create, can_edit, can_delete flags

### For Users

1. **All roles can now**:
   - See the Programs menu in the sidebar
   - See the Activities menu in the sidebar
   - Browse available activities

2. **Based on assigned permissions, roles can**:
   - View the activity dashboard (if `can_view` is true)
   - Submit responses to activities (if `can_edit` is true)
   - Edit specific form sections (if `can_edit` is true for that section)

## Database Initialization

The `activity_roles` table is automatically created when the server starts:

**PostgreSQL**:
```sql
CREATE TABLE IF NOT EXISTS dqai_activity_roles (
    activity_id INTEGER REFERENCES dqai_activities(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES dqai_roles(id) ON DELETE CASCADE,
    page_key TEXT,
    section_key TEXT,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (activity_id, role_id, page_key, section_key)
);
```

**MySQL**:
```sql
CREATE TABLE IF NOT EXISTS dqai_activity_roles (
    activity_id INT,
    role_id INT,
    page_key TEXT,
    section_key TEXT,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (activity_id, role_id, page_key, section_key)
);
```

## Permission Flow Diagram

```
User logs in
    ↓
All roles see Programs & Activities in sidebar (visibleToAll: true)
    ↓
User clicks on Activity
    ↓
ActivityDashboardPage checks can_view permission
    ├─ Admin/Super Admin → Allow
    ├─ Has can_view=true → Allow
    └─ No permission → Show Access Denied
    ↓
User clicks "New" to submit response
    ↓
FillFormPage checks can_edit permission
    ├─ Admin/Super Admin → Allow
    ├─ Has can_edit=true → Allow
    └─ No permission → Show Access Denied
```

## Testing the Implementation

### 1. Test Sidebar Visibility
```javascript
// Login as Data Collector (or any non-admin role)
// Verify Programs and Activities appear in sidebar
// Click on them to navigate
```

### 2. Test Activity Dashboard Access
```javascript
// As Data Collector WITHOUT can_view permission
// Try to access /activities/1/dashboard
// Should see "Access Denied" message

// As Data Collector WITH can_view permission
// Should see the dashboard normally
```

### 3. Test Form Submission Access
```javascript
// As Data Collector WITHOUT can_edit permission
// Try to access /activities/1/fill
// Should see "Access Denied" message

// As Data Collector WITH can_edit permission
// Should be able to fill and submit the form
```

### 4. Test Role Assignment
```javascript
// Fetch permissions for an activity
curl http://localhost:3000/api/activities/1/role_permissions

// Assign new permission
curl -X POST http://localhost:3000/api/activities/1/role_permissions \
  -d '{"roleId": 2, "pageKey": "/activities/1", "canView": true, "canEdit": true}'

// Verify permission was added
curl http://localhost:3000/api/activities/1/role_permissions
```

## Next Steps (Optional Enhancements)

1. **Create Admin UI for Permission Management**:
   - Build a dedicated page for managing activity role permissions
   - Use checkboxes or toggles for each permission type
   - Display table of roles and their current permissions

2. **Add Section-Level Granularity**:
   - Extend permissions to individual form sections
   - Allow different permissions for different parts of the form
   - Currently supported but not exposed in UI

3. **Add Audit Logging**:
   - Log when permissions are granted/revoked
   - Track who made the changes and when

4. **Create Bulk Permission Assignment**:
   - Assign same permissions to multiple activities at once
   - Template-based permission sets

5. **Add Default Permissions**:
   - Define default permissions per role
   - Auto-apply when new activities are created

## Troubleshooting

### Users can't see Programs/Activities menu
- Check that sidebar is loading with `visibleToAll: true` flag
- Verify sidebar component's filter logic includes `item.visibleToAll` check

### Users get "Access Denied" unexpectedly
- Verify role permissions are set via `/api/activities/{id}/role_permissions` endpoint
- Check that roleId matches the user's assigned roles
- Admins/Super Admins should never be denied access

### Activity dashboard slow to load
- The `useActivityPermissions` hook fetches permissions on mount
- Consider caching permissions if there are many activities
- Optimize the API endpoint with database indexing on `activity_id, role_id`

## Code References

- **Navigation Types**: `components/layout/navigation.ts` - NavMenuItem interface
- **Sidebar Component**: `components/layout/Sidebar.tsx` - hasPermissionFlag() function
- **Permission Hook**: `hooks/useActivityPermissions.ts` - useActivityPermissions() hook
- **Dashboard Access**: `pages/ActivityDashboardPage.tsx` - Access check logic
- **Form Access**: `pages/FillFormPage.tsx` - Access check logic
- **Backend Endpoints**: `server/index.js` - Activity role permission endpoints (lines 6606-6664)
