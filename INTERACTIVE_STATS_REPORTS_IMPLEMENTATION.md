# Interactive Stats Implementation for Reports Page

## Summary
Implemented the Interactive Stats Settings feature on the `/reports/{id}` page, mirroring the functionality from `/activities/dashboard/{id}`. Admins can now configure and view statistics for a specific report with optional filtering.

## Changes Made

### 1. **ReportViewPage.tsx** - Main Implementation

#### Added Imports
- `Cog6ToothIcon` from `@heroicons/react/24/outline` for the settings button

#### Added Types
```typescript
type StatCondition = {
  id: string;
  questionId: string;
  operator: string;
  value: string;
  isCustomValue?: boolean;
};

type InteractiveStatItem = {
  statKey: string;
  questionId: string;
  aggregateType: string;
  conditions: StatCondition[];
};
```

#### Added State Variables
- `interactiveStats`: Array of configured statistics
- `statsResults`: Results of calculated statistics
- `selectedStatQuestion`: Currently selected question for adding a stat
- `selectedStatAggregateType`: Selected aggregate type (count, count_distinct, sum, avg, etc.)
- `selectedStatConditions`: WHERE conditions for filtering
- `statsSettingsModalOpen`: Controls modal visibility
- `statsConfigSaving`: Loading state for save operation

#### Added Helper Functions

1. **normalizeAnswerValue()** - Converts various answer value formats to strings
2. **calculateStat()** - Calculates stats based on aggregate type
   - `count`: Returns number of answers
   - `count_distinct`: Returns count of distinct answer values ✨ NEW
   - `sum`: Sum of numeric values
   - `average`: Average of numeric values
   - `min/max/median/std_dev`: Various statistical measures

3. **getDistinctResponsesByQuestion()** - Gets unique responses for a question
4. **compareWithOperator()** - Evaluates conditions (==, !=, >, <, contains, etc.)
5. **getMatchingAnswerIds()** - Filters answers based on conditions
6. **buildStatKey()** - Creates unique key for each stat configuration
7. **handleAddCondition()** - Adds a new WHERE condition
8. **handleRemoveCondition()** - Removes a condition
9. **handleConditionChange()** - Updates a condition
10. **handleAddStatClick()** - Validates and adds a new stat
11. **handleAddStat()** - Core logic to add stat to the list
12. **saveReportStatsConfig()** - Persists stats to database via `/api/reports/{id}` with `report_stats_config` field

#### Added useEffect Hooks

1. **Stats Calculation useEffect** - Recalculates stats whenever they change or answers change
2. **Load Stats Config useEffect** - Loads saved stats configuration when report loads from `report.report_stats_config`

#### Added UI Components

1. **Interactive Stats Card** (displayed only for admins)
   - Settings button (cog icon) to open modal
   - Grid of stat cards showing:
     - Aggregate type
     - Question text
     - Conditions (if any)
     - Calculated result
     - Delete button

2. **Interactive Stats Settings Modal**
   - Aggregate Type dropdown (includes new COUNT DISTINCT option)
   - Question selector
   - WHERE clause builder (only for COUNT aggregate)
     - Add/remove conditions
     - Operator selection (==, !=, >, <, contains, etc.)
     - Response value selector with custom value support
   - Add Stat button
   - Save Stats Config button

### 2. **ActivityDashboardPage.tsx** - Enhancement

#### Updated Aggregate Type Options
Added `count_distinct` option to the aggregate type dropdown

#### Updated calculateStat() Function
Added handling for `count_distinct` aggregate type:
```typescript
if (aggregateType === 'count_distinct') {
  const distinct = new Set(answers.map((a: any) => normalizeAnswerValue(a.answer_value)));
  return distinct.size;
}
```

## Key Differences from ActivityDashboard

1. **Scope**: Stats are limited to a single report's answers only
2. **Persistence**: Stats are saved to `report.report_stats_config` instead of `activity.dashboard_stats_config`
3. **Visibility**: Interactive Stats card only displays for admins
4. **Text updates**: Messages reference "this report" instead of "this activity"

## Database Schema Impact

The reports table needs a new column if it doesn't exist:
```sql
ALTER TABLE reports ADD COLUMN report_stats_config JSON;
```

This stores JSON like:
```json
{
  "items": [
    {
      "questionId": "1",
      "aggregateType": "count_distinct",
      "conditions": []
    }
  ]
}
```

## Features

✅ Interactive Stats Settings Modal
✅ Question selection for statistics
✅ Multiple aggregate types (COUNT, COUNT DISTINCT, SUM, AVG, MIN, MAX, MEDIAN, STD DEV)
✅ WHERE clause filtering with conditions
✅ Persistent storage per report
✅ Real-time calculation
✅ Distinct value counting to avoid duplicates
✅ Admin-only visibility

## Testing Checklist

- [ ] Open a report and verify Interactive Stats card appears (admin only)
- [ ] Click settings cog to open the modal
- [ ] Select a question and COUNT aggregate type
- [ ] Add and remove conditions
- [ ] Click "Add Stat" to add a stat
- [ ] Verify stat displays with correct result
- [ ] Click "Save Stats Config" and refresh the page
- [ ] Verify stats are restored from saved config
- [ ] Test COUNT DISTINCT to ensure it counts unique values only
- [ ] Test different aggregate types (SUM, AVG, etc.)
- [ ] Verify WHERE conditions work correctly
- [ ] Test deleting a stat (removes immediately)
- [ ] Test removing stats and clicking "Save Stats Config" persists deletion

## Files Modified
1. `pages/ReportViewPage.tsx` - 100+ lines added
2. `pages/ActivityDashboardPage.tsx` - 2 lines modified (added COUNT DISTINCT option)

## Notes
- The implementation closely mirrors ActivityDashboardPage for consistency
- All functionality is scoped to a single report's answers
- Stats are only visible to admin users
- The COUNT aggregate type requires WHERE conditions, while other aggregates don't support them
