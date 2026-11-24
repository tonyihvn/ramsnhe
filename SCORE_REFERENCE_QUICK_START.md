# Score Reference Quick Start

## What is it?

Access dropdown option scores in formulas using: **`fieldname->score`**

## Why use it?

✅ Calculate totals from multiple scored questions  
✅ Create conditional logic based on scores  
✅ Build dynamic forms with score-based visibility  

## 3-Step Setup

### Step 1: Create Dropdown with Scores
In Form Builder, add a dropdown question:
- **Field Name**: `q1_severity` (lowercase, no spaces)
- **Options**:
  - "Critical" (score: 10)
  - "High" (score: 7)
  - "Medium" (score: 5)

### Step 2: Add Computed Field
Add a computed field question:
- **Field Name**: `risk_assessment`
- **Formula**: `q1_severity->score * 2`

### Step 3: Use in showIf (Optional)
Show/hide another field:
- **Field Name**: `alert_message`
- **ShowIf**: `q1_severity->score >= 7`

## Formula Syntax

### Basic Score Reference
```
fieldname->score
```

### Common Formulas
```
// Add scores
q1->score + q2->score

// Average
(q1->score + q2->score) / 2

// Multiply
q1->score * 2

// Comparison (for showIf)
q1->score > 50

// Conditional logic
q1->score > 70 && q2->score < 30
```

## Real-World Examples

### Healthcare: Patient Risk Score
```
Field: severity_level
Options: Critical (10), Moderate (5), Mild (1)

Computed Formula: severity_level->score * age_factor
Result: Risk score based on severity
```

### Education: Student Assessment
```
Fields: 
- knowledge_test->score (1-10)
- practical_skills->score (1-10)
- participation->score (1-10)

Computed Formula: (knowledge_test->score + practical_skills->score + participation->score) / 3
Result: Final grade (average of three components)
```

### Survey: Satisfaction Score
```
Field: satisfaction
Options: Very Satisfied (5), Satisfied (4), Neutral (3), Dissatisfied (2)

ShowIf for follow-up question: satisfaction->score < 4
Result: Show follow-up only if customer is not satisfied
```

## Important Notes

⚠️ **Field Name**: Must match exactly (case-sensitive)  
⚠️ **Score Value**: Must be defined on dropdown options  
⚠️ **Result**: Returns `null` if field has no score  

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Score returns null | Verify field name matches exactly and option has score |
| Formula shows NaN | Ensure scores are numeric, use `\|\| 0` as fallback |
| Computed field empty | Check if field has a value selected |
| ShowIf not working | Use `!!fieldname->score > 50` to check existence |

## Need Help?

See detailed guide: [DROPDOWN_SCORE_REFERENCE_GUIDE.md](./DROPDOWN_SCORE_REFERENCE_GUIDE.md)

## Cheat Sheet

```
✓ Correct:  q1->score
✗ Wrong:    q1 -> score (space before arrow)
✗ Wrong:    q1->Score (capital S)

✓ Correct:  q1->score + q2->score
✓ Correct:  (q1->score + q2->score) / 2
✓ Correct:  q1->score > 50 ? "Yes" : "No"

✓ Works in: Computed Formula fields
✓ Works in: ShowIf conditions
```
