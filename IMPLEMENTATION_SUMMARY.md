# Implementation Complete: Role-Based Activity Access Control

## Summary
I have successfully implemented a comprehensive role-based access control system for activities in your REACT application. This allows administrators to configure which roles can access specific activities and perform different actions.

## What Has Been Implemented

### 1. **Frontend Changes**

#### Navigation Updates (`components/layout/navigation.ts` & `components/layout/Sidebar.tsx`)
- Added `visibleToAll` property to navigation items
- Made Programs and Activities visible to ALL user roles (no permission check required)
- This means all logged-in users, regardless of role, can see the Programs and Activities menu items

**Key Changes:**
```typescript
// Programs and Activities now visible to all roles
{ key: 'programs', page_key: '/programs', ..., visibleToAll: true },
{ key: 'activities', page_key: '/activities', ..., visibleToAll: true },
```

#### New Permission Hook (`hooks/useActivityPermissions.ts`)
- Created `useActivityPermissions()` hook to check activity-level permissions
- Returns `checkPermission()` function to verify user access
- Automatically fetches role permissions for an activity

**Usage:**
```typescript
const { checkPermission } = useActivityPermissions(activityId);
const canView = checkPermission('can_view', `/activities/${activityId}`);
const canEdit = checkPermission('can_edit', `/activities/${activityId}`, 'section1');
```

#### Activity Dashboard Protection (`pages/ActivityDashboardPage.tsx`)
- Added permission check to prevent unauthorized access to activity dashboards
- Shows "Access Denied" message if user lacks `can_view` permission
- Admins and Super Admins bypass permission checks

#### Form Submission Protection (`pages/FillFormPage.tsx`)
- Added permission check when creating/editing form submissions
- Checks for `can_edit` permission
- Shows "Access Denied" message if user lacks permission
- Standalone forms bypass permission checks (for public submissions)

#### New Admin UI (`pages/ActivityPermissionsPage.tsx`)
- Complete management interface for activity role permissions
- Admin-only page for configuring which roles can access which activities
- Features:
  - Select an activity to manage
  - View all assigned role permissions
  - Add new role permissions
  - Edit existing permissions
  - Delete permissions
  - Checkbox controls for can_view, can_create, can_edit, can_delete
  - Real-time updates from backend API

### 2. **Backend Changes**

#### Database Infrastructure
- Created `activity_roles` table in PostgreSQL and MySQL versions
- Supports multi-tenancy with TABLE_PREFIX
- Stores per-role, per-page/section permissions

**Table Schema:**
```sql
CREATE TABLE activity_roles (
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
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

#### New API Endpoints (`server/index.js`)

**GET `/api/activities/:activityId/role_permissions`**
- Retrieve all role permissions for an activity
- Returns array of permission records with role names
- Admin-only endpoint

**POST `/api/activities/:activityId/role_permissions`**
- Create or update role permissions for an activity
- Request body: `{ roleId, pageKey, sectionKey, canView, canCreate, canEdit, canDelete }`
- Admin-only endpoint
- Upserts on activity_id, role_id, page_key, section_key combination

**DELETE `/api/activities/:activityId/role_permissions/:roleId`**
- Delete role permissions from an activity
- Optional query params: `pageKey`, `sectionKey` for granular deletion
- Admin-only endpoint

### 3. **Navigation Update** (`components/layout/navigation.ts`)
- Added new "Activity Permissions" menu item in Organization section
- Links to `/activity-permissions` page
- Admin-only visibility

### 4. **Routing** (`App.tsx`)
- Added route: `<Route path="/activity-permissions" element={<AdminRoute><Layout><ActivityPermissionsPage /></Layout></AdminRoute>} />`
- Protected by AdminRoute to ensure only admins can access

## How It Works

### Permission Flow

```
User Logs In
    ↓
Sidebar Shows Programs & Activities (visibleToAll: true)
    ↓
User Clicks Activity
    ↓
ActivityDashboardPage checks: can_view permission
    ├─ Admin/Super Admin → Automatically granted
    ├─ Has can_view=true in database → Grant access
    └─ No permission → Show "Access Denied"
    ↓
User Clicks "New" to Submit
    ↓
FillFormPage checks: can_edit permission
    ├─ Admin/Super Admin → Automatically granted
    ├─ Has can_edit=true in database → Grant access
    └─ No permission → Show "Access Denied"
```

### Admin Configuration

```
Admin User
    ↓
Navigates to /activity-permissions
    ↓
Selects Activity (e.g., "Malaria Survey")
    ↓
Clicks "Add Permission"
    ↓
Selects Role (e.g., "Data Collector")
    ↓
Checks Permission Checkboxes (can_view, can_edit, etc.)
    ↓
Saves → API creates/updates activity_roles entry
    ↓
