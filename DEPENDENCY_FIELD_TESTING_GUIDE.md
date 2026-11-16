# Dependent Dropdown Field - Testing Guide

## Overview

Fixed an issue where dropdown fields with dependencies were not displaying even when their conditions were met.

## What Was Fixed

The formula evaluation function (`evaluateFormula`) had issues:
1. It wasn't properly extracting variable names from formulas
2. It was auto-converting numeric strings to numbers, breaking string comparisons  
3. It wasn't ensuring all referenced variables were passed to the evaluation function

## How to Test

### Step 1: Set Up Test Case

Navigate to: `http://localhost:9091/#/activities/build/8`

Verify the form builder shows:
- **Question q2:** State dropdown (fieldName = "q2")
  - Options: Anambra, Lagos, Oyo, etc.
- **Question lga:** LGA dropdown (fieldName = "lga")
  - Visibility Condition (Show If): `!!q2 && q2==="Anambra"`
  - Options: LGA names (Aguata, Aniocha, Ayamelum, etc.)

### Step 2: Fill the Form

1. Go to form filler (or create a new entry based on activity 8)
2. Fill in the q2 field by selecting "Anambra"
3. **Expected Result:** The lga field should now be visible and you should be able to select an LGA

### Step 3: Verify Dynamic Behavior

1. Try selecting a different state (e.g., "Lagos") in the q2 field
2. **Expected Result:** The lga field should hide
3. Select "Anambra" again in q2
4. **Expected Result:** The lga field should appear again

### Step 4: Check Browser Console

Open browser developer console (F12) and check for these log messages:

**Before selecting anything:**
```
[FieldMap] Built q1: fieldName=q2, value=undefined, answer=undefined
[FieldMap] Built q2: fieldName=lga, value=undefined, answer=undefined
[FieldMap Complete] Final fieldMapLocal: {q2: undefined, q1: undefined, lga: undefined, q2: undefined}
[showIf Debug] Question: lga, Condition: !!q2 && q2==="Anambra", FieldMap: {...}, Result: false, Visible: false
```

**After selecting "Anambra" in q2:**
```
[FieldMap] Built q1: fieldName=q2, value=Anambra, answer=Anambra
[FieldMap] Built q2: fieldName=lga, value=undefined, answer=undefined
[FieldMap Complete] Final fieldMapLocal: {q2: Anambra, q1: Anambra, lga: undefined, q2: undefined}
[evaluateFormula] Formula: !!q2 && q2==="Anambra"
[evaluateFormula] Identifiers found in formula: Set { 'q2' }
[evaluateFormula] VarNames to pass: q2
[evaluateFormula] Args: [ 'Anambra' ]
[evaluateFormula] Complete FieldMap: {q2: 'Anambra', q1: 'Anambra', lga: undefined, ...}
[evaluateFormula] Complete VarMap: {q2: 'Anambra'}
[evaluateFormula] Final Result: true
[showIf Debug] Question: lga, Condition: !!q2 && q2==="Anambra", FieldMap: {...}, Result: true, Visible: true
```

## Debugging Tips

If the field still doesn't appear:

1. **Check the fieldName:** Verify that the question actually has a fieldName set. The dependency uses fieldName (like "q2"), not the question ID.
   
2. **Check the condition:** 
   - Open form builder
   - Click on the lga question
   - Scroll down to "Visibility Condition (Show If)"
   - Verify the condition is exactly: `!!q2 && q2==="Anambra"`
   - Pay attention to spacing, quotes, and case sensitivity

3. **Check the console logs:**
   - Look for `[evaluateFormula] Final Result: true` after selecting "Anambra"
   - If it shows `false`, the condition didn't evaluate correctly
   - Check the fieldMap to see if q2 has the right value

4. **Verify data type:**
   - The comparison `q2==="Anambra"` is case-sensitive and uses strict equality
   - Ensure the dropdown option value is exactly "Anambra" (not "anambra" or with spaces)

## Common Issues & Solutions

### Issue: lga field still doesn't show after selecting "Anambra"

**Solution 1:** Check the fieldName
- Form Builder → q2 question → Scroll down
- Verify that "Field Name" is set to "q2"
- If it's empty or different, update it

**Solution 2:** Check the condition
- Form Builder → lga question → "Visibility Condition (Show If)"
- Clear and re-enter: `!!q2 && q2==="Anambra"`
- Note: First `!!q2` checks if q2 is not empty/undefined
- Second `q2==="Anambra"` checks if its value is exactly "Anambra"

**Solution 3:** Check dropdown option value
- Form Builder → q2 question → Click on dropdown options
- Verify "Anambra" is listed and its value is exactly "Anambra" (case-sensitive)

### Issue: Console shows `Result: false` even after selecting "Anambra"

**Causes:**
1. The fieldMap doesn't include q2 (check fieldName is set correctly)
2. The value stored is not "Anambra" (might be storing {value: "Anambra", score: 10})
3. The condition formula has a typo

**Check in console:**
- Look for: `[FieldMap] Built q1: fieldName=q2, value=...`
- If value is `undefined`, the answer wasn't saved properly
- If value is an object like `{value: "Anambra", score: 10}`, the extraction might not be working

### Issue: Console shows error "Formula execution error"

This means the JavaScript formula has a syntax error. 

**Check:**
- No unmatched parentheses or quotes
- Variable names match what's in fieldMap
- Syntax is valid JavaScript

## Testing Other Conditions

The fix works for any showIf condition. Test other patterns:

**Simple field presence:**
```
!!q2
```
(Shows if q2 is not empty)

**Numeric comparison:**
```
q1 > 18
```
(Shows if q1 (age) is greater than 18)

**Multiple conditions:**
```
!!q2 && q1 > 18
```
(Shows if both q2 is set AND q1 is greater than 18)

**OR condition:**
```
q2 === "Anambra" || q2 === "Lagos"
```
(Shows if q2 is either Anambra or Lagos)

## Success Indicators

✅ **Working Correctly When:**
- lga field appears immediately after selecting "Anambra" in q2
- lga field disappears when you select a different state
- Console shows `[evaluateFormula] Final Result: true` when condition is met
- Console shows `[evaluateFormula] Final Result: false` when condition is not met
- No errors in console

❌ **Not Working If:**
- lga field never appears even after selecting "Anambra"
- lga field appears but shouldn't
- Console shows errors or `undefined` values
- Condition evaluates to wrong result

## Rollback Instructions

If needed to rollback:
1. Navigate to `git log --oneline | head -5` to see recent commits
2. Find the commit before the dependency fix
3. Run: `git revert [commit-hash]`
4. Rebuild: `npm run build`

## Questions or Issues?

Check the following files for implementation details:
- `pages/FillFormPage.tsx` - Formula evaluation logic (lines 611-654)
- `pages/FillFormPage.tsx` - fieldMapLocal building (lines 1424-1480)
- `pages/FillFormPage.tsx` - showIf evaluation (lines 1477-1485)
