# Quick Start Guide: Activity Role-Based Access Control

## What's New?

Your application now has complete role-based access control for activities:

1. **All user roles can see Programs & Activities** in the sidebar
2. **Admins can control which roles** can access specific activities
3. **Users can only access activities** they have permission for
4. **Three permission levels**: View Dashboard, Submit Responses, Edit Responses

## Quick Setup

### Step 1: Login as Admin
- Use your admin account
- You should see a new menu item: **Settings → Activity Permissions**

### Step 2: Configure Activity Access
1. Go to **Settings → Activity Permissions**
2. Select an activity from the dropdown
3. Click **"Add Permission"**
4. Select a role (e.g., "Data Collector")
5. Check the permissions:
   - ✓ Can View Activity Dashboard
   - ✓ Can Create Submissions
   - ✓ Can Edit Submissions
   - ✓ Can Delete Submissions
6. Click **Save**

### Step 3: Test as User
1. Logout
2. Login as a Data Collector
3. Go to Activities
4. You should see the activity you just configured
5. Click on it to view the dashboard
6. Click "New" to submit a response

## Admin Interface Overview

### Activity Permissions Page (`/activity-permissions`)

**Available to**: Admins and Super Admins only

**Features**:
- Activity selector dropdown
- View all role permissions for selected activity
- Add new permissions
- Edit existing permissions
- Delete permissions

**Permission Columns**:
- Role: Which role is getting permission
- View: Can access activity dashboard
- Create: Can submit new responses
- Edit: Can modify responses
- Delete: Can remove responses

## API Reference (For Integration)

### Get Permissions
```bash
GET /api/activities/1/role_permissions
```

### Add/Update Permission
```bash
POST /api/activities/1/role_permissions
Content-Type: application/json

{
  "roleId": 2,
  "pageKey": "/activities/1",
  "canView": true,
  "canCreate": true,
  "canEdit": true,
  "canDelete": false
}
```

### Delete Permission
```bash
DELETE /api/activities/1/role_permissions/2
```

## Common Scenarios

### Scenario 1: Data Collection Only
Allow Data Collectors to submit responses but not view analytics

```
Activity: Health Survey
Role: Data Collector
- Can View: ✓ (to see the form)
- Can Create: ✓ (to submit)
- Can Edit: ✗ (no changes after submission)
- Can Delete: ✗ (no deletion)
```

### Scenario 2: View and Review
Allow Validators to view responses and provide feedback

```
Activity: Health Survey
Role: Validator
- Can View: ✓ (dashboard/analytics)
- Can Create: ✗ (no submissions)
- Can Edit: ✓ (add feedback/scores)
- Can Delete: ✗ (preserve data)
```

### Scenario 3: Full Control
Allow Form Builders to manage the activity completely

```
Activity: Health Survey
Role: Form Builder
- Can View: ✓
- Can Create: ✓
- Can Edit: ✓
- Can Delete: ✓
```

## Menu Visibility

**All roles see in sidebar:**
- Programs
- Activities

**Other menus remain permission-controlled** based on page_permissions table

## User Experience Flow

```
User Opens App
    ↓
Sidebar shows Programs & Activities (always visible)
    ↓
User clicks Activities
    ↓
Shows ONLY activities they have permission for
    ↓
User clicks on Activity
    ↓
If no can_view permission → "Access Denied"
If has can_view → Shows dashboard
    ↓
If no can_edit permission → "New" button disabled
If has can_edit → Can submit responses
```

## Database Info

**Table**: `activity_roles` (created automatically)

**Columns**:
- activity_id: Which activity
- role_id: Which role
- page_key: URL pattern (e.g., /activities/1)
- section_key: Optional section-level control
- can_view: Boolean
- can_create: Boolean
- can_edit: Boolean
- can_delete: Boolean
- created_at: Timestamp

## Important Notes

✓ **Admins Always Have Access** - Admin and Super Admin roles bypass all permission checks

✓ **Real-time Updates** - Permission changes apply immediately (no server restart needed)

✓ **Public Forms Unaffected** - Standalone/public form submissions don't require permissions

✓ **Backward Compatible** - Existing activities work fine, just create permissions as needed

✓ **Multi-Database Support** - Works with PostgreSQL and MySQL

## Troubleshooting

### "I don't see the Activity Permissions menu"
→ Make sure you're logged in as Admin or Super Admin

### "Users can't see activities"
→ Create a permission in Activity Permissions UI (just need can_view=true)

### "Users can view but not submit"
→ Make sure can_edit permission is checked

### "Permissions aren't changing"
→ Clear browser cache (Ctrl+Shift+Delete)
→ Verify permission was saved (check database)

## Support Resources

- Full documentation: `ACTIVITY_ROLE_PERMISSIONS.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Code examples: Review `ActivityPermissionsPage.tsx`

## Next Steps

1. **Configure Your First Activity**
   - Go to Activity Permissions
   - Select an activity
   - Add permissions for desired roles
   - Test as each role

2. **Set Up Workflows**
   - Data Collectors: can_create + can_edit
   - Validators: can_view + can_edit (feedback)
   - Admins: automatic full access

3. **Monitor Access**
   - Check who has access to which activities
   - Adjust permissions as needed

4. **Train Users**
   - Show them where to find activities in sidebar
   - Explain why they see different activities than others

---

**Ready to use!** Start by logging in as Admin and going to Activity Permissions. ✨
