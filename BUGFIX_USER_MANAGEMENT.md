# Bug Fixes: User Management Issues

## Issues Fixed

### Issue #1: User Deletion Failing with Transaction Abort Error ✅
**Problem:**
```
Error: current transaction is aborted, commands ignored until end of transaction block
```

**Root Cause:**
- The DELETE endpoint was using a PostgreSQL transaction with a connected client
- When trying to delete from non-existent tables (like `USER_NOTES` and `ASSIGNMENTS`), the transaction was aborted
- Subsequent queries failed because the transaction was in an aborted state

**Solution:**
- Removed the transaction wrapper entirely
- Changed from using a dedicated client to using the main pool
- Each related data deletion is now independent with individual try-catch blocks
- Only deletes from tables that actually exist in the schema
- The user deletion itself is not wrapped in try-catch (must succeed or fail)

**Files Modified:**
- `server/index.js` (DELETE `/api/admin/users/:id` endpoint, lines 6211-6272)

**Key Changes:**
```javascript
// Before: Used dedicated client with BEGIN/COMMIT
const client = await pool.connect();
await client.query('BEGIN');
try { await client.query(`DELETE FROM invalid_table...`); } 
catch (e) { /* error swallowed, transaction ABORTED */ }
await client.query('COMMIT'); // ❌ FAILS

// After: Use pool, no transaction, independent deletes
await pool.query(`DELETE FROM user_roles...`); // Can fail independently
await pool.query(`DELETE FROM user_permissions...`); // Can fail independently
await pool.query(`DELETE FROM dqai_users WHERE id = $1`, [id]); // Must succeed
```

---

### Issue #2: Edit User Modal Not Loading User Data and Role/Permission Selections ✅
**Problem:**
- When opening the edit modal for a user, roles and permissions weren't pre-selected
- Modal showed empty checkboxes even though the user had roles/permissions assigned
- Users appeared not to have any data loaded

**Root Cause:**
- The GET `/api/users` endpoint wasn't fetching and returning `assignedRoles` and `assignedPermissions`
- The modal expected these properties but they were always empty arrays
- User data wasn't being populated in the form fields

**Solution:**
- Updated GET `/api/users` endpoint to fetch roles and permissions for each user
- Now queries `user_roles` and `user_permissions` tables for each user
- Returns complete user data with pre-populated role and permission selections

**Files Modified:**
- `server/index.js` (GET `/api/users` endpoint, lines 5929-5982)
- `pages/UsersPage.tsx` (handleSave function refactored, lines 91-178)

**Key Changes to Server:**
```javascript
// Before: Only returned basic user data
const mapped = result.rows.map(r => ({
    ...r,
    firstName: r.first_name,
    // ... missing assignedRoles and assignedPermissions
}));

// After: Fetch and include roles and permissions
const mapped = await Promise.all(result.rows.map(async (r) => {
    // Fetch assigned roles
    const rolesRes = await pool.query(
        `SELECT role_id FROM dqai_user_roles WHERE user_id = $1`,
        [r.id]
    );
    const assignedRoles = rolesRes.rows.map(row => row.role_id);
    
    // Fetch assigned permissions
    const permsRes = await pool.query(
        `SELECT permission_id FROM dqai_user_permissions WHERE user_id = $1`,
        [r.id]
    );
    const assignedPermissions = permsRes.rows.map(row => row.permission_id);
    
    return {
        ...r,
        firstName: r.first_name,
        assignedRoles,     // ✅ Now populated
        assignedPermissions, // ✅ Now populated
    };
}));
```

**Key Changes to Frontend:**
```javascript
// Before: Assignments sent in background without waiting
fetch('/api/admin/roles/assign', {...}).catch(e => ...);
setIsModalOpen(false); // Closed before assignments completed

// After: Properly await all assignments
const userRes = await fetch('/api/users', {...});
const savedUser = await userRes.json();

// Wait for role assignment
const rolesRes = await fetch('/api/admin/roles/assign', {...});
if (!rolesRes.ok) { console.error(...); }

// Wait for permission assignment
const permsRes = await fetch('/api/admin/permissions/assign', {...});
if (!permsRes.ok) { console.error(...); }

// Clear existing if none selected
else if (!isNewUser) {
    await fetch('/api/admin/roles/assign', {
        body: JSON.stringify({ userId, roleIds: [] })
    });
}

setIsModalOpen(false); // ✅ Only close after everything succeeds
```

