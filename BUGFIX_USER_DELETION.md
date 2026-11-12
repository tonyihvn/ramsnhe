# Bug Fix: User Deletion Not Persisting & Transaction Abort Errors

## Issues Identified
1. **User deletion was not persisting to database** - Clicking delete only removed the user from the frontend state; the user reappeared after page refresh
2. **JSON error in error handling** - Error messages sometimes displayed as `"[object Object]" is not valid JSON`
3. **PostgreSQL transaction abort error** - When deleting users, the server threw "current transaction is aborted" errors

## Root Causes
1. The `deleteUser` function in `useData.ts` was only updating the frontend state (`setUsers`) without making an API call to delete from the database
2. The server's error handler in the user POST endpoint was not properly stringifying error objects
3. The DELETE user endpoint was using a transaction with try-catch blocks that silently swallowed errors. In PostgreSQL, when a query fails inside a transaction, the entire transaction is marked as aborted, and all subsequent queries fail with "current transaction is aborted"

## Changes Made

### 1. Fixed deleteUser to call the DELETE API endpoint
**File:** `hooks/useData.ts` (line 325)

**Before:**
```typescript
const deleteUser = (id: string) => setUsers(users.filter(u => String(u.id) !== String(id)));
```

**After:**
```typescript
const deleteUser = (id: string) => handleDelete(`${API_URL}/admin/users`, id, setUsers);
```

This change now:
- Makes a DELETE request to `/api/admin/users/{id}` endpoint
- Removes the user from the database via the backend
- Removes the user from the frontend state
- Logs an audit event of the deletion
- Reloads the page after 500ms to ensure fresh data

### 2. Fixed error handling in user POST endpoint
**File:** `server/index.js` (line 6199)

**Before:**
```javascript
res.status(500).send(e.message);
```

**After:**
```javascript
res.status(500).send(typeof e.message === 'string' ? e.message : String(e));
```

This change ensures that error messages are properly stringified before being sent to the client.

### 3. Fixed transaction handling in DELETE user endpoint
**File:** `server/index.js` (lines 6203-6264)

**The Problem:**
The original code used `BEGIN` transaction with `try-catch` blocks for optional table deletions:
```javascript
await client.query('BEGIN');
// ...
try { await client.query(`DELETE FROM ${tables.USER_PREFERENCES} WHERE user_id = $1`, [id]); } 
catch (e) { /* table may not exist */ }
// ...
await client.query('COMMIT');  // This fails because transaction is aborted!
```

When a query fails inside a PostgreSQL transaction, the transaction is **permanently marked as aborted** and all subsequent queries fail, even if they're in try-catch blocks.

**The Solution:**
Removed the transaction entirely and wrapped optional delete operations in try-catch:
```javascript
// No transaction - each query is independent
try {
    await client.query(`DELETE FROM ${tables.USER_PREFERENCES} WHERE user_id = $1`, [id]);
} catch (e) {
    console.warn('Failed to delete user preferences:', e.message);
}
// If this fails, it doesn't affect other deletes
```

The critical `DELETE FROM users` operation is still not wrapped in try-catch, so if it fails, the entire deletion fails (which is correct behavior).

## How It Works
The `handleDelete` function in `useData.ts` is a generic CRUD helper that:
1. Makes a DELETE request to the provided URL with the ID appended
2. Removes the item from the frontend state on success
3. Records an audit event
4. Reloads the page after 500ms

The updated delete endpoint at `/api/admin/users/:id` is admin-protected and performs:
- Fetches user record before deletion (for audit trail)
- Safely attempts to delete related data (user roles, preferences, notes, assignments)
- Deletes the user record (this operation must succeed)
- Records audit trail of the deletion
- All operations are independent (no transaction) to avoid abort errors

## Testing
To verify the fix works:
1. Open the Users page as an Admin
2. Click the trash icon to delete a user
3. Confirm the deletion in the modal
4. Verify the user is removed from the table and no error appears
5. Refresh the page
6. Verify the user is still gone (not just removed from frontend)
7. Check browser console for any errors (should be none)
8. Check server logs - should see "User successfully deleted" message
