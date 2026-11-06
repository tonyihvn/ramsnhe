# Testing Guide - Remove localStorage Dependencies

## Overview
This document provides comprehensive testing instructions for the new User Preferences system that replaced all localStorage dependencies.

## Architecture

### Data Flow
```
Frontend (React) 
    ↓
useServerPreferences() Hook 
    ↓
/api/user-preferences/* Endpoints 
    ↓
PostgreSQL user_preferences Table 
    ↓ (secure, persistent)
[user's preferences across all devices]
```

### Comparison: Before vs After

#### BEFORE (localStorage)
- Data stored in browser (client-side)
- Lost when cache cleared or browser data deleted
- Not accessible across devices
- Prone to manipulation via dev tools
- Not auditable

#### AFTER (Server Preferences)
- Data stored in PostgreSQL (server-side)
- Persists indefinitely
- Accessible across devices and browsers
- Secure - requires authentication
- Fully auditable via server logs

## Testing Checklist

### 1. Server Endpoints Exist

Test that all new endpoints are registered:

```bash
# These should return 401 (Unauthorized) if not logged in, not 404 (Not Found)

# Get all preferences
curl -i http://localhost:3000/api/user-preferences

# Get specific preference
curl -i http://localhost:3000/api/user-preferences/test_key

# Set preference
curl -i -X POST http://localhost:3000/api/user-preferences/test_key \
  -H "Content-Type: application/json" \
  -d '{"value": {"data": "test"}}'

# Delete preference
curl -i -X DELETE http://localhost:3000/api/user-preferences/test_key
```

**Expected Results**:
- 401 (not 404) = endpoint exists but requires auth ✓
- 404 = endpoint doesn't exist ✗

### 2. Database Table Created

Test that the table was created during server startup:

```sql
-- Connect to your PostgreSQL database
psql -U postgres -d dqappdb

-- List tables
\dt user_preferences

-- Check table structure
\d user_preferences

-- Should see:
-- id (serial primary key)
-- user_id (integer FK -> users)
-- preference_key (varchar(255))
-- preference_value (jsonb)
-- created_at (timestamp)
-- updated_at (timestamp)
-- Unique constraint on (user_id, preference_key)
```

### 3. Hook Works in React

Test the useServerPreferences hook in browser console:

```javascript
// In browser, after app loads:

// Import the hook (if using development mode)
// This tests that the hook exists and can be instantiated
const hook = await fetch('/api/user-preferences')
  .then(r => r.json() || { error: 'Unauthorized' })
  .then(d => { console.log('Hook test:', d); return d; });

console.log('Hook response:', hook);
```

### 4. Set and Retrieve Preferences

After logging in to the application:

```javascript
// Test setting a preference (in browser console)
fetch('/api/user-preferences/test_color', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ value: 'blue' })
})
.then(r => r.json())
.then(d => console.log('Set preference:', d));

// Test retrieving it
fetch('/api/user-preferences/test_color', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('Get preference:', d));

// Test deleting it
fetch('/api/user-preferences/test_color', {
  method: 'DELETE',
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('Delete preference:', d));
```

**Expected Flow**:
1. Set returns `{ key: 'test_color', value: 'blue' }` ✓
2. Get returns `{ key: 'test_color', value: 'blue' }` ✓
3. After delete, Get returns `{ key: 'test_color', value: null }` ✓

### 5. Form Builder Permissions Work

Test that permission overrides are saved to server (not localStorage):

**Steps**:
1. Open `/activities/build/1` 
2. Click on a page or section to set role permissions
3. Set permissions for a role (e.g., can_create: true, can_edit: true, etc.)
4. Click "Save"
5. Should see alert: "Permissions saved."
6. **Check database**:
   ```sql
   SELECT * FROM user_preferences 
   WHERE preference_key = 'page_permissions_overrides' 
   AND user_id = YOUR_USER_ID;
   ```
7. Should see the permissions stored as JSONB
8. Refresh the page - permissions should still appear
9. **Verify localStorage is empty**:
   ```javascript
   localStorage.getItem('page_permissions_overrides'); // Should be null
   ```

### 6. Cross-Device Persistence

Test that preferences persist across devices:

**Steps**:
1. Log in on Device A (or Browser A)
2. Set a preference: `setPreference('my_theme', 'dark')`
3. Log in on Device B (or Browser B with same account)
4. Check preference: `getPreference('my_theme')` → Should return 'dark' ✓
5. Preferences follow the user, not the device ✓

### 7. JSONB Value Support

Test that complex JSON objects are stored:

