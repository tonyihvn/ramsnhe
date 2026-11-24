# Score Reference Feature - Visual Guide

## How It Works (Step by Step)

### Step 1: Define Dropdown Options with Scores

**In Form Builder (`/activities/build/{id}`):**

```
Question: "What is the severity level?"
Field Name: q1_severity
Answer Type: Dropdown

Options (with scores):
┌─────────────────────────────────┐
│ Label      │ Value      │ Score │
├─────────────────────────────────┤
│ Critical   │ critical   │ 10    │
│ High       │ high       │ 7     │
│ Medium     │ medium     │ 5     │
│ Low        │ low        │ 2     │
└─────────────────────────────────┘
```

### Step 2: Create Computed Formula Using Score

**Add computed field:**

```
Question: "Risk Score"
Field Name: risk_score
Answer Type: Computed Field
Formula: q1_severity->score
```

### Step 3: User Selects Option

```
User selects: "High" from dropdown
                    ↓
System stores: answers[q1] = {
  value: "high",
  score: 7
}
```

### Step 4: Formula Evaluates

```
Formula: "q1_severity->score"
        ↓
Lookup fieldMap: q1_severity = {value: "high", score: 7}
        ↓
Resolve reference: "7"
        ↓
Evaluate: 7
        ↓
Display: "Risk Score: 7"
```

---

## Formula Examples with Visuals

### Example 1: Total Score from Multiple Fields

```
Scenario: Calculate total risk from two factors

Formula: "severity->score + probability->score"

User Input:
  Severity: "High" (score: 10)
  Probability: "Medium" (score: 5)

Calculation:
  "10 + 5" = 15

Result: 15
```

### Example 2: Average of Multiple Scores

```
Scenario: Calculate average assessment score

Formula: "(knowledge->score + skills->score + attitude->score) / 3"

User Input:
  Knowledge: "Advanced" (score: 90)
  Skills: "Intermediate" (score: 75)  
  Attitude: "Positive" (score: 85)

Calculation:
  "(90 + 75 + 85) / 3" = 250 / 3 = 83.33

Result: 83.33
```

### Example 3: ShowIf Conditional Display

```
Scenario: Show warning if risk is high

Question Configuration:
  Field Name: warning_message
  Answer Type: Paragraph
  ShowIf: "severity->score > 7"

Scenario A - High Severity:
  User selects: "Critical" (score: 10)
  Condition: "10 > 7" = TRUE
  Result: ✓ Warning displays

Scenario B - Low Severity:
  User selects: "Low" (score: 2)
  Condition: "2 > 7" = FALSE
  Result: ✗ Warning hidden
```

### Example 4: Score with Multiplier

```
Scenario: Apply weight to score

Formula: "(impact->score * 2) + (likelihood->score * 1)"

User Input:
  Impact: "High" (score: 8)
  Likelihood: "Medium" (score: 5)

Calculation:
  "(8 * 2) + (5 * 1)" = 16 + 5 = 21

Result: 21
```

---

## Decision Tree: When to Use Score References

```
                    Do you have a dropdown?
                           │
                ┌──────────┴──────────┐
              YES                      NO
               │                        │
     Does option              Use regular field
     have score?              reference
         │
      YES│
         │
    Use fieldname->score
    in formulas/showIf
         │
         └─→ Done! ✓
```

---

## Comparison: Old vs New Syntax

### Old Way (Without Score Reference)

```javascript
// Define options without scores
options: ["High", "Medium", "Low"]

// In computed formula - manual mapping
computedFormula: `
  severity === 'High' ? 10 :
  severity === 'Medium' ? 5 :
  severity === 'Low' ? 2 :
  0
`

// Problems:
// ❌ Scores hardcoded in formula
// ❌ Difficult to read
// ❌ Easy to make mistakes
// ❌ Hard to maintain and update
```

### New Way (With Score Reference)

```javascript
// Define options with scores
options: [
  { label: "High", value: "high", score: 10 },
  { label: "Medium", value: "medium", score: 5 },
  { label: "Low", value: "low", score: 2 }
]

// In computed formula - direct reference
computedFormula: "severity->score"

// Benefits:
// ✓ Single source of truth
// ✓ Clear and readable
// ✓ Less error-prone
// ✓ Easy to maintain
```

---

## Score Reference Anatomy

```
fieldname   ->   score
   │             │      │
   │             │      └─ What to get (always "score")
   │             └────────── Arrow operator
   └───────────────────────── Question's field name
                            (must match exactly, case-sensitive)

Examples:
✓ severity->score        (lowercase, underscore)
✓ assessment_level->score
✓ customer_satisfaction->score
✗ Severity->score        (capital S - wrong!)
✗ severity -> score      (space before arrow - wrong!)
✗ severity->Score        (capital S - wrong!)
```

---

## Form Building Flow Diagram

```
START
  │
  ├─→ Create Form
  │      │
  │      └─→ Add Dropdown Question
  │             │
  │             └─→ Set Field Name: "q1_severity"
  │                    │
  │                    └─→ Add Options with Scores:
  │                           • High (score: 10)
  │                           • Medium (score: 5)
  │                           • Low (score: 2)
  │
  ├─→ Add Computed Field Question
  │      │
  │      └─→ Set Field Name: "total_risk"
  │             │
  │             └─→ Set Formula: "q1_severity->score * 2"
  │
  ├─→ Add Conditional Display Question  
  │      │
  │      └─→ Set ShowIf: "q1_severity->score > 7"
  │
  └─→ SAVE & TEST
         │
         ├─→ Open Form (/activities/fill/...)
         │
         ├─→ Select Dropdown Option
         │      │
         │      └─→ Computed field shows score
         │      └─→ Conditional field shows/hides
         │
         └─→ DONE! ✓
```

