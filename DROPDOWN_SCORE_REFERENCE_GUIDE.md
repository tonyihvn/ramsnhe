# Dropdown Option Score Reference in Formulas

## Overview

This feature allows you to reference dropdown, radio button, and checkbox option scores in Computed Formula fields and showIf conditions using the syntax: **`fieldname->score`**

This is particularly useful for:
- Calculating total scores from multiple choice questions
- Creating conditional logic based on scores
- Displaying different content based on score thresholds

## How It Works

### Setup: Enable Scores on Dropdown Options

1. **In Build Form Page (`/activities/build/{id}`)**:
   - Add a dropdown, radio button, or checkbox question
   - Each option can have an associated **score** value
   - Scores are stored in the question's options array

2. **Example Options Structure**:
   ```json
   {
     "label": "Yes",
     "value": "yes",
     "score": 10
   },
   {
     "label": "No",
     "value": "no",
     "score": 0
   }
   ```

### Storage Format

When a user selects a dropdown/radio option, the answer is stored as:
```javascript
{
  "value": "yes",      // The selected option value
  "score": 10          // The score from that option
}
```

## Usage Examples

### Example 1: Computed Field - Total Score

**Setup:**
- Question 1 (fieldName: `q1_severity`): Dropdown with scores (High=10, Medium=5, Low=0)
- Question 2 (fieldName: `q2_impact`): Dropdown with scores (High=10, Medium=5, Low=0)
- Question 3 (fieldName: `risk_score`): Computed field

**Formula in Computed Field:**
```
q1_severity->score + q2_impact->score
```

**Result:**
If user selects "High" (10) + "Medium" (5), the computed field shows: `15`

---

### Example 2: Conditional Logic with Scores

**Setup:**
- Question 1 (fieldName: `assessment`): Dropdown with scores (Pass=100, Fail=0)
- Question 2 (fieldName: `performance_level`): Text field with showIf condition

**showIf Condition:**
```
assessment->score > 50
```

**Behavior:**
- If user selects "Pass" (score 100), `assessment->score > 50` evaluates to `true` → field displays
- If user selects "Fail" (score 0), `assessment->score > 50` evaluates to `false` → field hides

---

### Example 3: Complex Formula with Scores

**Setup:**
- Question 1 (fieldName: `knowledge`): Radio with scores (Excellent=4, Good=3, Fair=2, Poor=1)
- Question 2 (fieldName: `skills`): Radio with scores (Advanced=4, Intermediate=3, Basic=2, Beginner=1)
- Question 3 (fieldName: `final_rating`): Computed field

**Formula:**
```
(knowledge->score + skills->score) / 2
```

**Result:**
Average of the two scores. If both are "Good" (3), result is: `3`

---

### Example 4: Conditional Formatting Based on Score

**Setup:**
- Question 1 (fieldName: `compliance_check`): Checkbox with scores
- Question 2 (fieldName: `warning_message`): Paragraph with showIf

**showIf Condition:**
```
compliance_check->score < 50
```

**Behavior:**
- Displays warning only if the compliance score is below 50

## Syntax Reference

### Score Reference Pattern
```
fieldname->score
```

**Rules:**
- `fieldname` must match the machine-friendly field name you assigned to the question
- The `->score` syntax is case-sensitive
- Works in both formulas and showIf conditions
- Returns `null` if the field has no score value

### Valid Examples
```
q1->score                           // Basic score reference
(q1->score + q2->score) / 2        // Arithmetic with scores
q1->score > 50                      // Comparison with scores
q1->score >= 50 && q2->score < 100 // Logical conditions
assessment->score + 10              // Score + constant
```

### Invalid Examples
```
q1 -> score                         // Space before arrow (incorrect)
q1->Score                           // Capital S (case-sensitive)
q1[score]                           // Wrong syntax
score(q1)                           // Wrong syntax
```

## Technical Implementation

### How Score References Are Resolved

1. **Formula Recognition**: When evaluating a formula containing `fieldname->score`:
   ```javascript
   // Regex pattern to identify score references
   /([a-z_][a-z0-9_]*)\s*->\s*score/gi
   ```

2. **Value Extraction**: For each score reference:
   - Looks up the field value in the fieldMap
   - If the value is an object with a `score` property: uses `value.score`
   - If the value is a plain number: uses it directly
   - If the value is missing/null: uses `null`

3. **Formula Transformation**: 
   - Original: `q1->score + q2->score`
   - After resolution: `10 + 5`
   - Result: `15`

### In Code

The implementation involves two main files:

