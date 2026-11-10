# User Roles Selection - Testing & Quick Start Guide

## Quick Start (30 seconds)

1. **Create Activity**
   - Go to Activities page
   - Click "New Activity"
   - Fill basic info (title, program, dates)
   - Select "User" from Response Type dropdown

2. **See User Roles Section**
   - A new "User Roles" box appears below Response Type
   - Shows 5 checkboxes: Admin, Form Builder, Data Collector, Viewer, Responder

3. **Select Roles**
   - Check the roles you want (e.g., "Data Collector" + "Admin")
   - Leave blank to show all users (default)

4. **Save & Test**
   - Click Save
   - Go to fill the form
   - User dropdown shows only users with selected roles

## Step-by-Step Testing

### Test 1: Basic Role Selection

**Setup**
- Have at least 3 users with different roles in system

**Steps**
1. Create Activity with Response Type = "User"
2. Select only "Data Collector" role
3. Save activity
4. Fill the form
5. Check user dropdown

**Expected Result**
- ✓ User dropdown shows only Data Collectors
- ✓ Other users are hidden
- ✓ Can submit form successfully

**Screenshots to capture**
- Activity edit modal with User Roles section checked
- Form filling page with filtered user dropdown

---

### Test 2: Multiple Roles

**Setup**
- Have users with Admin, Form Builder, Data Collector roles

**Steps**
1. Create Activity with Response Type = "User"
2. Check "Admin" AND "Form Builder"
3. Leave Data Collector, Viewer, Responder unchecked
4. Save
5. Fill form and check dropdown

**Expected Result**
- ✓ Only Admin and Form Builder users appear
- ✓ Data Collector users are filtered out
- ✓ Can select from filtered list

---

### Test 3: Backward Compatibility (No Roles Selected)

**Setup**
- Existing activity with users in system

**Steps**
1. Create Activity with Response Type = "User"
2. DO NOT select any roles (leave all unchecked)
3. Save activity
4. Fill form and check user dropdown

**Expected Result**
- ✓ ALL users appear (same as before)
- ✓ Feature works without breaking existing functionality
- ✓ Can select any user

---

### Test 4: Edit Existing Activity

**Setup**
- Activity created in Test 1

**Steps**
1. Go to Activities page
2. Edit the activity from Test 1
3. Verify User Roles checkbox states are preserved
4. Modify selection (check/uncheck different roles)
5. Save
6. Fill form again

**Expected Result**
- ✓ Previously selected roles are shown as checked
- ✓ Changes are saved
- ✓ Form dropdown reflects new role selection

---

### Test 5: Switch Between Response Types

**Setup**
- New activity

**Steps**
1. Create Activity, select Response Type = "User"
2. Select some roles (e.g., "Admin")
3. Switch Response Type to "Facility"
4. Verify User Roles section disappears
5. Switch back to "User"

**Expected Result**
- ✓ User Roles section only visible when Response Type = "User"
- ✓ Selections are preserved when switching back
- ✓ No errors in console

---

### Test 6: Form Submission

**Setup**
- Activity with 1-2 roles selected
- Multiple users with different roles

**Steps**
1. Fill the activity form
2. At "Link Entity" section, verify user dropdown
3. Select a user from filtered list
4. Fill remaining form fields
5. Submit form

**Expected Result**
- ✓ Form submits successfully
- ✓ Response is linked to correct user
- ✓ Check ActivityReport to verify userId saved

---

### Test 7: Zero Matching Users

**Setup**
- Activity with roles selected where NO users have those roles

**Steps**
1. Create Activity
2. Select "Viewer" role only (or role with no users)
3. Save
4. Fill form
5. Check user dropdown

**Expected Result**
- ✓ Dropdown is empty (shows "Select user..." only)
- ✓ Cannot submit without user selection
- ✓ Clear error message if attempted

---

## Visual Testing Checklist

### Activity Editor Modal

- [ ] Response Type dropdown visible and works
- [ ] When Response Type = "User" selected:
  - [ ] User Roles section appears below
  - [ ] Has clear header: "User Roles"
  - [ ] Shows help text
  - [ ] Shows 5 checkboxes (Admin, Form Builder, Data Collector, Viewer, Responder)
  - [ ] Checkboxes are clickable
  - [ ] Selected checkboxes show checked state
  