---

## Common Formula Patterns

```
Pattern 1: Reference Single Score
╔═══════════════════════════════╗
║ fieldname->score              ║
╚═══════════════════════════════╝
Result: Numeric value of score
Example: severity->score = 10


Pattern 2: Add Multiple Scores
╔═══════════════════════════════╗
║ field1->score + field2->score ║
╚═══════════════════════════════╝
Result: Sum of scores
Example: 10 + 5 = 15


Pattern 3: Average Scores
╔════════════════════════════════════════════┐
║ (f1->score + f2->score + f3->score) / 3   ║
╚════════════════════════════════════════════╝
Result: Average
Example: (10 + 7 + 8) / 3 = 8.33


Pattern 4: Compare Score (ShowIf)
╔═══════════════════════════════╗
║ fieldname->score > threshold  ║
╚═══════════════════════════════╝
Result: Boolean (true/false)
Example: severity->score > 7 = true


Pattern 5: Multiple Conditions
╔═════════════════════════════════════════════╗
║ cond1->score > 5 && cond2->score < 10     ║
╚═════════════════════════════════════════════╝
Result: Boolean (true/false)
Example: 10 > 5 && 7 < 10 = true


Pattern 6: Weighted Score
╔════════════════════════════════════════════╗
║ (f1->score * 0.6) + (f2->score * 0.4)    ║
╚════════════════════════════════════════════╝
Result: Weighted average
Example: (10 * 0.6) + (5 * 0.4) = 8
```

---

## Troubleshooting Visual Guide

```
Is formula showing null?
   │
   ├─ Check field name matches exactly
   │  └─ severity->score (not Severity->score)
   │
   ├─ Check dropdown option has score
   │  └─ Each option must have score property
   │
   └─ Check user selected a value
      └─ Empty selection = null result


Is formula showing NaN?
   │
   ├─ Check scores are numeric
   │  └─ Not text, must be numbers
   │
   ├─ Check no invalid operations
   │  └─ Can't do string + number
   │
   └─ Use fallback: (q1->score || 0) + q2->score


Is ShowIf not triggering?
   │
   ├─ Check condition result type
   │  └─ ShowIf needs boolean (true/false)
   │
   ├─ Check field has value selected
   │  └─ Empty field = null = false
   │
   └─ Use double NOT: !!field->score > 50
```

---

## Data Structure Diagram

```
Question Configuration:
┌─────────────────────────────────────┐
│ Question                            │
│  ├─ fieldName: "severity"          │
│  ├─ answerType: "dropdown"          │
│  └─ options: [                      │
│      {                              │
│        label: "Critical",           │
│        value: "critical",           │
│        score: 10  ◄─── SCORE HERE  │
│      },                             │
│      {                              │
│        label: "High",               │
│        value: "high",               │
│        score: 7                     │
│      }                              │
│    ]                                │
└─────────────────────────────────────┘

User Selection:
┌─────────────────────────────────────┐
│ answers[questionId] = {             │
│   value: "critical",  ◄─ User chose │
│   score: 10          ◄─ From option │
│ }                                   │
└─────────────────────────────────────┘

Formula Reference:
┌─────────────────────────────────────┐
│ Formula: "severity->score + 5"      │
│          │          │        │      │
│          │          │        └─ Constant
│          │          └────── Reference
│          └─────────────────── Field name
│                                     │
│ Resolves to: "10 + 5" = 15        │
└─────────────────────────────────────┘
```

---

## Workflow Example: Risk Assessment

```
Step 1: Setup Form
╔════════════════════════════════════╗
║ Question 1: "Severity?"            ║
║ Type: Dropdown                     ║
║ Field: q1_severity                 ║
║ Options: Critical(10), High(7),   ║
║          Medium(5), Low(2)        ║
║                                   ║
║ Question 2: "Probability?"        ║
║ Type: Dropdown                    ║
║ Field: q2_probability             ║
║ Options: High(10), Medium(5),    ║
║          Low(2)                   ║
║                                   ║
║ Question 3: "Total Risk"          ║
║ Type: Computed                    ║
║ Field: total_risk                 ║
║ Formula: q1_severity->score +     ║
║          q2_probability->score    ║
╚════════════════════════════════════╝

Step 2: User Fills Form
╔════════════════════════════════════╗
║ Select Severity: "High" (score:7) ║
║ Select Probability: "Medium"(5)   ║
╚════════════════════════════════════╝

Step 3: System Calculates
╔════════════════════════════════════╗
║ fieldMap = {                      ║
║   q1_severity: {value:"high", score:7}  ║
║   q2_probability: {value:"med", score:5}║
║ }                                 ║
║                                   ║
║ Formula: "7 + 5" = 12            ║
║ Result: total_risk = 12          ║
╚════════════════════════════════════╝

Step 4: Display Result
╔════════════════════════════════════╗
║ Severity: High (7)                ║
║ Probability: Medium (5)           ║
║ Total Risk: 12                    ║
╚════════════════════════════════════╝
```

---

## Quick Reference Card

**Syntax:**
```
fieldname->score
```

**Works In:**
- Computed Formula fields
- ShowIf conditions

**Returns:**
- Numeric value if score exists
- Null if score missing

**Case Sensitive:**
- Field names: YES
- Keyword "score": YES
- Must match exactly

**Examples:**
```
✓ q1->score
✓ assessment->score
✓ q1->score + q2->score
✓ (q1->score + q2->score) / 2
✓ q1->score > 50
✓ !!q1->score
```

**Common Mistakes:**
```
✗ q1 -> score (spaces)
✗ q1->Score (capital S)
✗ q1[score] (brackets)
✗ q1.score (dot notation)
```

---

This visual guide provides quick reference for understanding and using the score reference feature.
