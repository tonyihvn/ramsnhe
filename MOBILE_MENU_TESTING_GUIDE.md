# Mobile Menu Popup - Testing Guide

**Quick Reference**: Testing the mobile activities menu fix

## What Was Fixed

Activities popup menu (⋯ button) now appears **above** activity cards on mobile instead of being hidden below them.

## Test Scenarios

### Quick Test (2 minutes)

1. **Open Activities page** on mobile device or DevTools mobile viewport
2. **Find any activity card**
3. **Tap the ⋯ button** at right side of card
4. **Verify**: Menu appears centered on screen, fully visible
5. **Tap any menu item** → action executes and menu closes

### Complete Test (10 minutes)

#### Mobile (< 640px width)

**Menu Display**
- [ ] Tap ⋯ button → menu appears
- [ ] Menu is centered vertically on screen
- [ ] Menu is right-aligned (1rem from edge)
- [ ] Menu width is consistent (~12rem)
- [ ] All 13 menu items visible (scrollable if needed)
- [ ] White background with border and shadow
- [ ] No parts clipped or hidden

**Menu Interaction**
- [ ] Tap "Build/Edit Form" → navigates to form builder
- [ ] Tap "Build Report" → navigates to report builder
- [ ] Tap "Edit Activity" → opens activity modal
- [ ] Tap "Delete" → shows delete confirmation
- [ ] Tap "Duplicate" → creates duplicate activity
- [ ] Tap "View Data" → navigates to dashboard
- [ ] Tap "Copy Link" → copies URL to clipboard
- [ ] Tap "QR Code" → opens QR code modal
- [ ] Tap "Embed" → opens embed code modal

**Menu Closure**
- [ ] Tap outside menu (on backdrop) → menu closes
- [ ] Tap same ⋯ button twice → menu toggles open/closed
- [ ] Tap different card's ⋯ → opens that card's menu
- [ ] After action completes → menu automatically closes

#### Desktop (≥ 640px width)

**No Changes - Verify No Regression**
- [ ] ⋯ button is NOT visible
- [ ] Action buttons visible in row: Build/Edit Form, Build Report, Edit, Delete, Duplicate, View Data, Copy Link, QR Code, Embed
- [ ] All buttons functional and properly laid out
- [ ] No visual changes from previous version

#### Responsive Breakpoints

**Very Small (320px - iPhone SE)**
- [ ] Menu fits on screen
- [ ] No horizontal scrolling needed
- [ ] Menu items readable
- [ ] All tap targets adequate size (44px minimum)

**Small (375px - iPhone 11)**
- [ ] Standard mobile experience
- [ ] Menu centered and accessible

**Medium (640px - Tablet vertical, `sm:hidden` breakpoint)**
- [ ] ⋯ button disappears
- [ ] Action buttons appear in row
- [ ] Smooth transition

**Large (768px+ - Tablet/Desktop)**
- [ ] Action buttons in full layout
- [ ] No menu button visible

### Testing on Different Devices

#### Browser DevTools
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device:
   - [ ] iPhone SE (375×667)
   - [ ] iPhone 12 (390×844)
   - [ ] iPhone 14 Pro (393×852)
   - [ ] Pixel 5 (393×851)
   - [ ] Galaxy S21 (360×800)

#### Real Devices
- [ ] iPhone (any model)
- [ ] Android (any model)
- [ ] iPad (portrait orientation)
- [ ] Android tablet (portrait orientation)

#### Orientations
- [ ] Portrait (vertical)
- [ ] Landscape (horizontal)
- [ ] Check menu positioning on both

### Edge Cases & Stress Tests

**Menu Content**
- [ ] Very long activity titles (should not affect menu)
- [ ] Multiple activities with menus open (close old, open new)
- [ ] Rapid tapping ⋯ button (no glitches)
- [ ] Holding pressed on button (menu stays open)

**Navigation & State**
- [ ] Open menu → navigate away → return to activities
- [ ] Open menu on card → scroll page → menu follows scroll
- [ ] Open menu → lock screen → unlock → menu closed
- [ ] Open menu → low battery mode → menu still works

