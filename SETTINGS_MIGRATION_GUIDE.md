# Settings Migration Guide: localStorage → PostgreSQL Database

## Overview

**Date:** February 16, 2026  
**Status:** Completed

All application settings and super admin theme settings have been migrated from browser `localStorage` to PostgreSQL database for consistency, persistence, and cross-system uniformity.

## What Changed

### 1. Theme Settings (useTheme.tsx)
**Before:**
- Stored exclusively in browser `localStorage` under key `intelliform_theme_settings_v1`
- Each browser/device had independent settings
- Changes not synchronized across systems
- Non-admin users couldn't access admin-configured theme

**After:**
- Loaded from PostgreSQL `settings` table on app load
- All users (admin and non-admin) receive the same theme configuration
- Admin users can modify settings, which are persisted to database
- Non-admin users receive read-only theme configuration from database
- Consistent across all devices and browsers

**Settings Stored:**
- `primaryColor` - Primary brand color
- `sidebarBg` - Sidebar background color
- `navTextColor` - Navigation text color
- `logoColor` - Logo color
- `textColor` - Default text color
- `fontFamily` - Font family for the application
- `navbarBg` - Navigation bar background
- `logoDataUrl` - Base64-encoded logo image
- `logoText` - Text displayed as logo/app name
- `fontSize` - Default font size (CSS value)
- `logoWidth` - Logo width (CSS value)
- `organizationName` - Organization name displayed in UI
- `backgroundImage` - Background image URL (login page)

### 2. Report Builder Settings (ReportBuilderPage.tsx)
**Before:**
- `reportBuilderRichTextMode` - Stored in `localStorage`
- `reportBuilderDisableRichText` - Stored in `localStorage`
- Each user had independent editor preferences

**After:**
- Both settings now stored in PostgreSQL `settings` table
- Shared across all users in the same business
- Admin-configurable for consistency
- Settings loaded on component mount

**Settings Stored:**
- `reportBuilderRichTextMode` - Active rich text editor (editorjs, summernote, taptap, tinymce, ckeditor, basic)
- `reportBuilderDisableRichText` - Boolean flag to disable rich text entirely

### 3. UI Preferences (Still in localStorage - by design)
The following settings remain in `localStorage` as they are user-specific UI preferences:
- `reportBuilderPanelPos` - Floating panel position
- `reportBuilderPanelSize` - Floating panel size
- `lastSelectedBusiness` - Recently selected business
- `selectedBusinessId` - Current business selection
- `page_permissions_overrides` - User's page permission filters
- DataTable column visibility settings
- MapControls enabled/disabled state
- FloatingCard positions

**Rationale:** These are user interface preferences that vary per user/device, so localStorage is appropriate.

## Database Structure

### settings Table
```sql
CREATE TABLE settings (
    key TEXT NOT NULL,
    value JSONB,
    business_id INTEGER,
    PRIMARY KEY (key, business_id),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_settings_key_business ON settings (key, business_id);
```

**Schema Explanation:**
- `key` - Setting identifier (e.g., 'primaryColor', 'reportBuilderRichTextMode')
- `value` - JSONB value (supports any type: string, boolean, object, etc.)
- `business_id` - Business scoping (NULL = global/default settings)

### Business-Scoped Settings Priority
When loading settings:
1. Check for business-specific setting (`business_id = <current_business_id>`)
2. If not found, use global setting (`business_id = NULL`)
3. If not found, use application default

## API Endpoints

### Get Application Settings (Public Read)
```
GET /api/app/settings
Authorization: Any authenticated user
Query Parameters: Uses sessionBusinessId from session
Response: {
    "primaryColor": "#3b82f6",
    "sidebarBg": "#ffffff",
    "reportBuilderRichTextMode": "editorjs",
    ...
}
```

### Get / Update Settings (Admin Only)
```
GET /api/admin/settings
POST /api/admin/settings
Authorization: Admin role required
Body (POST): {
    "primaryColor": "#3b82f6",
    "reportBuilderRichTextMode": "summernote",
    ...
}
```

## Implementation Details

### useTheme Hook
```typescript
// Before: Loaded from localStorage first
- Checked localStorage for settings
- Asked server if admin
- Merged server settings with localStorage

// After: Always loads from database
- Check user role
- Load settings from /api/app/settings (public endpoint)
- Admin users can save changes to database
- Non-admin users receive read-only settings
```

