# User Creation with Roles/Permissions Fix

## Issue
When creating new users with role and permission assignments, the application was returning errors:
- `POST /api/admin/roles/assign 400 (Bad Request)`
- `POST /api/admin/permissions/assign 400 (Bad Request)`
- `POST /api/users 500 (Internal Server Error)`
- "Failed to save user "[object Object]" is not valid JSON"

## Root Cause
The UsersPage.tsx was attempting to assign roles and permissions to users **before** the user was created and had an ID:

```javascript
// WRONG - userData.id is undefined for new users
saveUser(userData as User);  // Async operation, doesn't wait
if (assignedRoles && assignedRoles.length > 0) {
  fetch('/api/admin/roles/assign', {
    body: JSON.stringify({ userId: userData.id, roleIds: assignedRoles })  // userData.id is undefined!
  });
}
```

The backend API requires a valid `userId`:
```javascript
// In server/index.js
if (!userId) return res.status(400).json({ error: 'Missing userId' });
```

## Solution
Implemented proper async flow for new vs. existing users:

### For New Users:
1. Make direct fetch call to `/api/users` (not through hook)
2. Wait for the response
3. Extract the returned user ID
4. Use that ID to assign roles/permissions

```javascript
if (!userData.id) {
  // New user: save first, get ID, then assign roles/permissions
  const res = await fetch('/api/users', { ... });
  if (res.ok) {
    const savedUser = await res.json();
    const userId = savedUser.id;  // Now we have the ID!
    
    // Assign roles with the returned ID
    if (assignedRoles && assignedRoles.length > 0) {
      fetch('/api/admin/roles/assign', {
        body: JSON.stringify({ userId, roleIds: assignedRoles })
      });
    }
  }
}
```

### For Existing Users:
- Continue using the hook (userData.id already exists)
- Can assign roles/permissions in parallel since ID is known upfront

## Changes Made

**File:** `pages/UsersPage.tsx`
- Lines 98-182: Refactored `handleSave` function
  - Split logic for new users (must wait for save first)
  - Keep parallel flow for existing users (ID already known)
  - Added error handling and user feedback
  - Added `.catch()` handlers to prevent unhandled rejections

## Key Improvements

✅ **Proper sequencing** - New users are saved before role assignment
✅ **Error handling** - Alert user if save fails, prevents orphaned DB operations
✅ **Better UX** - Users get immediate feedback on failures
✅ **Promise handling** - All fetch calls have `.catch()` handlers
✅ **Backward compatible** - Existing user edit flow unchanged

## Testing

### Test New User Creation:
1. Click "New User" button in Users page
2. Fill in name, email, password
3. Assign one or more roles
4. Assign one or more permissions
5. Click Save
6. Expected: User created, roles/permissions assigned, modal closes, user appears in list

### Test Existing User Edit:
1. Click edit icon on an existing user
2. Modify name or other fields
3. Add/remove roles and permissions
4. Click Save
5. Expected: User updated with new roles/permissions

### Error Cases:
1. Try to save without email
2. Try to save with existing email
3. Expected: Error message displayed, user can retry

## Related Issues
- Fixes: API 400/500 errors on user creation
- Fixes: "[object Object] is not valid JSON" error
- Related to: Role and permission management

## Code Quality
- No new dependencies added
- Uses existing fetch patterns in codebase
- Consistent with other async operations in the app
- Maintains type safety with User interface

## Performance Impact
- Negligible - still 2-4 API calls for new users
- Single additional sequential fetch for user creation
- No database performance impact (proper indexing expected on user IDs)
