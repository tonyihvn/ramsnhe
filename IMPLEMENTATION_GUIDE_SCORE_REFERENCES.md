# Implementation Guide: Dropdown Score References in Formulas

## Overview

This implementation adds support for referencing dropdown option scores in formulas using the syntax `fieldname->score`. This enhancement enables:

1. **Computed Formula Fields**: Calculate totals/averages from scores
2. **ShowIf Conditions**: Show/hide fields based on score thresholds
3. **Dynamic Scoring**: Aggregate scores from multiple choice questions

## Technical Implementation

### Files Modified

#### 1. `utils/formulaEvaluator.ts`

**New Functions:**

```typescript
/**
 * Resolve field score references in formula
 * Format: fieldname->score
 * Returns the score value from field answers that have {value: ..., score: ...} structure
 */
export const resolveScoreReferences = (
    formula: string,
    fieldMap: Record<string, any>
): string
```

**Purpose**: Finds all score references in a formula and replaces them with their numeric values.

**Example:**
```
Input:  "q1->score + q2->score"
Output: "10 + 5"
```

---

```typescript
/**
 * Extract field names from formula to build complete variable map
 * Handles both regular field names and score references
 */
export const extractFieldNamesFromFormula = (formula: string): Set<string>
```

**Purpose**: Identifies all field names mentioned in a formula, excluding reserved keywords.

---

**Updated Function:**

```typescript
export const evaluateFormulasForForm = (
    formula: string,
    fieldMap: Record<string, any>,
    formulasContext: FormulasContext
): any
```

**Changes:**
- Now calls `resolveScoreReferences()` before evaluating the formula
- Uses `extractFieldNamesFromFormula()` for safer variable extraction
- Properly handles answer objects with both value and score properties

**Processing Order:**
1. Resolve score references (`fieldname->score` → numeric value)
2. Resolve cell references (cross-document references)
3. Extract field names and build variable map
4. Safely evaluate formula with variable parameters

#### 2. `pages/FillFormPage.tsx`

**Updated Function:**

```typescript
const evaluateFormula = (formula: string, fieldMap: Record<string, any>, formulasContext?: any)
```

**Changes:**
- Added score reference handling before formula evaluation
- Improved value extraction from answer objects
- Used regex to find and replace `fieldname->score` patterns
- Maintained backward compatibility with existing functionality

**Score Reference Resolution:**
```typescript
// Find score references: fieldname->score
const scoreRefPattern = /([a-z_][a-z0-9_]*)\s*->\s*score/gi;

// Extract value from fieldMap
if (fieldValue && typeof fieldValue === 'object' && 'score' in fieldValue) {
    scoreValue = String(fieldValue.score);  // Use the score property
} else if (typeof fieldValue === 'number') {
    scoreValue = String(fieldValue);  // Use field value directly if it's a number
}

// Replace in formula: "q1->score" becomes "10"
processedFormula = processedFormula.replace(..., scoreValue);
```

## Data Flow

### When a Dropdown Option is Selected

1. **User Selection**:
   - User clicks a dropdown option
   - Option has `{label, value, score}` structure

2. **Answer Storage**:
   ```javascript
   answers[questionId] = { value: "yes", score: 10 }
   ```

3. **FieldMap Building**:
   ```javascript
   const fieldMap = {
     "q1_severity": { value: "high", score: 10 },
     "q2_impact": { value: "medium", score: 5 }
   }
   ```

4. **Formula Evaluation**:
   - Input: `"q1_severity->score + q2_impact->score"`
   - After score resolution: `"10 + 5"`
   - Result: `15`

5. **ShowIf Evaluation**:
   - Input: `"q1_severity->score > 8"`
   - After score resolution: `"10 > 8"`
   - Result: `true` (show field)

## Usage Patterns

### Pattern 1: Score Aggregation
```
Scenario: Multiple assessment questions, each with scores
Formula: q1->score + q2->score + q3->score
Result: Total score across all questions
```

### Pattern 2: Score Averaging
```
Scenario: Average of multiple scored questions
Formula: (q1->score + q2->score + q3->score) / 3
Result: Mean score
```

### Pattern 3: Conditional Based on Score
```
Scenario: Show warning if score below threshold
ShowIf: q1->score < 50
Result: Display warning message
```

### Pattern 4: Score with Multiplier
```
Scenario: Weight different scores
Formula: (q1->score * 0.6) + (q2->score * 0.4)
Result: Weighted score
```

## Testing Checklist

Before deploying to production, verify:

### Unit Tests
- [ ] `resolveScoreReferences()` correctly replaces score references
- [ ] `extractFieldNamesFromFormula()` handles reserved keywords
- [ ] Score values are properly extracted from answer objects
- [ ] Null handling when score is missing

### Integration Tests  
- [ ] Computed field updates when dropdown selection changes
- [ ] ShowIf condition reevaluates after score changes
- [ ] Score references work in complex expressions
- [ ] Backward compatibility with non-score formulas

### UI Tests
- [ ] Dropdown option selection stores score
- [ ] Computed field displays correct calculated value
- [ ] ShowIf conditions show/hide fields properly
- [ ] Error messages display for invalid formulas

### Edge Cases
- [ ] Missing score property: should use `null`
- [ ] Numeric field values without objects: should work as-is
- [ ] Case sensitivity in field names: should be enforced
- [ ] Spaces in syntax: `fieldname -> score` should not work

## Example Form Configuration

### Question Setup (BuildFormPage)