**Key Features:**
- `isLoading` property indicates when settings are being fetched
- Debounced save (1.5s) for admin changes
- Automatic fallback to DEFAULT if database unavailable
- CSS variables applied to `:root` for real-time theme changes

### ReportBuilderPage
```typescript
// Before: Loaded settings from localStorage
const [richTextMode] = useState(() => 
    localStorage.getItem('reportBuilderRichTextMode') || 'editorjs'
);

// After: Loads from database, syncs changes
useEffect(() => {
    fetch('/api/app/settings')
        .then(res => res.json())
        .then(settings => {
            if (settings.reportBuilderRichTextMode) {
                setRichTextMode(settings.reportBuilderRichTextMode);
            }
        });
}, []);

const setRichTextMode = (value) => {
    setRichTextModeState(value);
    fetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ reportBuilderRichTextMode: value })
    });
};
```

## Migration Path

### For End Users
**No action required.** The app will automatically:
1. Load settings from the database on first load
2. Display consistent theme across all devices
3. Use admin-configured report builder preferences

### For Administrators

#### Step 1: Review Current Settings
1. Navigate to **Settings > Theme**
2. All current theme settings are displayed
3. Review colors, fonts, and organization name

#### Step 2: Reconfigure if Needed
If you previously had different settings in localStorage vs. database:
1. Choose the correct values
2. Click **Save** to persist to database
3. All users will immediately see the new settings

#### Step 3: Verify Settings Across Devices
1. Open the app on different devices/browsers
2. Verify that all devices show the same theme
3. Check Report Builder editor preference

#### Step 4: Clear Old localStorage (Optional)
To clean up old browser data:
```javascript
// In browser console
localStorage.removeItem('intelliform_theme_settings_v1');
localStorage.removeItem('reportBuilderRichTextMode');
localStorage.removeItem('reportBuilderDisableRichText');
```

## Benefits

### ✅ Consistency
- All users see the same theme across all devices
- Settings uniform across the entire organization
- No discrepancies between browser instances

### ✅ Persistence
- Settings survive browser cache clear
- Settings persist across browser upgrades
- No loss of configuration on cookie clear

### ✅ Multi-Tenancy
- Different businesses can have different settings
- Business-scoped configuration support
- Easy business switching with appropriate settings

### ✅ Administration
- Single source of truth for settings
- Admin-only modification
- Audit trail via database logs (if enabled)

### ✅ Performance
- Settings cached in React context
- Lazy load on app initialization
- No per-request database queries

## Troubleshooting

### Theme Not Updating Across Browsers
**Problem:** Different browsers show different themes  
**Solution:**
1. Check database: `SELECT * FROM settings WHERE key LIKE '%Color%';`
2. If inconsistent, admin should go to Settings and click Save
3. Clear browser cache and reload

### Settings Not Persisting
**Problem:** Changes aren't saved after clicking Save  
**Solution:**
1. Check browser console for network errors
2. Verify user is admin role
3. Check database permissions: `SELECT * FROM settings;`
4. Verify business_id in session matches expected value

### App Shows Default Theme
**Problem:** App not loading custom theme from database  
**Solution:**
1. Verify settings table has data: `SELECT * FROM settings;`
2. Check /api/app/settings endpoint returns values
3. Check for network errors in browser console
4. Verify business_id scoping is correct

## Rollback Plan

If needed to revert to localStorage-based settings:

### File Changes
1. `hooks/useTheme.tsx` - Restore localStorage initialization
2. `pages/ReportBuilderPage.tsx` - Restore localStorage sync
3. `server/index.js` - Remove `/api/app/settings` endpoint

### Database Cleanup
```sql
-- Archive settings (optional)
CREATE TABLE settings_archive AS SELECT * FROM settings;

-- Clear settings table (optional)
DELETE FROM settings WHERE key LIKE 'primaryColor' OR key LIKE 'reportBuilder%';
```

## Future Enhancements

### Recommended
1. Add settings history/audit log
2. Implement settings change notifications (WebSocket)
3. Add settings versioning/rollback UI
4. Create settings backup/export feature

### Possible
1. User-specific setting overrides (for power users)
2. Settings inheritance hierarchy (organizational units)
3. Settings templates for different business types
4. Real-time theme preview in browser

## Support

For issues or questions:
1. Check database: `SELECT * FROM settings;`
2. Check browser console for errors
3. Verify `/api/app/settings` endpoint responds correctly
4. Contact system administrator to verify database permissions
