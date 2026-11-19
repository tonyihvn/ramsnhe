# Voice Capture Modal Fix - Testing Guide

## Quick Test Steps

### Prerequisites
- Application is running (`npm run dev` or similar)
- You have access to the form filling page with Voice Capture enabled
- Microphone is available and working

### Test Scenario 1: Modal Behavior During Recording

1. **Open Form**: Navigate to the Data Collection form page
2. **Click "Voice Capture" button**: The modal should open with the Voice Capture Panel
3. **Review Interviewer's Guide**: Read the guide if present
4. **Click "Start Recording"**: 
   - ✅ **Expected**: Modal should HIDE (not close, just become invisible)
   - ✅ **Expected**: Form should be FULLY VISIBLE
   - ✅ **Expected**: Button text changes to "Stop Voice Capture"
   - ✅ **Expected**: Button remains CLICKABLE
   
5. **Navigate Form**: While recording
   - ✅ **Expected**: Can scroll form
   - ✅ **Expected**: Can see all form questions
   - ✅ **Expected**: Form is fully interactive
   - ✅ **Expected**: No modal overlay blocking form

### Test Scenario 2: Stop Recording Flow

1. **During Recording** (from previous step):
   - Recording is active
   - Modal is hidden
   - Form is visible

2. **Click "Stop Voice Capture" button**:
   - ✅ **Expected**: Modal reappears
   - ✅ **Expected**: Shows "Transcribing..." message
   - ✅ **Expected**: Shows progress messages

3. **Wait for Processing**:
   - ✅ **Expected**: Shows "Transcribing audio..."
   - ✅ **Expected**: Shows "Extracting form data..."
   - ✅ **Expected**: Eventually shows extracted data with confidence scores

4. **Review & Apply**:
   - ✅ **Expected**: Can review extracted data
   - ✅ **Expected**: Can edit extracted data
   - ✅ **Expected**: Can apply data to form

5. **After Applying**:
   - ✅ **Expected**: Modal closes
   - ✅ **Expected**: Form shows populated fields with extracted data

### Test Scenario 3: Cancel Recording Flow

1. **Start Recording** (from earlier steps):
   - Modal is hidden
   - Recording is active

2. **Click "Cancel & Close" button**:
   - Look for a "Cancel & Close" or close button in the VoiceCapturePanel
   - Or press Escape key if the modal reappears
   - ✅ **Expected**: Modal closes
   - ✅ **Expected**: Recording stops
   - ✅ **Expected**: Form is visible
   - ✅ **Expected**: Button text back to "Voice Capture"

## Expected DOM Structure During Recording

When recording is active, the Modal component's `hideBackdrop` prop should be `true`, resulting in:

```html
<div class="hidden">
  <!-- VoiceCapturePanel component continues recording here -->
  <!-- But it's not visible to the user -->
</div>
```

The form should be fully visible and interactive above.

## Browser DevTools Inspection

1. Open Browser DevTools (F12)
2. Go to Elements/Inspector tab
3. Search for "hidden" class div during recording
4. ✅ **Expected**: Should find a hidden div containing VoiceCapturePanel
5. ✅ **Expected**: Form elements should be visible in DOM with no overlay

## Console Logs to Watch For

The VoiceCapturePanel should log recording state changes:
- "Starting recording..."
- "Recording in progress..."
- "Stopping recording..."
- "Transcribing audio..."
- "Extracting data..."

✅ **Expected**: These logs should appear even when modal is hidden

## Keyboard Shortcuts to Test

- **Escape key**: While recording, pressing Escape should not close the modal (since it's hidden)
  - ✅ **Expected**: Recording continues unaffected

## Accessibility Checks

The hidden modal should still be part of the DOM tree (for screen readers):
- ✅ **Expected**: Hidden components still accessible to assistive technologies
- ✅ **Expected**: ARIA attributes intact on hidden modal

## Edge Cases to Test

1. **Multiple Start/Stop Cycles**:
   - Start recording
   - Stop recording
   - Start recording again
   - ✅ **Expected**: Each cycle works correctly

2. **Tab Order**:
   - While recording, tab through form elements
   - ✅ **Expected**: Hidden modal doesn't appear in tab order
   - ✅ **Expected**: Form elements are in natural tab order

3. **Window Resize**:
   - Start recording
   - Resize browser window
   - ✅ **Expected**: Form remains responsive
   - ✅ **Expected**: No modal appears

4. **Rapid Button Clicks**:
   - Click "Voice Capture" then immediately click "Start Recording"
   - ✅ **Expected**: No errors
   - ✅ **Expected**: Modal hides correctly

## Performance Considerations

While recording (modal hidden):
- ✅ **Expected**: Form remains responsive
- ✅ **Expected**: No lag when typing in form fields
- ✅ **Expected**: Button clicks register immediately

## Known Limitations

- None expected with this implementation

## Rollback Test (if needed)

To verify rollback capability:
1. Changes are minimal (5 files modified)
2. Can revert with: `git checkout components/ui/Modal.tsx pages/FillFormPage.tsx`
3. Clear browser cache: Ctrl+Shift+Delete
4. Rebuild: `npm run build`
5. Test old behavior persists

## Success Criteria

All of the following must be true for this fix to be considered successful:

- ✅ Modal opens when clicking "Voice Capture" button
- ✅ Modal hides (but doesn't close) when recording starts
- ✅ Form is fully visible and interactive during recording
- ✅ "Stop Voice Capture" button is visible and clickable
- ✅ Button text shows "Stop Voice Capture" while recording
- ✅ Clicking "Stop Voice Capture" triggers recording stop
- ✅ Modal reappears with progress information
- ✅ Extracted data is populated into form
- ✅ Modal closes after completion
- ✅ No console errors
- ✅ No TypeScript compilation errors in production build

## Testing Sign-Off

| Test Item | Pass | Comments |
|-----------|------|----------|
| Modal opens on button click | ☐ | |
| Modal hides during recording | ☐ | |
| Form visible during recording | ☐ | |
| "Stop Voice Capture" button clickable | ☐ | |
| Recording stops and processes | ☐ | |
| Data extracted and populated | ☐ | |
| Modal closes on completion | ☐ | |
| No errors in console | ☐ | |

---

**Note**: If any test fails, check:
1. Browser console for JavaScript errors
2. Network tab for failed API calls
3. VoiceCapturePanel component logs
4. Modal `hideBackdrop` prop value

**Date Tested**: ___________
**Tester Name**: ___________
**Test Status**: PASS ☐ / FAIL ☐