**Screen Sizes**
- [ ] Foldable phone in folded state (small width)
- [ ] Foldable phone in unfolded state (large width)
- [ ] Very wide but short screen (landscape tablet)
- [ ] Very tall but narrow screen (portrait phone)

### Accessibility Testing

**Keyboard Navigation** (if applicable on mobile)
- [ ] Tab through activities
- [ ] Tab to ⋯ button
- [ ] Enter/Space opens menu
- [ ] Tab through menu items
- [ ] Enter activates menu item
- [ ] Escape closes menu *(if implemented)*

**Screen Reader** (iOS VoiceOver, Android TalkBack)
- [ ] ⋯ button announced as "Menu button" or similar
- [ ] Menu items are read aloud in order
- [ ] Actions are announced with purpose
- [ ] Menu closure announced or indicated
- [ ] Backdrop click doesn't need separate announcement

**Visual Contrast**
- [ ] Menu text is readable (black text on white background)
- [ ] Shadow provides adequate depth
- [ ] Border clearly defines menu boundary
- [ ] In dark mode (if applicable) - menu still visible

### Performance Testing

**Load & Render**
- [ ] Activities page loads quickly on mobile
- [ ] Scrolling is smooth (60 FPS)
- [ ] Opening menu is instant (no lag)
- [ ] Closing menu is instant (no lag)
- [ ] Navigation from menu is quick

**Memory & Battery**
- [ ] No memory leaks when opening/closing menu repeatedly
- [ ] Battery usage is normal (no excessive GPU/CPU)
- [ ] No performance degradation after 5+ minutes of use

### Browser-Specific Testing

**iOS Safari**
- [ ] Menu appears correctly
- [ ] Touch interactions work
- [ ] No iOS-specific glitches
- [ ] Status bar doesn't interfere

**Android Chrome**
- [ ] Menu appears correctly
- [ ] Touch interactions work
- [ ] No Android-specific glitches
- [ ] No navigation bar issues

**Android Firefox**
- [ ] Menu appears correctly
- [ ] Touch interactions work

**Samsung Internet** (if available)
- [ ] Menu appears correctly
- [ ] Touch interactions work

## Test Data Needed

- At least 3 activities in the system
- Variety of activity types (Facility and User response types)
- Some activities with forms, some without
- At least one activity with long title (to test wrapping)

## Success Criteria

✅ **All Must Pass**
1. Menu appears above cards (not clipped)
2. All menu items are visible and tappable
3. Menu closes when tapping outside
4. All menu actions work correctly
5. Desktop view unchanged (no regression)
6. Smooth, responsive performance

⚠️ **Known Limitations**
- Menu doesn't auto-position above if at bottom of screen (could be future enhancement)
- Escape key closes menu (should add if not implemented)
- No animation on menu open/close (could be future enhancement)

## Bug Report Template

If you find an issue:

```
**Title**: [Brief description]
**Device**: [e.g., iPhone 14, Pixel 5, Galaxy Tab]
**OS Version**: [e.g., iOS 17, Android 13]
**Browser**: [e.g., Safari, Chrome, Firefox]
**Screen Size**: [e.g., 390×844]

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happens]

**Screenshot**: [If possible]
```

## Checklist for Sign-Off

- [ ] Menu displays above cards (primary fix)
- [ ] All 13 menu items work
- [ ] Desktop unaffected
- [ ] Tested on at least 2 mobile devices
- [ ] No console errors
- [ ] Performance is good
- [ ] No accessibility issues found

## Quick Troubleshooting

**Menu doesn't appear when I tap ⋯**
- Hard refresh page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Clear browser cache
- Check browser console for errors

**Menu is cut off at edges**
- This shouldn't happen with the fix - report as bug
- Check device width is correctly detected

**Menu doesn't close when I tap outside**
- Try tapping on clear backdrop area
- Try tapping ⋯ button again to toggle
- Reload page if stuck

**Actions don't work from menu**
- Check network connection
- Check browser console for errors
- Try again after a moment (network delay)

## Sign-Off

**Tested By**: _________________  
**Date**: _________________  
**Status**: ☐ Pass / ☐ Fail / ☐ Conditional  

**Notes**:
_________________________________________________
_________________________________________________

---

**Test Guide Version**: 1.0  
**Last Updated**: November 10, 2024  
