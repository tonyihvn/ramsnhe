# User Roles Selection for Activity Forms

## Overview

This feature enables administrators to specify which user roles should appear in the user dropdown when filling forms with `responseType='User'`. This provides fine-grained control over which users can be associated with form responses.

## Feature Description

When creating or editing an Activity with `Response Type = "User"`, administrators can now select specific user roles that will appear in the dropdown when the form is filled. This allows:

- **Granular Control**: Only users with selected roles appear in the form's user dropdown
- **Backward Compatibility**: If no roles are selected, all users are shown (maintains existing behavior)
- **Multi-select Interface**: Easy checkbox-based selection of roles

## Implementation Details

### Type Changes

**File**: `types.ts`

Added new optional field to `Activity` interface:
```typescript
userRoles?: string[]; // Selected user roles that will appear in dropdown when responseType is 'User'
```

### UI Changes

#### Activity Form Editor (ActivitiesPage.tsx)

When `responseType='User'` is selected, a new section appears:

```
User Roles
Select which user roles will appear in the dropdown when this form is filled. 
Leave empty to show all users.

☐ Admin
☐ Form Builder
☐ Data Collector
☐ Viewer
☐ Responder
```

**Location**: Lines 446-468 in `ActivitiesPage.tsx`

**Features**:
- Checkboxes for each available role: Admin, Form Builder, Data Collector, Viewer, Responder
- Only visible when `responseType='User'` is selected
- Help text explaining the feature
- Clear styling with border and background for visibility

### Form Filling Changes (FillFormPage.tsx)

#### Helper Function
Added `getFilteredUsers()` at line 467 that:
- Returns all users if no roles are specified (`activity.userRoles` is empty or undefined)
- Filters users by `activity.userRoles` if specified
- Maintains backward compatibility

```typescript
const getFilteredUsers = () => {
    if (!activity?.userRoles || activity.userRoles.length === 0) {
        return users;
    }
    return users.filter(u => activity.userRoles?.includes(u.role));
};
```

#### User Dropdown Update
Updated three locations in the user selection dropdown (line ~1618-1633) to use `getFilteredUsers()` instead of raw `users` array:

1. When `responseType='user'` (primary case)
2. When `responseType` is neither facility nor user (both optional dropdowns)

## Usage Guide

### For Administrators

#### Setting Up User Roles

1. Navigate to Activities page
2. Create a new Activity or edit existing Activity with `Response Type = "User"`
3. In the Edit Activity modal:
   - Select "User" from Response Type dropdown
   - A new "User Roles" section will appear
   - Check the roles that should be selectable when filling this form
   - Leave all unchecked to show all users (default behavior)
4. Click Save

#### Example Scenarios

**Scenario 1: Only Data Collectors**
- Use case: Form should only be filled for specific data collection staff
- Action: Check only "Data Collector" role

**Scenario 2: Admin and Form Builder Only**
- Use case: Form is for internal team use
- Action: Check "Admin" and "Form Builder" roles

**Scenario 3: All Users Except Viewers**
- Use case: Form response can be from most users but not viewers
- Action: Check Admin, Form Builder, Data Collector, Responder (leave Viewer unchecked)

### For End Users

When filling a form with `responseType='User'` and roles are configured:

1. Form displays "Link Entity" section with user dropdown
2. Dropdown shows only users matching the selected roles
3. User selects one from the filtered list
4. Form submission associates the response with selected user

## Database Persistence

The `userRoles` array is:
- Saved to activity's `userRoles` field in database
- Loaded when activity is fetched from backend
- Preserved through activity edits and duplications
- Optional field (defaults to `undefined` if not set)

## Backward Compatibility

✅ **Fully backward compatible**:
- Existing activities without `userRoles` defined will show all users (current behavior)
- No data migration needed
- Existing form responses are unaffected
- Can enable feature on new activities without impacting old ones

## Testing Checklist

