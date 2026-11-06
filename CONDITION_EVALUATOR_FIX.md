# Condition Evaluator Fix - Dependent Fields Issue

## Problem Description
When evaluating conditional expressions for dependent dropdown options, the form was throwing errors like:
```
Failed to evaluate condition: "!!q2 && q2==="Kwara"" ReferenceError: q2 is not defined
```

This occurred because:
1. The condition evaluation system uses field names like `q2`, `q3`, etc. in conditions
2. The context object passed to `filterOptionsByCondition()` only contained question IDs (long UUID-like strings)
3. The `Function` constructor in `evaluateCondition()` uses context keys as parameter names, so it couldn't find `q2` parameter

## Root Cause Analysis
- **Question IDs** (used internally): `"6123abc"`, `"6456def"`, etc. - unique identifiers stored in the system
- **Field Names** (used in conditions): `"q1"`, `"q2"`, `"q3"`, etc. - user-defined field references in condition expressions
- **Mismatch**: The context object had keys like `{id: value}` but conditions referenced `q2`, `q3`

## Solution Implemented

### 1. Enhanced RenderQuestion Component
**File**: `pages/FillFormPage.tsx` (line 165)

Added `fieldNameMap` parameter to RenderQuestion:
```typescript
const RenderQuestion = ({ 
  question, 
  value, 
  onChange, 
  facilities, 
  users, 
  disabled, 
  allAnswers = {}, 
  fieldNameMap = {}  // NEW: Maps field names to their values
}: { 
  question: Question, 
  value: any, 
  onChange: (value: any) => void, 
  facilities: Facility[]; 
  users: User[]; 
  disabled?: boolean; 
  allAnswers?: Record<string, any>; 
  fieldNameMap?: Record<string, any>;  // NEW parameter type
})
```

### 2. Created buildEvaluationContext Function
**File**: `pages/FillFormPage.tsx` (lines 192-205)

Builds an evaluation context that includes both question IDs and field names:
```typescript
const buildEvaluationContext = (baseAnswers: Record<string, any>, fieldNames: Record<string, any>): Record<string, any> => {
  const context: Record<string, any> = { ...baseAnswers };
  
  // Add field names from the fieldNameMap as references to their values
  // This allows conditions to use q2, q3, etc. format
  if (fieldNames && Object.keys(fieldNames).length > 0) {
    Object.assign(context, fieldNames);
  }
  
  return context;
};

const evaluationContext = buildEvaluationContext(allAnswers, fieldNameMap);
```

### 3. Updated filterOptionsByCondition Calls
**File**: `pages/FillFormPage.tsx` (lines 209, 266, 283)

Changed all three calls from:
```typescript
filterOptionsByCondition(question.options || [], allAnswers)
```

To:
```typescript
filterOptionsByCondition(question.options || [], evaluationContext)
```

### 4. Updated RenderQuestion Calls in FillFormPage
**File**: `pages/FillFormPage.tsx` (lines 1344, 1405)

**Non-repeatable section** (line 1344):
```typescript
<RenderQuestion 
  question={q} 
  value={answers[q.id]} 
  onChange={(val) => handleAnswerChange(q.id, val)} 
  facilities={facilities} 
  users={users} 
  disabled={!canInteract} 
  allAnswers={answers} 
  fieldNameMap={fieldMapLocal}  // NEW
/>
```

**Repeatable section** (line 1405):
```typescript
<RenderQuestion 
  question={q} 
  value={row[q.id]} 
  onChange={(val) => updateRepeatRow(groupName, rowIndex, q.id, val)} 
  facilities={facilities} 
  users={users} 
  disabled={!canInteract} 
  allAnswers={row} 
  fieldNameMap={rowFieldMap}  // NEW
/>
```

## How It Works Now

1. **Field Name Mapping**: In FillFormPage, when rendering questions, we build a `fieldMapLocal` (or `rowFieldMap` for repeatable sections) that maps:
   - `q1` → value of first question
   - `q2` → value of second question
   - `q3` → value of third question
   - etc.

2. **Context Building**: When RenderQuestion is called, it receives:
   - `allAnswers`: The answers by question ID
   - `fieldNameMap`: The field name → value mapping from the parent component

3. **Evaluation Context**: RenderQuestion merges both into `evaluationContext` which contains:
   - All question ID keys: `{"6123abc": value, ...}`
   - All field name keys: `{"q1": value, "q2": value, ...}`

4. **Condition Evaluation**: When `filterOptionsByCondition()` evaluates a condition like `"!!q2 && q2==='Kwara'"`:
   - `evaluateCondition()` extracts context keys: `["q1", "q2", "q3", ...]`
   - Creates function: `function (q1, q2, q3, ...) { return (...condition...); }`
   - The `q2` parameter now resolves correctly to its value

## Benefits

✅ **Fixes ReferenceError**: Dependent dropdown conditions now evaluate without errors
✅ **Maintains Backward Compatibility**: Still supports question IDs as fallback
✅ **Works with Repeatable Sections**: Both regular and repeatable question rendering use the same fix
✅ **No Breaking Changes**: Existing code paths remain unchanged

## Testing Recommendations

1. **Test Dependent Dropdowns**: Create a form with a dropdown that depends on another
   - Set condition like `"!!state && state==='Kwara'"`
   - Verify options filter correctly as you change the parent field

2. **Test Repeatable Sections**: If you have dependent fields within repeatable sections
   - Add multiple rows
   - Verify conditions evaluate independently per row

3. **Test Mixed Scenarios**:
   - Dependent fields across different question types (dropdown, radio, checkbox)
   - Multiple levels of dependency (q2 depends on q1, q3 depends on q2)
   - Conditions with complex logic: `"(q2==='A' && q3==='B') || q4>10"`

## Files Modified

- `pages/FillFormPage.tsx`
  - Line 165: Added `fieldNameMap` parameter to RenderQuestion
  - Lines 192-205: Created `buildEvaluationContext` function
  - Lines 209, 266, 283: Updated filterOptionsByCondition calls to use evaluationContext
  - Line 1344: Pass `fieldNameMap={fieldMapLocal}` to RenderQuestion
  - Line 1405: Pass `fieldNameMap={rowFieldMap}` to RenderQuestion

## Validation Status

✅ Build succeeds without new errors related to these changes
✅ Code follows existing patterns in the codebase
✅ Type safety maintained (proper TypeScript types)
✅ Backward compatible (fieldNameMap defaults to empty object)

---

**Summary**: This fix ensures that dependent field conditions can properly reference field names (q1, q2, etc.) by providing a complete evaluation context that includes both question IDs and field name mappings. The solution is elegant, non-invasive, and maintains the existing functionality while fixing the reference errors.