**1. `utils/formulaEvaluator.ts`**
- `resolveScoreReferences()`: Finds and replaces score references in formulas
- `extractFieldNamesFromFormula()`: Identifies field names used in formulas
- Updated `evaluateFormulasForForm()`: Integrates score reference resolution

**2. `pages/FillFormPage.tsx`**
- Updated `evaluateFormula()` function: Handles score references for showIf and computed fields
- Maintains fieldMap with full answer objects (including scores)

## Best Practices

### 1. Naming Conventions
Use descriptive, lowercase field names:
```
✓ q1_severity, impact_level, compliance_score
✗ Question1, Q_1, Q1_SEVERITY
```

### 2. Score Value Range
Define consistent score ranges:
```javascript
// Good: 0-100 scale
{ label: "Yes", value: "yes", score: 100 },
{ label: "No", value: "no", score: 0 }

// Good: 1-5 scale  
{ label: "Excellent", value: "excellent", score: 5 },
{ label: "Poor", value: "poor", score: 1 }

// Avoid inconsistent ranges
```

### 3. Document Score Meanings
In the question helper text, explain what scores mean:
```
"Assessment: Select your rating (Excellent=5, Good=4, Fair=3, Poor=1)"
```

### 4. Computed Field Descriptions
Explain what the formula calculates:
```
Computed Field: "Overall Risk Score"
Helper: "Sum of severity (0-10) and probability (0-10)"
Formula: "severity->score + probability->score"
```

## Limitations & Edge Cases

### Edge Case 1: Missing Score Value
```javascript
// If field has no score
fieldname->score  // Resolves to: null
```

### Edge Case 2: Checkbox Multiple Values
Checkboxes don't store scores by default (they store arrays of values).
Current behavior: `fieldname->score` returns `null` for checkbox answers.

**Workaround**: Use computed fields to calculate scores from checkbox selections:
```
// If checkboxes are stored as array: [val1, val2]
(options.includes('option1') ? 10 : 0) + (options.includes('option2') ? 5 : 0)
```

### Edge Case 3: Cross-Field Dependencies
If a computed field depends on another computed field:
```javascript
// This works because computed fields are recalculated in dependency order
final_score->score  // Uses the computed result from final_score
```

## Troubleshooting

### Formula Returns `null`
**Possible causes:**
1. Field name typo: Check exact field name matches
2. No score defined: Ensure dropdown options have score values
3. Field empty: User hasn't selected an option yet

**Solution:**
- Use default values in showIf: `fieldname->score || 0`
- In computed fields, handle null: `(fieldname->score || 0) + other_field`

### Formula Returns `NaN`
**Possible causes:**
1. Trying to add non-numeric values
2. Score value is not a valid number

**Solution:**
- Verify scores are numeric in question options
- Use error handling: Check formula logic for invalid operations

### showIf Condition Not Working
**Possible causes:**
1. Formula syntax error
2. Field name doesn't exist
3. Condition evaluates to falsy value

**Solution:**
- Test formula in browser console
- Verify field name matches exactly
- Use `!!fieldname->score` to check existence: `!!fieldname->score > 0`

## Examples by Use Case

### Healthcare: Patient Assessment
```
// Fields:
- blood_pressure->score (High=3, Normal=1)
- bmi->score (Obese=3, Overweight=2, Normal=1)
- risk_level (computed)

// Formula:
blood_pressure->score + bmi->score

// Result: Total risk score
```

### Education: Student Evaluation
```
// Fields:
- attendance->score (Excellent=10, Good=7, Fair=4, Poor=0)
- participation->score (100, 80, 60, 40)
- exam->score (100, 80, 60, 0)
- final_grade (computed)

// Formula:
(attendance->score + participation->score + exam->score) / 3

// Result: Weighted average grade
```

### Survey: Satisfaction Score
```
// Fields:
- question1->score (Very Satisfied=5, Satisfied=4, Neutral=3, Dissatisfied=2, Very Dissatisfied=1)
- question2->score (5, 4, 3, 2, 1)
- question3->score (5, 4, 3, 2, 1)
- satisfaction_index (computed)

// Formula:
(question1->score + question2->score + question3->score) / 3

// Result: Average satisfaction (1-5 scale)
```

## Related Features

- **Computed Fields**: Use formulas to calculate values automatically
- **ShowIf Conditions**: Use score references to conditionally show/hide fields
- **Field Dependencies**: Dropdown filtering based on parent field values
- **Score Aggregation**: Sum or average multiple scored questions

## Support

For issues or questions about score references:
1. Check the **Troubleshooting** section above
2. Verify field names exactly match in Form Builder
3. Test formulas step-by-step in browser console
4. Review examples matching your use case
