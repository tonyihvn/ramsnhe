# Activity Permissions Moved to Settings

## Summary of Changes

The Activity Permissions interface has been moved from the sidebar menu to the **Settings → Roles & Permissions** tab for better organization and cleaner navigation.

## What Changed

### 1. **Removed Sidebar Menu Item**
   - **File**: [components/layout/navigation.ts](components/layout/navigation.ts)
   - **Change**: Removed "Activity Permissions" menu item from Organization group
   - The item is no longer visible in the sidebar

### 2. **Removed Standalone Route**
   - **File**: [App.tsx](App.tsx)
   - **Changes**:
     - Removed import: `import ActivityPermissionsPage from './pages/ActivityPermissionsPage'`
     - Removed route: `/activity-permissions` 
   - The standalone page is no longer accessible as a direct route

### 3. **Integrated into Settings**
   - **File**: [pages/SettingsPage.tsx](pages/SettingsPage.tsx)
   - **Changes**:
     - Added new `ActivityPermissionsManager` component
     - Integrated into the "Roles & Permissions" tab
     - Now displays above the traditional Roles, Permissions, and Users management sections

### 4. **Fixed API Issues**
   - **File**: [server/index.js](server/index.js#L6608)
   - **Issues Fixed**:
     - ✅ Fixed 500 error on GET `/api/activities/:activityId/role_permissions`
     - ✅ Fixed parameter type handling (string → integer)
     - ✅ Added proper error handling and validation
     - ✅ Fixed NULL role name handling with COALESCE
     - ✅ Fixed POST endpoint to properly validate data types
     - ✅ Fixed DELETE endpoint to properly validate inputs

## Access

### Before
- Navigate via: **Sidebar → Organization → Activity Permissions**

### After
- Navigate via: **Sidebar → Settings → Roles & Permissions (top section)**

## Features Preserved

All Activity Permissions functionality remains intact:
- ✅ Select activity from dropdown
- ✅ View current role permissions in table
- ✅ Add new permissions with modal
- ✅ Edit existing permissions  
- ✅ Delete permissions
- ✅ Configure view, create, edit, delete flags
- ✅ Real-time API integration

## Benefits

1. **Organized Navigation**: Activity-level permissions grouped with other permission management
2. **Cleaner Sidebar**: Less clutter in the sidebar navigation
3. **Contextual Access**: Settings page is the natural place for admin configuration
4. **Fixed Bugs**: Resolved 500 errors on the API endpoints

## API Endpoints (Unchanged)

All endpoints continue to work as before:

```
GET    /api/activities/:activityId/role_permissions         (fetch permissions)
POST   /api/activities/:activityId/role_permissions         (create/update)
DELETE /api/activities/:activityId/role_permissions/:roleId (delete)
```

## Testing Checklist

- [ ] Navigate to Settings → Roles & Permissions
- [ ] Select an activity from the dropdown
- [ ] Verify permissions load without 500 errors
- [ ] Click "Add Permission" and create a new permission
- [ ] Verify save works and table updates
- [ ] Test delete permission
- [ ] Verify ActivityPermissionsPage.tsx is no longer accessible at `/activity-permissions`
- [ ] Check sidebar no longer shows Activity Permissions menu item

---

**Last Updated**: January 3, 2026
**Status**: Ready for Testing
