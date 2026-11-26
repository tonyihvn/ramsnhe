# Questions Display Fix & Custom Labels Implementation

## Issues Addressed

### 1. Reports Page Questions Showing as "Question {id}"
**Problem**: On `/reports/{id}`, the questions dropdown was showing "Question {question_id}" instead of actual question text.

**Root Cause**: ReportViewPage was fetching questions from `/api/questions?activityId=...` endpoint, which may not return properly formatted data or complete question objects.

**Solution**: Updated ReportViewPage to fetch questions from the same `/api/activity_dashboard/{id}` endpoint used by ActivityDashboardPage, which ensures consistent question object structure with `question_text` field.

### 2. Custom Labels & Font Sizes
**Feature**: Added ability to rename stats with custom labels and control font sizes on both pages.

**Where Applied**: 
- `/activities/dashboard/{id}` - Interactive Stats Settings Modal
- `/reports/{id}` - Interactive Stats Settings Modal

## Implementation Changes

### ReportViewPage.tsx

#### 1. API Endpoint Change (line ~665)
**Before:**
```typescript
const [aRes, qRes, docs, uRes, actualTablesRes] = await Promise.all([
  apiFetch(`/api/answers?reportId=${reportId}`, { credentials: 'include' }),
  apiFetch(`/api/questions?activityId=${jr.activity_id}`, { credentials: 'include' }),
  ...
]);
if (qRes.ok) {
  let questionsData = await qRes.json() || [];
  if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData)) {
    questionsData = questionsData.data || questionsData.questions || [];
  }
  ...
}
```

**After:**
```typescript
const [aRes, actDashRes, docs, uRes, actualTablesRes] = await Promise.all([
  apiFetch(`/api/answers?reportId=${reportId}`, { credentials: 'include' }),
  apiFetch(`/api/activity_dashboard/${jr.activity_id}`, { credentials: 'include' }),
  ...
]);
if (actDashRes.ok) {
  const dashboardData = await actDashRes.json() || {};
  let questionsData = Array.isArray(dashboardData?.questions) ? dashboardData.questions : [];
  ...
}
```

**Benefits:**
- Uses same data source as ActivityDashboardPage
- Ensures questions have proper `question_text` field
- More reliable data structure

#### 2. Type Definition Update (line ~27)
```typescript
type InteractiveStatItem = {
  statKey: string;
  questionId: string;
  aggregateType: string;
  conditions: StatCondition[];
  label?: string;           // NEW
  fontSize?: string;        // NEW
};
```

#### 3. State Variables (line ~105)
```typescript
const [selectedStatLabel, setSelectedStatLabel] = useState<string>('');
const [selectedStatFontSize, setSelectedStatFontSize] = useState<string>('base');
```

#### 4. Handler Functions (line ~502)
- Updated `handleAddStatClick()` to pass label and fontSize
- Updated `handleAddStat()` to accept and store label and fontSize

#### 5. Stats Restoration (line ~810)
- Restores saved `label` and `fontSize` from database
- Maintains backward compatibility with older stats

#### 6. Modal UI (line ~3730)
- Added Label input field
- Added Font Size dropdown with 5 options

#### 7. Stats Card Display (line ~1472)
- Shows custom label if provided
- Applies font size scaling to both label and value

### ActivityDashboardPage.tsx

#### Same Changes Applied:
1. Type definition updated with `label` and `fontSize`
2. State variables added
3. Handler functions updated
4. Stats restoration enhanced
5. Modal UI enhanced with new fields
6. Stats card display updated with dynamic sizing

## Testing Checklist

### ReportViewPage
- [ ] Navigate to `/reports/{id}`
- [ ] Check browser console for `✓ Loaded X questions` message
- [ ] Open Interactive Stats Settings modal
- [ ] Verify questions dropdown shows actual question text (not "Question {id}")
- [ ] Add a stat and enter custom label
- [ ] Select different font sizes
- [ ] Verify stat card displays custom label
- [ ] Save and reload page
- [ ] Verify label and font size persist

### ActivityDashboardPage
- [ ] Navigate to `/activities/dashboard/{id}`
- [ ] Open Interactive Stats Settings modal
- [ ] Enter custom label for a stat
- [ ] Select font size
- [ ] Verify stat card displays correctly
- [ ] Save and reload page
- [ ] Verify persistence

### Both Pages
- [ ] Add multiple stats with different labels/sizes
- [ ] Test font sizes: Small, Base, Large, Extra Large, 2X Large
- [ ] Remove a stat (button should still be clickable)
- [ ] Edit existing stat (can update label/fontSize)
- [ ] Test WHERE conditions display below custom label
- [ ] Verify very long labels are truncated appropriately

## Database Schema

No new migrations needed. Existing `report_stats_config` and `activity.dashboard_stats_config` JSON fields now store additional properties:

```json
{
  "items": [
    {
      "statKey": "q-5-count_distinct",
      "questionId": "5",
      "aggregateType": "count_distinct",
      "conditions": [],
      "label": "Total Facility Teams",
      "fontSize": "xl"
    }
  ]
}
```

## Backward Compatibility

- ✅ Existing stats without labels/fontSize still work
- ✅ Default fontSize is 'base' for older stats
- ✅ Empty labels show default display (aggregate type + question)
- ✅ No database migration required
- ✅ All old configs still load and display correctly

## Font Size Reference

| Value | Label Size | Value Size | Use Case |
|-------|-----------|-----------|----------|
| `sm` | 12px | 12px | Compact |
| `base` | 16px | 24px | Default |
| `lg` | 18px | 30px | Important |
| `xl` | 20px | 36px | Key Metric |
| `2xl` | 24px | 48px | Highlight |

## Console Logging

ReportViewPage now logs:
- ✅ `✓ Loaded X questions for activity_id=...` - Success message
- ⚠️ `❌ Activity Dashboard API failed: X` - API error
- ⚠️ `NO QUESTIONS FOUND` - Empty questions list warning

## Common Issues & Troubleshooting

### Questions Still Show as "Question {id}"
1. Check browser console for error messages
2. Verify API endpoint returns valid dashboard data
3. Ensure activity_id is correct in report
4. Check Network tab: `/api/activity_dashboard/{id}` should return questions array

### Custom Labels Not Displaying
1. Verify label field has text (not empty)
2. Check that stat was saved after adding label
3. Reload page to verify persistence
4. Check database: `report_stats_config` should contain label field

### Font Size Not Applied
1. Verify dropdown was set before adding stat
2. Check that stat shows in card
3. Try different font size options
4. Reload page and verify saved size

## Migration Path

If you have existing stats without labels:
1. No action needed - they continue to work with default display
2. When editing a stat, can add label and font size
3. Newly saved config will include both fields
4. Old configs remain backward compatible

## Files Modified

1. **ReportViewPage.tsx**
   - API endpoint: `/api/questions?activityId=...` → `/api/activity_dashboard/{id}`
   - Added label and fontSize support
   - Enhanced modal UI
   - Updated stats card display

2. **ActivityDashboardPage.tsx**
   - Added label and fontSize support
   - Enhanced modal UI
   - Updated stats card display
   - Updated stats restoration logic

## Performance Impact

- Minimal: Using existing `/api/activity_dashboard/{id}` endpoint
- No additional API calls
- Font size applied via CSS classes (no runtime calculation)
- Backward compatible queries still work

## Future Enhancements

- Color customization for stat cards
- Label position (top/bottom)
- Number formatting (decimals, thousands separator)
- Animation for stat value changes
- Stat export/sharing functionality