```javascript
// Test complex object
const complexData = {
  name: 'Test Config',
  settings: {
    theme: 'dark',
    notifications: true,
    limits: [1, 2, 3]
  },
  nested: {
    deep: {
      value: 42
    }
  }
};

// Save it
fetch('/api/user-preferences/complex_config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ value: complexData })
})
.then(r => r.json())
.then(d => {
  console.log('Stored complex object:', d);
  return d;
})
.then(d => {
  // Verify it round-tripped correctly
  console.log('Deep value:', d.value.nested.deep.value); // Should be 42
});
```

**Expected**: Complex objects survive round-trip intact ✓

### 8. No More localStorage References

Verify localStorage is not used in critical code:

```bash
# Search for localStorage references (should only be in other components)
grep -r "localStorage" src/pages/BuildFormPage.tsx 
# Result: Should have NO matches in BuildFormPage.tsx ✓

grep -r "localStorage" src/utils/conditionEvaluator.ts
# Result: Should have NO matches ✓

# Other files that still use localStorage (for now) - should migrate later:
grep -r "localStorage" src/components/BusinessSwitcher.tsx
grep -r "localStorage" src/hooks/useTheme.tsx
# These can be migrated in follow-up work
```

### 9. Unique Constraint Works

Test that setting same preference twice updates instead of duplicating:

```sql
-- After setting a preference twice via API:
SELECT COUNT(*) FROM user_preferences 
WHERE user_id = 1 AND preference_key = 'test_key';

-- Result: 1 (not 2) ✓
-- The unique constraint prevents duplicates
```

### 10. Authentication Required

Verify unauthenticated requests are rejected:

```bash
# Without credentials - should return 401
curl -X GET http://localhost:3000/api/user-preferences

# Expected: 401 Unauthorized ✓

# With valid session - should return 200
curl -X GET http://localhost:3000/api/user-preferences \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json"

# Expected: 200 OK with data ✓
```

## Integration Testing

### Test 1: Form Builder → Permission Persistence

```
Given: User is in form builder
When: User sets role permissions for a page/section
And: User clicks "Save"
Then: Permissions are stored in user_preferences table
And: Page persists after browser refresh
And: localStorage does NOT contain the permissions
```

### Test 2: Multi-Page Flow

```
Given: User sets a preference on page A
When: User navigates to page B
And: Data is fetched from server
Then: Preference is available on page B
And: Same value across pages
```

### Test 3: Logout/Login Flow

```
Given: User is logged in and sets preferences
When: User logs out
And: Same user logs back in
Then: Preferences are restored from server
And: Preferences are identical to before logout
```

## Performance Testing

### Test: Load Time Impact

Before and after adding server preference calls:

```bash
# Measure page load time in browser DevTools
# Should be minimal (<50ms added for preference load)

# Check network tab for:
# - /api/user-preferences (GET) - should be cached if unchanged
# - Response should be <10ms
```

### Test: Database Performance

```sql
-- Check index usage on preferences table
EXPLAIN ANALYZE SELECT * FROM user_preferences 
WHERE user_id = 1;

-- Should use index on (user_id, preference_key)
-- Query time should be <1ms
```

## Troubleshooting

### Issue: API returns 404

**Cause**: Endpoints not registered on server
**Fix**: 
```bash
# Check server logs for initialization errors
# Verify server restarted after code changes
# Check that routes are added before app.listen()
```

### Issue: Preferences not saving

**Cause**: Database table doesn't exist
**Fix**:
```bash
# Ensure migrations ran at startup
# Check server logs for table creation
# Manually run: CREATE TABLE IF NOT EXISTS user_preferences (...)
```

### Issue: 401 errors when logged in

**Cause**: Session not being passed in requests
**Fix**:
```javascript
// Add credentials to fetch calls
fetch('/api/user-preferences', {
  credentials: 'include', // Include session cookie
  // ... other options
})
```

## Files to Review

- ✅ `server/index.js` - New endpoints (lines 5910-5990)
- ✅ `server/tablePrefix.js` - Table definition
- ✅ `server/initializeSetup.js` - Table creation
- ✅ `hooks/useServerPreferences.ts` - Frontend hook
- ✅ `pages/BuildFormPage.tsx` - Usage example
- ✅ `utils/conditionEvaluator.ts` - Removed localStorage

## Rollback Plan

If issues arise, to rollback:

```bash
# Revert to previous commit
git revert 2f71bc8

# Or reset if not pushed
git reset --hard HEAD~1
```

## Success Criteria

- [ ] All endpoints return 401 (not 404) when unauthenticated
- [ ] Preferences save to PostgreSQL user_preferences table
- [ ] Permissions persist after page refresh
- [ ] No localStorage references in BuildFormPage.tsx
- [ ] No localStorage references in conditionEvaluator.ts
- [ ] Form builder permissions work as before
- [ ] Build passes with no new errors
- [ ] API requests complete in <100ms
- [ ] Database queries use proper indexes
- [ ] Complex JSONB objects round-trip correctly

---

**Last Updated**: 2024-11-06
**Status**: Ready for Testing