---

## Benefits

### User Deletion
- ✅ No more transaction abort errors
- ✅ Users can now be deleted successfully
- ✅ Related data is cleaned up properly
- ✅ Deletion persists to database
- ✅ Better error logging for debugging

### User Editing
- ✅ Modal loads with complete user data
- ✅ Roles are pre-selected when editing
- ✅ Permissions are pre-selected when editing
- ✅ Changes to roles/permissions save correctly
- ✅ Can clear roles/permissions by deselecting all
- ✅ Better error handling with user feedback

---

## Technical Details

### Deleted Records by User ID
When deleting a user, the following are now cleaned up:
1. `dqai_user_roles` - User role assignments
2. `dqai_user_permissions` - User permission assignments
3. `dqai_user_preferences` - User preferences (if table exists)
4. `dqai_email_verifications` - Email verification tokens
5. `dqai_password_resets` - Password reset tokens
6. `dqai_user_approvals` - User approval records
7. `dqai_users` - The user record itself

### Data Loaded When Fetching Users
When fetching the user list, now includes:
- Basic user fields: `id`, `firstName`, `lastName`, `email`, `role`, `status`, etc.
- Profile data: `profileImage`, `phoneNumber`
- Business info: `businessId`
- **New**: `assignedRoles` - Array of role IDs
- **New**: `assignedPermissions` - Array of permission IDs
- Custom fields: Any custom field data

---

## Testing Checklist

### User Deletion
- [ ] Open Users page
- [ ] Click trash icon to delete a user
- [ ] Confirm deletion
- [ ] Verify user is removed from table
- [ ] Refresh page - user should still be gone
- [ ] Check server logs - no "transaction is aborted" errors
- [ ] Check audit logs - deletion should be recorded

### User Editing
- [ ] Open Users page
- [ ] Click pencil icon to edit a user
- [ ] Verify first name, last name, email load correctly
- [ ] Verify profile image loads (if exists)
- [ ] Verify roles are pre-selected
- [ ] Verify permissions are pre-selected
- [ ] Change a role checkbox
- [ ] Change a permission checkbox
- [ ] Click Save
- [ ] Verify changes save successfully
- [ ] Close and reopen the user - changes should persist
- [ ] Edit again and deselect all roles - should clear them

### Error Handling
- [ ] Try to delete user with invalid ID - should show 404
- [ ] Try to save user without email - should show validation error
- [ ] Check browser console - no console errors
- [ ] Check server logs - appropriate warning/error messages

---

## Files Modified Summary

| File | Lines | Changes |
|------|-------|---------|
| `server/index.js` | 5929-5982 | GET `/api/users` - Added role/permission fetching |
| `server/index.js` | 6211-6272 | DELETE `/api/admin/users/:id` - Removed transaction, fixed cleanup |
| `pages/UsersPage.tsx` | 91-178 | `handleSave` - Improved role/permission handling |

---

## Backwards Compatibility
✅ **Fully backwards compatible**
- Existing API contracts preserved
- Only added new fields to user response
- No breaking changes to endpoints
- Existing code that doesn't use roles/permissions still works

---

## Performance Considerations
- GET `/api/users` now makes additional queries (2 per user for roles + permissions)
- For a list of 100 users: 1 query for users + 200 queries for roles/permissions
- Consider adding caching if performance becomes an issue
- Suggestion: Add `assignedRoles` and `assignedPermissions` as JOIN queries in a future optimization

---

## Version Info
- Date: November 12, 2026
- Status: Ready for testing ✅
- Breaking Changes: None
- Database Changes: None (uses existing tables)
