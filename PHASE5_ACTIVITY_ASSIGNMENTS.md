# Phase 5: Activity Assignment System Implementation

## Overview

This document describes the comprehensive activity assignment system implemented in Phase 5, enabling fine-grained control over which activities data collectors can view and fill out.

## Features Implemented

### 1. Activity Assignment API Endpoints

#### GET `/api/users/:userId/assigned-activities`
- **Purpose**: Fetch all activities assigned to a user
- **Authentication**: Required (user can view own, admins can view any)
- **Authorization**: 
  - Users can only view their own assignments
  - Admins and super-admins can view any user's assignments
- **Response**: Array of assigned activity objects
```json
[
  {
    "id": "1",
    "title": "Monthly Survey",
    "name": "Monthly Survey",
    "status": "published",
    "description": "...",
    "created_at": "2024-01-01T...",
    "business_id": "1"
  }
]
```

#### POST `/api/users/:userId/assign-activity`
- **Purpose**: Assign an activity to a user (Admin only)
- **Authentication**: Required (Admin/Super-Admin only via middleware)
- **Parameters**:
  - `userId` (path): User ID to assign to
  - `activityId` (body): Activity ID to assign
- **Response**: Assignment confirmation with updated list
```json
{
  "message": "Activity assigned successfully",
  "assignment": {
    "id": 1,
    "user_id": 5,
    "activity_id": 3,
    "assigned_by": 2,
    "status": "active",
    "assigned_at": "2024-01-01T..."
  },
  "assignedActivityIds": ["1", "3", "5"]
}
```

#### POST `/api/users/:userId/unassign-activity`
- **Purpose**: Remove activity assignment from a user (Admin only)
- **Authentication**: Required (Admin/Super-Admin only via middleware)
- **Parameters**:
  - `userId` (path): User ID
  - `activityId` (body): Activity ID to remove
- **Response**: Success message with updated list
```json
{
  "message": "Activity unassigned successfully",
  "assignedActivityIds": ["1", "5"]
}
```

### 2. Login Enhancement

**Endpoint**: `POST /auth/login`

The login response now includes `assignedActivityIds` array containing all activities currently assigned to the user:

```json
{
  "id": "123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "role": "Data Collector",
  "status": "Active",
  "email_verified": true,
  "approval_status": "approved",
  "facilityId": "1",
  "businessId": "1",
  "profileImage": null,
  "assignedActivityIds": ["1", "3", "5"]
}
```

### 3. UserDashboardPage Enhancements

Located in `pages/UserDashboardPage.tsx`, the dashboard now includes:

#### User Indicators Section
Three information cards at the top:
1. **Assigned Activities** - Count of total activities assigned to the user
2. **Filled Forms** - Count of forms the user has submitted
3. **Account Status** - Current status of the user (Active/Inactive)

#### Activity Assignment UI (Admin-only)
Visible only to admin and super-admin users:

1. **Currently Assigned Activities**
   - List of all activities currently assigned to the user
   - Each activity shows: Name, Status
   - Remove button to unassign the activity
   - Clicking Remove updates the list immediately

2. **Available Activities to Assign**
   - Shows all published activities not yet assigned
   - Each activity shows: Name, Status
   - Assign button to add the activity
   - Clicking Assign updates the list immediately

3. **Real-time Sync**
   - All operations communicate with backend
   - UI updates immediately after successful operation
   - Loading state prevents double-clicks
   - Error handling for network failures

#### Submitted Reports Section
- Unchanged from before - shows all reports submitted by the user
- Includes Report ID, Activity, Facility, Submission Date, Status
- View button to navigate to individual reports

### 4. Sidebar Activity Filtering

**File**: `components/layout/Sidebar.tsx`

Data collectors see only activities they've been assigned:
- Checks user role
- If Data Collector role detected, filters activities by `assignedActivityIds`
- Admins and super-admins see all published activities
- Non-data-collectors see all published activities

### 5. Password Preservation Logic

**Files**: 
- `pages/UsersPage.tsx` 
- `pages/SettingsPage.tsx`

Both user edit forms now:
- Remove the password field from the request if it's empty
- Backend only updates password if the field is present and non-empty
- Users can update other fields without accidentally resetting passwords

## Database Schema

### user_activity_assignments Table

```sql
CREATE TABLE IF NOT EXISTS dqatb_user_activity_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    assigned_by INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);
```

**Columns**:
- `id`: Primary key
- `user_id`: ID of user being assigned
- `activity_id`: ID of activity being assigned
- `assigned_by`: ID of admin who made the assignment
- `status`: Status of assignment (active, inactive, etc.)
- `assigned_at`: Timestamp of assignment creation
- `UNIQUE(user_id, activity_id)`: Prevents duplicate assignments

### user_state_access Table (Defined but not yet implemented)

```sql
CREATE TABLE IF NOT EXISTS dqatb_user_state_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    state VARCHAR(100),
    assigned_by INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, state)
);
```

## Implementation Details

### Authorization Flow

