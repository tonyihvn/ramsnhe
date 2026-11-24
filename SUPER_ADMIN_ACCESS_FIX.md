# Super-Admin and Admin Data Access Fix

## Problem Statement
- **Super-Admin** was not seeing all data (businesses, users, activities, programs, facilities) - the UI was restricting them to only their assigned business
- **Admin** users should see all data related to their business, but weren't consistently accessing it

## Root Cause
The data filtering logic was flawed:
```javascript
if (!isSuperAdmin || businessId) {
    // Apply business_id filter
}
```
This condition meant: "Filter if NOT super-admin OR if businessId is set". When a super-admin logged in, their `businessId` was set in the session, causing the filter to still apply.

## Solution Implemented

### 1. Enhanced Role Checking Functions
Updated `server/index.js` with:

**`isSuperAdmin(req)`**
- Async function that queries the database for the user's role
- Uses the centralized `isSuperAdminRole()` utility
- Recognizes: `super-admin`, `super_admin`, `super admin`, `superadmin`

**`isAdmin(req)`** (NEW)
- Async function for checking Admin role
- Uses the centralized `isAdminRole()` utility
- Recognizes: `admin`, `Admin`, `super-admin` (admins include super-admins in hierarchy)

### 2. Fixed Data Filtering Logic

Changed all data endpoints from:
```javascript
if (!isSuperAdmin || businessId) {
    q += ' WHERE business_id = $1 OR business_id IS NULL';
    params.push(businessId);
}
```

To:
```javascript
if (!userIsSuperAdmin && businessId) {
    q += ' WHERE business_id = $1 OR business_id IS NULL';
    params.push(businessId);
} else if (!userIsSuperAdmin) {
    q += ' WHERE business_id IS NULL';
}
// Super-admin: no WHERE clause - sees everything
```

This new logic:
- **Super-Admin**: No WHERE clause applied → sees ALL data from all businesses
- **Admin/Other roles with businessId**: Filtered to their business_id  
- **Other roles without businessId**: Only see global data (business_id IS NULL)

### 3. Endpoints Updated

#### Core Data Endpoints
1. **`GET /api/programs`** - Super-admin now sees all programs from all businesses
2. **`GET /api/activities`** - Super-admin now sees all activities from all businesses
3. **`GET /api/facilities`** - Super-admin now sees all facilities from all businesses
4. **`GET /api/users`** - Super-admin now sees all users across all businesses
5. **`GET /api/datasets`** - Super-admin now sees all datasets
6. **`GET /api/admin/datasets`** - Super-admin now sees all datasets via admin route
7. **`GET /api/admin/datasets/:id`** - Super-admin can access any dataset

#### Already Correct (No Changes Needed)
- **`GET /api/reports`** - Already had correct filtering logic using `isSuperAdmin(req)`
- **`GET /api/super-admin/users`** - Already had correct filtering logic using `isSuperAdminRole()`
- **`GET /api/super-admin/businesses`** - Already restricted to super-admin only

### 4. Access Control Hierarchy

```
Super-Admin
├── Can see all businesses
├── Can see all users across all businesses
├── Can see all activities, programs, facilities, datasets
├── Can access all routes
└── Can manage any business

Admin (per business)
├── Can see only their business's users
├── Can see only their business's activities, programs, facilities
├── Can access settings for their business
└── Cannot access other businesses' data

Other Roles
├── Access controlled by feature-level permissions
└── Typically limited to specific facilities or activities
```

## Testing Recommendations

### Super-Admin Test Cases
1. ✅ Login as Super-Admin user
2. ✅ Navigate to Users - should see ALL users from all businesses
3. ✅ Navigate to Activities - should see ALL activities from all businesses
4. ✅ Navigate to Programs - should see ALL programs from all businesses
5. ✅ Navigate to Facilities - should see ALL facilities from all businesses
6. ✅ Navigate to Datasets - should see ALL datasets
7. ✅ Navigate to any business management route - should have full access

### Admin Test Cases  
1. ✅ Login as Admin user assigned to Business A
2. ✅ Navigate to Users - should see only Business A users
3. ✅ Navigate to Activities - should see only Business A activities
4. ✅ Navigate to Programs - should see only Business A programs
5. ✅ Navigate to Settings - should access Business A settings
6. ✅ Attempt to view Business B data - should show no access or appropriate error
7. ✅ Attempt to view other business Users - should show Business A users only

### Edge Cases
1. Super-Admin with no assigned business_id - should see everything
2. Super-Admin with assigned business_id - should STILL see everything (not limited)
3. Admin with no business_id - should see nothing or only global data
4. Switching business context - data should update appropriately

## Database Impact
No database migrations required. The changes are purely application-level filtering logic.

## Configuration
No new environment variables required.

## Deployment Notes
- Backend only changes - no frontend code changes needed
- Restart the Node.js server for changes to take effect
- Test with actual super-admin and admin users before production deployment
- Monitor logs for any SQL errors during data retrieval

## Files Modified
- `server/index.js` - Updated role checking functions and data filtering logic

## Backward Compatibility
✅ Fully backward compatible - existing role data remains unchanged
✅ No data structure changes
✅ Existing queries still work with the new filtering logic