- [ ] When Response Type = "Facility" selected:
  - [ ] User Roles section disappears
  
- [ ] When Response Type = "User" changed back:
  - [ ] User Roles section reappears
  - [ ] Previous selections are preserved

### Form Filling Page

- [ ] Link Entity section visible
- [ ] Label shows: "Link Entity"
- [ ] When Response Type = "User":
  - [ ] Single user dropdown shown
  - [ ] Placeholder: "Select user..."
  - [ ] Only filtered users appear in options
  - [ ] User full name and email shown: "First Last (email@domain.com)"
  
- [ ] Form submission:
  - [ ] Required field validation works
  - [ ] Can submit with user selected
  - [ ] Response correctly linked to user

---

## Performance Testing

### Load Times
- [ ] Activity editor modal opens in < 1 second
- [ ] Form page loads in < 2 seconds
- [ ] User dropdown appears instantly
- [ ] No lag when checking/unchecking roles

### Memory
- [ ] No memory leaks when switching activities
- [ ] No issues with large user lists (100+ users)
- [ ] Filter performance remains instant

---

## Error Scenarios

### Scenario 1: Role name mismatch
**Test**: If user role in database doesn't match exactly (case, spelling)
- [ ] User not shown (filtering works correctly)
- [ ] No error in console
- [ ] Can see user if role matches exactly

### Scenario 2: Missing Activity data
**Test**: Activity with userRoles but no response type
- [ ] Falls back to showing all users
- [ ] No error

### Scenario 3: Deleted role
**Test**: Activity has role selected that no longer exists in UI
- [ ] Activity still editable
- [ ] Old role remains in selection (stored in DB)
- [ ] No error when filtering

---

## Cross-Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

**Checklist for each**:
- [ ] Checkboxes render correctly
- [ ] Dropdown opens/closes properly
- [ ] Form submission works
- [ ] No console errors

---

## Regression Testing

Run these to ensure nothing broke:

### Existing Activity Features
- [ ] Create Activity with Response Type = "Facility" (should work as before)
- [ ] Edit existing activities (should work as before)
- [ ] Duplicate activity (should copy userRoles)
- [ ] Archive/publish activities (should work as before)

### Form Filling
- [ ] Fill form with Response Type = "Facility" (all facilities shown)
- [ ] Fill form with Response Type = "User" and no roles set (all users shown)
- [ ] Multi-page forms work correctly
- [ ] Repeatable sections work correctly

### Data Integrity
- [ ] Form responses saved correctly
- [ ] User linking works correctly
- [ ] Reports generated correctly
- [ ] Data export includes user info correctly

---

## Success Criteria

✅ **Feature is complete when**:
1. User Roles section appears when Response Type = "User"
2. Roles can be selected/deselected
3. Form dropdown shows only selected roles
4. Form submission works with filtered users
5. Backward compatibility maintained (no roles = all users)
6. No console errors
7. All tests pass
8. No performance degradation

---

## Quick Commands

### Clear browser cache (if needed)
```
Ctrl+Shift+Delete (open DevTools > Storage > Clear all)
```

### Check user roles in console
```javascript
// After page loads with users
console.log(users.map(u => ({ name: u.firstName + ' ' + u.lastName, role: u.role })))
```

### Verify Activity is saved correctly
```javascript
// In form filling page
console.log('Activity userRoles:', activity.userRoles)
console.log('Filtered users:', getFilteredUsers())
```

---

## Reporting Issues

If you find an issue, provide:

1. **Browser & OS**: e.g., "Chrome 120 on Windows 11"
2. **Steps to reproduce**: 
   - Activity Response Type setting
   - Which roles selected
   - What action triggered issue
3. **Expected vs Actual**: What should happen vs what happened
4. **Screenshot/Video**: Visual proof of issue
5. **Console errors**: Any errors in DevTools console

---

## Summary

| Feature | Before | After |
|---------|--------|-------|
| User dropdown in forms | Shows all users | Shows filtered users (if roles selected) |
| Admin control | No role filtering | Can limit to specific roles |
| Backward compat | N/A | ✓ All users shown if no roles selected |
| Form submission | Works as before | Works as before + linked to filtered users |

