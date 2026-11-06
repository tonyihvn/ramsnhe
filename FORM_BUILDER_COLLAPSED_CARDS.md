# Form Builder - Collapsed Cards by Default

## Change Summary

All question cards in the form builder (`.../activities/build/{id}`) are now **collapsed by default**, improving the user experience and reducing visual clutter.

## What Changed

### Before
- Questions appeared in expanded form when the form builder page loaded
- Users had to manually collapse each question to see the full form structure
- Large forms with many questions were difficult to navigate

### After
- All questions are **collapsed by default** when the form loads
- Users can expand individual questions by clicking the chevron icon
- Cleaner, more organized view of the entire form structure
- Easier to see all questions at a glance and navigate quickly

## Technical Implementation

### Changes Made to `pages/BuildFormPage.tsx`

1. **Default Collapsed State for New Questions** (Line 881)
   ```typescript
   // Old:
   metadata: (type === AnswerType.FILE) ? { allowedFileTypes: ['image/*', '.pdf'] } : undefined
   
   // New:
   metadata: { ...(type === AnswerType.FILE ? { allowedFileTypes: ['image/*', '.pdf'] } : {}), collapsed: true }
   ```
   New questions are now created with `collapsed: true`.

2. **Rendering Logic Update** (Line 41)
   ```typescript
   // Old:
   const collapsed = !!(question.metadata && question.metadata.collapsed);
   
   // New:
   const collapsed = question.metadata?.collapsed !== false;
   ```
   This treats undefined/true as collapsed, and only expands if explicitly set to `false`.

3. **Imported Questions Default Collapsed** (Line 1029)
   ```typescript
   // Old:
   metadata: { ...(metadata || {}), score: scoreVal, displayReviewersComment: reviewersCommentFlag }
   
   // New:
   metadata: { ...(metadata || {}), score: scoreVal, displayReviewersComment: reviewersCommentFlag, collapsed: true }
   ```
   Questions imported from Excel files are also collapsed by default.

## User Interaction

### Expanding a Question
1. Locate the question card you want to edit
2. Click the **chevron icon** (>) on the right side of the card header
3. The card expands to show all fields (Question Text, Answer Type, Options, etc.)

### Collapsing a Question
1. While a question is expanded
2. Click the **chevron icon** (v) on the right side of the card header
3. The card collapses back to its compact view

### Bulk Operations
- **Expand All**: Use the "Expand All" button (if available) in the page controls
- **Collapse All**: Use the "Collapse All" button (if available) in the page controls

## Use Cases

### Large Forms (10+ Questions)
Much easier to navigate and understand the overall structure without scrolling through expanded cards.

### Importing from Excel
Imported questions maintain the collapsed state for consistency.

### Quick Previews
Users can quickly see the question text and type without needing to expand each card.

### Detailed Editing
Click to expand only the specific question you need to edit, keeping others collapsed.

## Persistence

The collapsed/expanded state is stored in `question.metadata.collapsed`:
- `true` = collapsed
- `false` = expanded
- `undefined` = defaults to collapsed

This state is persisted with the form definition when saved to the database.

## Affected Scenarios

✅ **New Questions**: Automatically created collapsed  
✅ **Imported Questions**: Excel imports default to collapsed  
✅ **Existing Questions**: Load with their saved state (now defaults to collapsed if not set)  
✅ **All Question Types**: TEXT, DROPDOWN, RADIO, CHECKBOX, FILE, etc.

## Benefits

| Benefit | Impact |
|---------|--------|
| **Reduced Visual Clutter** | Forms with 20+ questions are now manageable |
| **Faster Navigation** | Quickly scan form structure without expanding everything |
| **Better Organization** | Focus on editing one question at a time |
| **Consistent UX** | All new/imported questions have the same default state |
| **Backward Compatible** | Existing forms that have explicit expand/collapse state preserved |

## Files Modified

- `pages/BuildFormPage.tsx` (60 insertions, 3 deletions)

## Commit Information

- **Hash**: 51f8fc4
- **Date**: 2026-11-06
- **Files Changed**: 1
- **Lines**: +60, -3

## Testing Checklist

- ✅ Create a new question → Should be collapsed
- ✅ Import questions from Excel → Should be collapsed
- ✅ Click chevron to expand → Question expands
- ✅ Click chevron to collapse → Question collapses
- ✅ Refresh page → State persists (if saved)
- ✅ Large form with 20+ questions → Can easily scan all questions

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- React 17+
- CSS Grid/Flexbox

## Performance Impact

**Minimal to None**
- Initial render is actually faster (less DOM rendering)
- Expanding/collapsing is instant (just CSS + React state)
- No database changes required

## Future Enhancements

Potential improvements:
- Add "Expand All" / "Collapse All" buttons
- Remember user's preference (local storage)
- Add keyboard shortcuts (Space to expand/collapse)
- Drag-and-drop to reorder while collapsed

## Related Features

- **Question Editor**: Controlled by `QuestionEditor` component
- **Form Builder**: Main page at `pages/BuildFormPage.tsx`
- **Question Type**: All types supported (AnswerType enum)
- **Metadata Storage**: Uses `question.metadata.collapsed` property

---

**Status**: ✅ Implemented and Committed  
**Page**: `.../activities/build/{id}`  
**Component**: `QuestionEditor`  
**Storage**: `question.metadata.collapsed`
