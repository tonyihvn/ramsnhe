# Fix: Profile Password Update 403 Forbidden Error

## Problem
When logged-in users tried to change their password from the `/profile` page, they received a **403 Forbidden** error with the message:
```
"Forbidden - only admins can change facility assignment"
```

## Root Cause
The `handleSave()` function in `ProfilePage.tsx` was including both `email` and `facilityId` in the update payload. Users don't have permission to modify these fields, causing the server to reject the entire request.

## Solution
Modified `pages/ProfilePage.tsx` to:

### 1. **Exclude Admin-Only Fields from Payload**
**Before:**
```typescript
const payload: any = { 
    id: currentUser.id, 
    firstName: form.firstName, 
    lastName: form.lastName, 
    email: form.email,              // ❌ Users can't modify
    facilityId: selectedFacility    // ❌ Users can't modify
};
```

**After:**
```typescript
const payload: any = { 
    id: currentUser.id, 
    firstName: form.firstName, 
    lastName: form.lastName
    // ✅ Email and facilityId removed - not sent to server
};
```

### 2. **Make Email Field Readonly**
**Before:**
```jsx
<input 
    className="mt-1 block w-full p-2 border rounded" 
    value={form.email} 
    onChange={e => setForm({ ...form, email: e.target.value })} 
/>
```

**After:**
```jsx
<input 
    className="mt-1 block w-full p-2 border rounded bg-gray-100 cursor-not-allowed" 
    value={form.email} 
    readOnly 
    disabled 
/>
<p className="text-xs text-gray-500 mt-1">
    Contact an administrator to change your email address
</p>
```

### 3. **Make Facility Field Readonly**
**Before:**
```jsx
<select 
    className="mt-1 block w-full p-2 border rounded" 
    value={selectedFacility || ''} 
    onChange={e => setSelectedFacility(e.target.value)}
>
```

**After:**
```jsx
<select 
    className="mt-1 block w-full p-2 border rounded bg-gray-100 cursor-not-allowed" 
    value={selectedFacility || ''} 
    onChange={() => {}} 
    disabled
>
<p className="text-xs text-gray-500 mt-1">
    Contact an administrator to change your facility assignment
</p>
```

## Changes Made

**File:** `pages/ProfilePage.tsx`

| Change | Line | Type |
|--------|------|------|
| Updated payload in `handleSave()` | 38-46 | Code |
| Made email field readonly | 94-97 | UI + Help Text |
| Made facility field readonly | 101-105 | UI + Help Text |

## Result

✅ Users can now successfully change their password
✅ Email field is clearly disabled with explanation
✅ Facility field is clearly disabled with explanation
✅ Only user-editable fields are sent to server
✅ No more 403 Forbidden errors

## What Users Can Still Update

Users can update:
- ✅ First Name
- ✅ Last Name
- ✅ Password
- ✅ Profile Image

Users cannot update (readonly):
- ❌ Email (contact admin)
- ❌ Facility (contact admin)

## Testing

To verify the fix works:

1. Log in as a regular user
2. Navigate to `/profile`
3. See email and facility fields are grayed out/disabled
4. Change first name, last name, or password
5. Click "Save Profile"
6. **Expected:** Success message, no errors
7. **Verify:** Profile updates successfully

## Technical Details

### User-Editable Fields
- `firstName` - User's first name
- `lastName` - User's last name
- `password` - User's login password
- `profileImage` - User's profile photo

### Admin-Only Fields
- `email` - Email address (admin only)
- `facilityId` - Facility assignment (admin only)

These admin-only fields should never be sent in the user's own profile update request.

## Backend Validation
The backend already has proper authorization checks:
- ✅ Users can only modify their own profile
- ✅ Only admins can change email
- ✅ Only admins can change facility assignment
- ✅ Proper 403 Forbidden errors for unauthorized changes

This frontend fix ensures we respect those permissions by not attempting unauthorized updates.

## Impact
- 🎯 **User Experience:** Users can now update their password without errors
- 🔒 **Security:** Clearer indication of what can/cannot be modified
- 🛡️ **Stability:** No more 403 errors from invalid payloads
- 📚 **Clarity:** Help text explains why certain fields are readonly

---

**Status:** ✅ Fixed and Ready
**Date:** November 12, 2026