### Activity Editor
- [ ] Create activity with `responseType='User'`
- [ ] Verify "User Roles" section appears
- [ ] Verify all 5 roles are displayed (Admin, Form Builder, Data Collector, Viewer, Responder)
- [ ] Test checking/unchecking roles
- [ ] Verify unchecked state when switching back to "Facility" response type
- [ ] Save activity with roles selected
- [ ] Edit activity and verify roles are restored
- [ ] Create activity without selecting any roles
- [ ] Verify activity saves successfully with empty roles

### Form Filling
- [ ] Fill form with activity having selected roles
- [ ] Verify dropdown shows only users with selected roles
- [ ] Verify user count in dropdown matches expected filtered list
- [ ] Fill form with activity having no roles selected
- [ ] Verify dropdown shows all users (backward compatibility)
- [ ] Submit form and verify response is correctly linked to selected user
- [ ] Test with different role combinations

### Edge Cases
- [ ] Activity with 0 users matching selected roles (should show empty dropdown)
- [ ] Activity with all users matching selected roles (should show all)
- [ ] Activity where selected role doesn't exist in system (graceful handling)
- [ ] Change responseType from User to Facility and back

## Technical Implementation Notes

### Performance Considerations

- Filtering happens client-side in `getFilteredUsers()`
- No backend changes required
- Filter operation is O(n) where n = number of users (typically small set)
- No additional API calls needed

### State Management

- `userRoles` is part of Activity object from backend
- No new Redux actions or context needed
- UI state managed via Activity in modal
- Changes saved through existing save mechanism

### CSS Considerations

- User Roles section uses standard Tailwind styling
- Border and background: `border border-gray-300 rounded-md p-3 bg-gray-50`
- Matches existing form styling patterns
- Responsive on all screen sizes

## Known Limitations

1. Only supports roles already defined in system (hardcoded list)
2. Cannot create dynamic roles through this UI (roles managed elsewhere)
3. No LDAP/directory integration (handled separately)
4. Case-sensitive role matching (roles must match exactly in database)

## Future Enhancements

- [ ] Add role search/filter if role list becomes large
- [ ] Support role groups (role sets pre-configured)
- [ ] Add "Select All" / "Deselect All" buttons
- [ ] Integrate with permission system for conditional role visibility
- [ ] Add activity-level permissions for role configuration (only allow specific admins)
- [ ] Audit logging for role configuration changes

## Troubleshooting

### Users not appearing in dropdown

**Problem**: Selected roles but dropdown is still empty when filling form

**Solutions**:
1. Verify users exist in system with selected roles
2. Check that user role names match exactly (case-sensitive)
3. Verify activity was saved with roles selected
4. Try reloading the page
5. Check browser console for errors

### All users showing despite role selection

**Problem**: Role filtering not working, all users appear

**Solutions**:
1. Verify `getFilteredUsers()` is being called
2. Check that `activity.userRoles` is populated
3. Verify roles array is not empty
4. Check for JavaScript errors in console
5. Refresh page and try again

### Cannot see User Roles section

**Problem**: User Roles section doesn't appear in edit modal

**Solutions**:
1. Ensure Response Type is set to "User" before saving
2. Verify modal is fully loaded
3. Check browser developer tools for rendering errors
4. Try refreshing the page

## Files Modified

1. **types.ts**
   - Added `userRoles?: string[]` to Activity interface

2. **pages/ActivitiesPage.tsx**
   - Added User Roles UI section (lines 446-468)
   - Conditional rendering based on responseType

3. **pages/FillFormPage.tsx**
   - Added `getFilteredUsers()` helper function
   - Updated 3 locations where users are displayed to use filtered users

## Commit Information

**Commit Hash**: e13998e  
**Author**: Copilot  
**Date**: [Current date]  
**Files Changed**: 4  
**Insertions**: 36

## References

- User type definition in types.ts includes `role: UserRole`
- Activity type definition with new optional userRoles field
- FillFormPage user selection logic around line 1618
- ActivitiesPage modal form around line 400-450