**Question 1: Severity Assessment**
```json
{
  "id": "q1",
  "fieldName": "q1_severity",
  "questionText": "What is the severity level?",
  "answerType": "dropdown",
  "options": [
    { "label": "Critical", "value": "critical", "score": 10 },
    { "label": "High", "value": "high", "score": 7 },
    { "label": "Medium", "value": "medium", "score": 5 },
    { "label": "Low", "value": "low", "score": 2 }
  ]
}
```

**Question 2: Computed Risk Score**
```json
{
  "id": "q2",
  "fieldName": "risk_score",
  "questionText": "Risk Score",
  "answerType": "computed",
  "metadata": {
    "computedFormula": "q1_severity->score * 2"
  }
}
```

**Question 3: Conditional Alert**
```json
{
  "id": "q3",
  "questionText": "Alert: High Risk!",
  "answerType": "paragraph",
  "metadata": {
    "showIf": "q1_severity->score > 7",
    "content": "<p style='color: red;'>This requires immediate attention!</p>"
  }
}
```

### Form Behavior

1. User selects "Critical" for severity
2. `q1_severity` stores: `{ value: "critical", score: 10 }`
3. Computed field recalculates: `10 * 2 = 20`
4. ShowIf condition evaluates: `10 > 7 = true` → Alert displays

## Error Handling

### Invalid Score References
```
Formula: "unknown_field->score"
Result: null (field doesn't exist in fieldMap)
Fallback: 'null' string in formula → evaluates to null
```

### Missing Score Property
```
Formula: "q1->score" where q1 = "simple_string_value"
Result: null (string has no score property)
Fallback: 'null' string in formula → evaluates to null
```

### Formula Errors
```
Formula: "q1->score + "  // Syntax error
Result: null (caught by try-catch)
Console: Error logged for debugging
```

## Performance Considerations

1. **Regex Operations**: Score reference resolution uses regex once per evaluation
2. **FieldMap Lookups**: O(1) lookup for each field reference
3. **Formula Caching**: Currently recomputed on each dependency change
   - Future optimization: Memoize compiled formulas
4. **Large Formulas**: No performance impact for typical forms (<100 fields)

## Backward Compatibility

✅ **Fully Backward Compatible**

- Existing formulas without score references work unchanged
- Simple field references still work: `q1 + q2`
- Computed fields update when their dependencies change
- All existing formula functions available: `age()`, `parseDate()`, `diffDays()`

## Limitations & Future Enhancements

### Current Limitations
1. Checkbox options don't store scores by default (future: array score aggregation)
2. Score references only in formulas and showIf (not in option filtering yet)
3. No built-in score visualization (future: score bars, gauges)

### Potential Enhancements
1. **Multi-Select Scoring**: Aggregate scores from checkbox selections
2. **Score Validation**: Validate score ranges (min/max)
3. **Score Normalization**: Auto-normalize scores to 0-100 scale
4. **Score Tracking**: Store score history over time
5. **Score Analytics**: Dashboard view of score distributions

## Troubleshooting Guide

### Issue: Score Reference Returns null

**Causes:**
1. Field name typo or case mismatch
2. Dropdown option has no score defined
3. User hasn't selected an option yet

**Solutions:**
```
// Provide default value
(q1->score || 0) + (q2->score || 0)

// Use fallback with OR operator
q1->score > 50 || false
```

### Issue: Formula Shows NaN

**Causes:**
1. Trying to add non-numeric values
2. Score value is not a valid number
3. Null values in arithmetic operations

**Solutions:**
```
// Ensure numeric values
Number(q1->score) + Number(q2->score)

// Handle null scores
(q1->score || 0) + (q2->score || 0)

// Validate before using
q1->score && q1->score > 0 ? q1->score : 0
```

### Issue: ShowIf Condition Not Triggering

**Causes:**
1. Condition evaluates to falsy value
2. Field name doesn't match exactly
3. Field answer structure incorrect

**Solutions:**
```
// Check field exists and has value
!!q1->score && q1->score > 50

// Explicit true/false
q1->score > 50 ? true : false

// Use double NOT for boolean
!!q1->score
```

## Code Examples

### Example 1: Total Assessment Score
```javascript
// Formula in Computed Field
(assessment1->score + assessment2->score + assessment3->score) / 3

// Use case: Calculate average assessment score
```

### Example 2: Risk Level Categorization
```javascript
// ShowIf for Warning Message
q1->score > 70

// ShowIf for Error Message  
q1->score > 90

// Use case: Display warnings at different risk levels
```

### Example 3: Progressive Disclosure
```javascript
// Show Advanced Options only if user has skill score > 7
metadata.showIf = "experience->score > 7"

// Use case: Hide complex options from beginners
```

## Support & Documentation

For more details, see:
- [DROPDOWN_SCORE_REFERENCE_GUIDE.md](./DROPDOWN_SCORE_REFERENCE_GUIDE.md) - User guide with examples
- [types.ts](./types.ts) - Question and Answer type definitions
- [utils/formulaEvaluator.ts](./utils/formulaEvaluator.ts) - Formula evaluation logic
- [pages/FillFormPage.tsx](./pages/FillFormPage.tsx) - Form rendering and evaluation

## Deployment Notes

### Pre-Deployment
- [ ] All existing forms continue to work
- [ ] No database schema changes required
- [ ] No breaking API changes
- [ ] No data migration needed

### Post-Deployment
- [ ] Update form builder help text
- [ ] Create tutorial video for score references
- [ ] Add examples to form library
- [ ] Update user documentation

## Questions & Support

For implementation questions or issues:
1. Review examples in DROPDOWN_SCORE_REFERENCE_GUIDE.md
2. Check troubleshooting section above
3. Test formula in browser console
4. Contact development team with formula details