```
Admin accesses /users/:userId/dashboard
  ↓
Frontend checks currentUser role
  ↓
If Admin/Super-Admin, show Activity Assignment UI
  ↓
Admin clicks "Assign" button for activity
  ↓
Frontend sends POST /api/users/:userId/assign-activity
  ↓
Backend middleware verifies Admin role (requireAdmin)
  ↓
Backend checks if assignment already exists (409 Conflict if exists)
  ↓
Backend creates row in user_activity_assignments
  ↓
Backend returns updated assignedActivityIds list
  ↓
Frontend updates UI with new list
  ↓
Admin sees success
```

### Data Flow

```
User logs in
  ↓
Backend fetches all assigned activities
  ↓
Response includes assignedActivityIds: ["1", "3", "5"]
  ↓
Frontend stores in useMockData context (currentUser.assignedActivityIds)
  ↓
Sidebar reads from currentUser
  ↓
If User is Data Collector:
    - Filter activities to only those in assignedActivityIds
    - User sees limited activities
  ↓
If User is Admin:
    - See all published activities
    - Can navigate to /users/:userId for assignment
```

## Testing Checklist

### Setup Phase
- [ ] Database is running and accessible
- [ ] Server is running on localhost:5000
- [ ] Frontend is running on localhost:9090
- [ ] Tables are created (check PostgreSQL)

### User Registration & Login
- [ ] New user registers as "public" role
- [ ] Super-admin can login and see all users
- [ ] Admin can login and see business-scoped users
- [ ] Data collector can login and see dashboard

### Activity Assignment
- [ ] Admin opens user dashboard
- [ ] Admin can see "Assigned Activities" section
- [ ] Admin can see "Available Activities" section
- [ ] Clicking "Assign" adds activity to assignments
- [ ] Database row is created in user_activity_assignments
- [ ] assignedActivityIds list updates in UI
- [ ] Clicking "Remove" removes activity
- [ ] assignedActivityIds list updates in UI
- [ ] Database row is deleted

### Sidebar Filtering
- [ ] Super-admin sees all published activities in sidebar
- [ ] Admin sees all published activities in sidebar
- [ ] Data collector sees only assigned activities in sidebar
- [ ] Public user sees no activities in sidebar
- [ ] Unassigned data collector sees "No activities" message

### Permission Enforcement
- [ ] Non-admin cannot access assignment endpoints (403 Forbidden)
- [ ] Users cannot assign activities to themselves
- [ ] Duplicate assignments are rejected (409 Conflict)
- [ ] Invalid activity IDs are handled gracefully

### Password Preservation
- [ ] Edit user, leave password blank, click save
- [ ] Original password still works
- [ ] Edit user, enter new password, click save
- [ ] New password works
- [ ] Old password doesn't work

### Error Handling
- [ ] Network error shows appropriate message
- [ ] Invalid user ID shows 404
- [ ] Invalid activity ID shows 400
- [ ] Missing required fields shows 400

## API Usage Examples

### Assign Activity to User

```bash
curl -X POST http://localhost:5000/api/users/5/assign-activity \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"activityId": "3"}'

# Response
{
  "message": "Activity assigned successfully",
  "assignment": {...},
  "assignedActivityIds": ["1", "3", "5"]
}
```

### Get Assigned Activities

```bash
curl -X GET http://localhost:5000/api/users/5/assigned-activities \
  -H "Cookie: session=..."

# Response
[
  {
    "id": "1",
    "title": "Monthly Survey",
    "status": "published"
  },
  {
    "id": "3",
    "title": "Quarterly Assessment",
    "status": "published"
  }
]
```

### Unassign Activity

```bash
curl -X POST http://localhost:5000/api/users/5/unassign-activity \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"activityId": "3"}'

# Response
{
  "message": "Activity unassigned successfully",
  "assignedActivityIds": ["1", "5"]
}
```

## Troubleshooting

### Activities Not Showing in Sidebar
1. Check that user is logged in
2. Check role is correctly set to "Data Collector"
3. Check assignedActivityIds is populated after login
4. Verify user_activity_assignments table has rows
5. Check database connection

### Assignment Button Not Working
1. Verify user is Admin or Super-Admin
2. Check browser console for errors
3. Verify server is running
4. Check /api/users/:userId/assign-activity endpoint is accessible
5. Check requireAdmin middleware is working

### Dashboard Shows No Users
1. Verify you're logged in as Admin
2. Check /api/users endpoint returns data
3. Verify business_id filtering is correct
4. Check database has users

### Password Not Changing
1. Verify password field is not empty
2. Check backend receives password in request
3. Verify bcrypt is working (check server logs)
4. Try setting a new password explicitly

## Future Enhancements

### Phase 5 Continuation
- [ ] State-level access API endpoints
- [ ] State-based data filtering
- [ ] Bulk activity assignment
- [ ] Remove facility auto-assignment to data collectors
- [ ] Add audit logging for assignments
- [ ] Add expiration dates for assignments
- [ ] Add assignment confirmation notifications

### Performance Optimization
- [ ] Cache assigned activities client-side
- [ ] Batch assignment operations
- [ ] Pagination for large activity lists
- [ ] Lazy load assignment UI

### UX Improvements
- [ ] Drag-and-drop assignment
- [ ] Search available activities
- [ ] Filter by activity type/program
- [ ] Activity assignment history
- [ ] Assignment templates/presets