Next time "Data Collector" user logs in:
    - Can see Activities menu
    - Can view Malaria Survey dashboard
    - Can submit responses
```

## Key Features

✅ **All Roles See Programs & Activities** - No permission checks for menu visibility
✅ **Granular Activity Permissions** - Per-role access control
✅ **Easy Admin UI** - Manage permissions without database access
✅ **Real-time Updates** - Changes apply immediately
✅ **Admin Bypass** - Admins/Super Admins always have full access
✅ **Standalone Bypass** - Public forms don't require authentication
✅ **Section-Level Support** - Prepare for future granular permissions
✅ **Multi-Database Support** - Works with PostgreSQL and MySQL

## Testing the Implementation

### Test 1: Verify All Roles See Menu
```
1. Login as any role (Data Collector, Validator, Reviewer, etc.)
2. Check sidebar
3. ✓ Programs menu should be visible
4. ✓ Activities menu should be visible
5. Click on either to navigate
```

### Test 2: Restrict Activity Access
```
1. Login as Admin
2. Go to Settings → Activity Permissions
3. Select an activity (e.g., "Health Survey")
4. Click "Add Permission"
5. Select "Data Collector" role
6. Check ONLY "Can View" (uncheck Edit/Create/Delete)
7. Save
8. Logout
9. Login as a Data Collector
10. Go to Activities → Health Survey
11. ✓ Can view dashboard
12. ✓ "New" button is disabled or "Access Denied" on /fill page
```

### Test 3: Full Access to Activity
```
1. Admin creates permission: Data Collector → Activity 1 → Can View + Can Edit + Can Create
2. Data Collector logs in
3. ✓ Can see Activity 1 in sidebar
4. ✓ Can click to view dashboard
5. ✓ Can click "New" and submit responses
6. ✓ Can edit existing submissions
```

### Test 4: API Endpoint Testing
```bash
# Get all permissions for Activity 1
curl http://localhost:3000/api/activities/1/role_permissions

# Add permission: Role 2 can view Activity 1
curl -X POST http://localhost:3000/api/activities/1/role_permissions \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 2,
    "pageKey": "/activities/1",
    "canView": true,
    "canCreate": true,
    "canEdit": true
  }'

# Delete permission
curl -X DELETE http://localhost:3000/api/activities/1/role_permissions/2
```

## File Changes Summary

### Created Files
- `hooks/useActivityPermissions.ts` - React hook for permission checking
- `pages/ActivityPermissionsPage.tsx` - Admin UI for managing permissions
- `ACTIVITY_ROLE_PERMISSIONS.md` - Complete documentation
- This file (`IMPLEMENTATION_SUMMARY.md`)

### Modified Files
- `components/layout/navigation.ts` - Added `visibleToAll` property and Programs/Activities visibility
- `components/layout/Sidebar.tsx` - Updated permission check logic
- `pages/ActivityDashboardPage.tsx` - Added access control and import
- `pages/FillFormPage.tsx` - Added access control and import
- `App.tsx` - Added route for ActivityPermissionsPage
- `server/index.js` - Added activity_roles table and 3 new API endpoints
- `server/tablePrefix.js` - Added ACTIVITY_ROLES table name

## Database Migration

The `activity_roles` table is created automatically on server startup. No manual migration needed.

If you need to manually create it:

**PostgreSQL:**
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

**MySQL:**
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

## Next Steps (Optional)

1. **Create Bulk Permission Templates**
   - Define default permission sets per role
   - Apply to multiple activities at once

2. **Add Permission History/Audit Log**
   - Track who changed permissions and when
   - Revert to previous configurations

3. **Implement Section-Level UI**
   - Allow permissions for individual form sections
   - Currently supported in API but not in UI

4. **Add Email Notifications**
   - Notify users when they're granted activity access
   - Scheduled digest of accessible activities

5. **Create Permission Presets**
   - "View Only" preset (can_view=true, others=false)
   - "Full Access" preset (all=true)
   - "Reviewer" preset (can_view=true, can_delete=true, others=false)

## Troubleshooting

### Issue: Users don't see Programs/Activities menu
**Solution**: Verify sidebar component includes `item.visibleToAll` in filter logic

### Issue: Users get "Access Denied" unexpectedly
**Solution**: Check that permissions are set correctly via ActivityPermissionsPage or API

### Issue: Admin can't access ActivityPermissionsPage
**Solution**: Verify user role is "Admin" or "Super Admin"

### Issue: New activities don't appear for users
**Solution**: Create activity_roles entry for that activity and desired roles

## Support

For issues or questions:
1. Check `ACTIVITY_ROLE_PERMISSIONS.md` for detailed documentation
2. Review API endpoint specifications
3. Verify database entries in `activity_roles` table
4. Check browser console for error messages
5. Review server logs for API errors

---

**Implementation Date**: January 3, 2026
**Status**: ✅ Complete and Ready for Use
