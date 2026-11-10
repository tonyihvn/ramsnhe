# Multilevel Select Feature Fix

## Problem
The multilevel select feature was not working correctly in the `/activities/fill/{activity_id}` route when using conditions like `!!q2 && q2==="{selected_q2}"` to display options based on another field's selected value.

## Root Cause
When a dropdown field with scoring is selected, the answer is stored as an object with a `value` property:
```javascript
{
  value: "option_value",
  score: 5
}
```

However, when the evaluation context was built for condition evaluation, the entire object was being passed instead of extracting just the `value` property. This caused conditions comparing string values to fail because they were comparing against an object instead of the actual value.

For example:
- Selected value stored as: `{value: "HR", score: 10}`
- Condition expected: `q2 === "HR"`
- But was comparing: `{value: "HR", score: 10} === "HR"` → **false**

## Solution
Modified the `buildEvaluationContext` function in `RenderQuestion` component and the `rowFieldMap` handling in repeatable sections to extract the `value` property from objects before adding them to the evaluation context.

### Changes Made

#### 1. FillFormPage.tsx - RenderQuestion component (lines 189-221)
Updated `buildEvaluationContext` function to extract `value` from objects:

```typescript
const buildEvaluationContext = (baseAnswers: Record<string, any>, fieldNames: Record<string, any>): Record<string, any> => {
  const context: Record<string, any> = {};
  
  // Process baseAnswers and extract values from objects
  Object.entries(baseAnswers).forEach(([key, val]) => {
    if (val && typeof val === 'object' && 'value' in val) {
      // If it's an object with a 'value' property (e.g., {value: "...", score: ...}), extract the value
      context[key] = val.value;
    } else {
      context[key] = val;
    }
  });
  
  // Add field names from the fieldNameMap as references to their values
  if (fieldNames && Object.keys(fieldNames).length > 0) {
    Object.entries(fieldNames).forEach(([key, val]) => {
      if (val && typeof val === 'object' && 'value' in val) {
        context[key] = val.value;
      } else {
        context[key] = val;
      }
    });
  }
  
  return context;
};
```

#### 2. FillFormPage.tsx - Repeatable sections (lines 1414-1436)
Updated `rowFieldMap` construction to extract values from objects:

```typescript
Object.keys(row).forEach(key => {
  const val = row[key];
  if (val && typeof val === 'object' && 'value' in val) {
    rowFieldMap[key] = val.value;
  } else {
    rowFieldMap[key] = val;
  }
});

section.questions.forEach((sq, sqIdx) => {
  const val = row[sq.id];
  if (val && typeof val === 'object' && 'value' in val) {
    rowFieldMap[`q${sqIdx + 1}`] = val.value;
  } else {
    rowFieldMap[`q${sqIdx + 1}`] = val;
  }
});
```

## How It Works Now

When evaluating conditions like `!!q2 && q2==="{selected_q2}"`:

1. User selects a value from q2 (e.g., "HR")
2. The answer is stored as `{value: "HR", score: 10}`
3. When building the evaluation context:
   - Old behavior: context.q2 = `{value: "HR", score: 10}` ❌
   - New behavior: context.q2 = `"HR"` ✓
4. Condition evaluation:
   - `!!q2` → true (value exists)
   - `q2 === "HR"` → true (correct comparison) ✓
5. Options with matching `showif` conditions are now displayed correctly

## Affected Features
- ✅ Dropdown multilevel select with conditions
- ✅ Radio button multilevel select with conditions
- ✅ Checkbox multilevel select with conditions
- ✅ Both regular and repeatable sections
- ✅ Both fieldName and q# (sequential) references

## Testing
To verify the fix works:

1. Build the form with condition-based options:
   ```
   Field q2: Dropdown with options (e.g., "HR", "Finance")
   Field q3: Dropdown with options that have showif conditions:
     - Option "HR Option 1" with showif: `!!q2 && q2==="HR"`
     - Option "Finance Option 1" with showif: `!!q2 && q2==="Finance"`
   ```

2. Fill the form:
   - Select "HR" in q2
   - Verify only "HR Option 1" appears in q3
   - Select "Finance" in q2
   - Verify only "Finance Option 1" appears in q3

## Impact
- 🟢 No breaking changes
- 🟢 Works with existing form definitions
- 🟢 No database migrations needed
- 🟢 Backward compatible with simple string values

## Files Modified
- `pages/FillFormPage.tsx` - 2 key locations fixed
