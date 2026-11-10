# Formula Evaluation and Form Loading Fixes

## Summary
Fixed two critical issues in FillFormPage:
1. **Formula evaluation error** - Conditions with `===` operator were failing
2. **Form loading delays** - Users saw "Activity not found" message before form loaded

## Issue 1: Formula Evaluation Error

### Problem
Forms with conditional field visibility using formulas like `!!gender && gender==="Female"` were failing with:
```
Error evaluating formula !!gender && gender==="Female" SyntaxError: Arg string terminates parameters early
```

### Root Cause
The `evaluateFormula()` function was trying to substitute field values directly into the formula string using regex replacement. When values contained special characters (quotes, etc.), this broke the JavaScript syntax.

Example of what was happening:
```javascript
// If gender value was: Female
// The substitution would create:
new Function('gender', 'age', 'parseDate', 'diffDays', 'try { return !!Female && Female==="Female"; } catch(e){ return null; }')
// This is invalid syntax - Female is not quoted
```

### Solution
Changed from string substitution to parameter passing:
```javascript
// Before: Substituting values into formula string (unsafe)
let processedFormula = formula;
for (const cellRef of cellMatches) {
    const cellValue = fieldMap[cellRef];
    const replacement = typeof cellValue === 'number' ? cellValue : JSON.stringify(cellValue);
    processedFormula = processedFormula.replace(...);
}
const fn = new Function(...varNames, ..., `try { return ${processedFormula}; } ...`);

// After: Passing values as parameters (safe)
const varNames = Object.keys(fieldMap || {}).filter(...);
const args = varNames.map(n => {
    const v = fieldMap[n];
    if (typeof v === 'string' && /^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
    return v;
});
const fn = new Function(...varNames, 'age', 'parseDate', 'diffDays', `try { return ${formula}; } catch(e){ return null; }`);
return fn(...args, age, parseDate, diffDays);
```

### Benefits
- ✅ No more string injection issues
- ✅ Formulas with quotes and special characters work correctly
- ✅ String literals in formulas remain unchanged
- ✅ Type coercion still works (numeric strings → numbers)

### Testing
Tested formulas:
- ✅ `!!gender && gender==="Female"` - String equality
- ✅ `!!q2 && q2 === "selected"` - Field existence check
- ✅ `!!description && description.includes("test")` - String methods

## Issue 2: Form Loading Delays and "Activity not found" Message

### Problem
Users navigating to `/activities/fill/{activityId}` would:
1. See "Activity not found" error message
2. After a few seconds, the form would load correctly
3. This was confusing and looked like a bug

### Root Cause
The page flow:
1. Component renders with empty `activities` array (still loading from API)
2. `getActivity(activityId)` returns undefined
3. Page shows "Activity not found"
4. Activities data arrives from API, but component doesn't re-render
5. Eventually data syncs and form appears

The issue was that `activity` was being fetched synchronously from a cache that wasn't populated yet.

### Solution
Implemented proper async loading:

1. **Added loading state**:
```javascript
const [activity, setActivity] = useState<Activity | undefined>(undefined);
const [activityLoading, setActivityLoading] = useState(true);
const [activityError, setActivityError] = useState<string | null>(null);
```

2. **Fetch from cache or API**:
```javascript
React.useEffect(() => {
    if (!activityId) {
        setActivityError('No activity ID provided');
        setActivityLoading(false);
        return;
    }

    // Try cache first
    const cachedActivity = getActivity(activityId);
    if (cachedActivity) {
        setActivity(cachedActivity);
        setActivityLoading(false);
        return;
    }

    // Fallback to API
    setActivityLoading(true);
    fetch(`/api/activities/${activityId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(activity => setActivity(activity))
        .finally(() => setActivityLoading(false));
}, [activityId]);
```

3. **Show appropriate UI state**:
```javascript
// While loading
if (activityLoading) {
    return <LoadingSpinner />;
}

// If error
if (activityError || !activity) {
    return <ErrorMessage />;
}

// Normal rendering
return <FormContent />;
```

### UX Improvements
- ✅ Shows loading spinner instead of error message
- ✅ Clearly communicates when activity is truly not found
- ✅ Provides "Back to Activities" button for errors
- ✅ No more confusing error messages that disappear

## Files Changed
- **pages/FillFormPage.tsx**
  - Lines 440-450: Added activity loading state and useEffect
  - Lines 550-580: Simplified evaluateFormula to use parameter passing
  - Lines 1282-1310: Replaced error check with loading/error handling

## Testing Recommendations

### Test Formula Fixes
1. Create a form with conditional field visibility
2. Use formula: `!!q2 && q2==="option1"`
3. Verify field shows/hides based on q2 selection
4. Test with values containing quotes and special characters

### Test Loading Fixes
1. Navigate directly to `/activities/fill/{validId}` 
   - Should show loading spinner briefly
   - Form should load without error message
   
2. Navigate to `/activities/fill/{invalidId}`
   - Should show "Activity not found" error
   - Should provide "Back to Activities" button
   
3. Test on slow network (DevTools → Slow 4G)
   - Loading spinner should appear and disappear smoothly
   - No flash of error messages

## Performance Impact
- **Formula evaluation**: Slight improvement (fewer regex operations)
- **Form loading**: No impact (same API calls, just better UX)
- **Memory**: Negligible (one additional state variable per page)

## Backward Compatibility
✅ All changes are backward compatible
- Formula syntax unchanged (still use variable names and string literals)
- API endpoints unchanged
- No breaking changes to component API

## Related Issues
- Fixes: Multilevel select not working with string comparison
- Fixes: "Activity not found" flash on page load
- Related: Settings save 500 error (previous fix in same session)
