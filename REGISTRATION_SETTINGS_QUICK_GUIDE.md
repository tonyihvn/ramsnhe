# Registration Settings - Quick Reference Guide

## What Was Fixed

Two critical bugs in the "Allow New Organization Registration" feature:

1. **Checkbox didn't persist** - Setting kept reverting to checked
2. **Register button always visible** - Button didn't hide when disabled

## How to Use

### Super Admin: Disable Registrations

```
1. Login as super admin
2. Go to: /super-admin/landing-page
3. Click: Branding tab
4. Find: "Registration Settings" section
5. Uncheck: "Allow New Organization Registration" ☐
6. Click: "Save Configuration"
7. Wait: Success message appears
```

✅ **Result**: Setting is now saved correctly (persists on reload)

### End User: Login Page Shows

**When Registrations ENABLED** ✓
```
┌────────────────────────────────────┐
│      Sign in to DQAi               │
│                                    │
│  Email: [____________]             │
│  Password: [____________]          │
│                                    │
│  [      Sign In      ]             │
│                                    │
│  Register | Forgot password?       │ ← Button visible
└────────────────────────────────────┘
```

**When Registrations DISABLED** ✓
```
┌────────────────────────────────────┐
│      Sign in to DQAi               │
│                                    │
│  Email: [____________]             │
│  Password: [____________]          │
│                                    │
│  [      Sign In      ]             │
│                                    │
│              Forgot password?      │ ← Button hidden
└────────────────────────────────────┘
```

## Troubleshooting

### Issue: Register button still visible after disabling

**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh login page (Ctrl+F5)
3. Try in incognito window (Ctrl+Shift+N)

### Issue: Checkbox still reverts after saving

**Solution**:
1. Check browser console for errors (F12)
2. Refresh page after saving
3. Verify setting persisted (look at network tab)

### Issue: Can't save registration setting

**Solution**:
1. Check if you're logged in as super admin
2. Verify you can save other settings first
3. Check browser console for JavaScript errors
4. Try different browser

## Technical Details (For Developers)

### Files Modified

**SuperAdminLandingPageConfig.tsx** (Lines 601, 263-264)
- Fixed checkbox boolean evaluation
- Added config reload after save

**LoginPage.tsx** (Line 128)
- Fixed config value boolean evaluation
- Register button now hides correctly

### Commits

```
2f65de6 - Checkbox persistence fix
1f4a175 - Register button visibility fix
```

### Boolean Logic Fix

```javascript
// BEFORE (Wrong)
config.allowNewRegistrations !== false

// AFTER (Correct)  
config.allowNewRegistrations === true
```

## Testing Checklist

- [ ] Disable registration → button hidden
- [ ] Enable registration → button visible
- [ ] Refresh page → state persists
- [ ] Hard refresh → state persists
- [ ] Multiple toggle cycles work
- [ ] No console errors
- [ ] Incognito window shows correct state

## FAQ

**Q: Why does the setting keep reverting?**
A: Fixed in commit 2f65de6. Config is now reloaded from backend after save.

**Q: Why is the Register button still visible?**
A: Fixed in commit 1f4a175. Boolean evaluation was corrected.

**Q: Can users still register if disabled?**
A: No. Backend validation prevents registration. UI button is hidden for UX.

**Q: Do existing registrations still work?**
A: Yes. Only affects NEW registrations when disabled.

**Q: Is this secure?**
A: Yes. UI + Backend validation = defense in depth.

**Q: Do I need to restart anything?**
A: No. Changes are deployed via frontend bundle.

**Q: Will this affect existing users?**
A: No. Only affects new registration attempts.

**Q: Can I enable/disable multiple times?**
A: Yes. Works with multiple save/reload cycles.

## Related Settings

### Locked Organization (Optional)
When set, new registrations automatically assigned to organization:
- Organization field hidden in registration form
- Users don't choose their organization
- Works with registration enable/disable

### Landing Page Config
Located in super-admin settings:
- All landing page customizations
- Colors, fonts, content
- Navigation settings
- Registration settings

## Support

| Issue | Action |
|-------|--------|
| Checkbox reverts | Refresh page |
| Button not hidden | Clear cache + refresh |
| Setting not saving | Check network tab |
| Still confused | See detailed docs |

---

**Last Updated**: November 10, 2024  
**Status**: ✅ Fixed  
**Version**: 1.0
