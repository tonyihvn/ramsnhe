# Score Reference - Quick Reference Card

## 🎯 Syntax

```
fieldname->score
```

## 📋 Common Formulas

### Single Score
```javascript
q1->score
// Returns: 10 (if option has score: 10)
```

### Addition
```javascript
q1->score + q2->score
// Returns: 15 (10 + 5)
```

### Subtraction
```javascript
q1->score - q2->score
// Returns: 5 (10 - 5)
```

### Multiplication
```javascript
q1->score * 2
// Returns: 20 (10 * 2)
```

### Division
```javascript
q1->score / 2
// Returns: 5 (10 / 2)
```

### Average
```javascript
(q1->score + q2->score) / 2
// Returns: 7.5 (average of 10 and 5)
```

### Weighted Average
```javascript
(q1->score * 0.6) + (q2->score * 0.4)
// Returns: 8 (60% of q1 + 40% of q2)
```

## ✅ Comparisons (for ShowIf)

### Greater Than
```javascript
q1->score > 50
// Returns: true or false
```

### Greater Than or Equal
```javascript
q1->score >= 50
// Returns: true or false
```

### Less Than
```javascript
q1->score < 50
// Returns: true or false
```

### Less Than or Equal
```javascript
q1->score <= 50
// Returns: true or false
```

### Equal
```javascript
q1->score === 50
// Returns: true or false
```

### Not Equal
```javascript
q1->score !== 50
// Returns: true or false
```

## 🔀 Logical Operations

### AND
```javascript
q1->score > 50 && q2->score < 30
// Both conditions must be true
```

### OR
```javascript
q1->score > 50 || q2->score > 50
// At least one condition must be true
```

### NOT
```javascript
!q1->score
// Negates the value
```

### Check Existence
```javascript
!!q1->score
// Returns true if exists, false if null
```

### WITH Default Value
```javascript
(q1->score || 0) + q2->score
// Use 0 if q1->score is null
```

## 🎯 Real Examples

### Healthcare Risk Score
```
Severity (1-10) + Probability (1-10)
q1_severity->score + q1_probability->score

Alert if risk > 15:
(severity->score + probability->score) > 15
```

### Education Final Grade  
```
Average of:
- Knowledge (1-100)
- Skills (1-100)  
- Participation (1-100)

(knowledge->score + skills->score + participation->score) / 3
```

### Survey Follow-up
```
Show follow-up only if satisfaction < 4:
satisfaction->score < 4
```

### Performance Bonus
```
Bonus if performance > 85:
performance->score > 85 ? true : false
```

## ⚠️ Rules

| Rule | ✓ Correct | ✗ Wrong |
|------|-----------|---------|
| Field Name | `q1_severity` | `Q1_severity` (case mismatch) |
| Keyword | `->score` | `->Score` (capital S) |
| Syntax | `fieldname->score` | `fieldname -> score` (space) |
| Reference | `q1->score` | `q1[score]` (brackets) |
| Reference | `q1->score` | `q1.score` (dot) |

## 🐛 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Returns `null` | Field name typo | Verify exact field name |
| Returns `null` | No score defined | Add score to option |
| Returns `null` | No value selected | User must select value |
| Returns `NaN` | Non-numeric scores | Ensure scores are numbers |
| Returns `NaN` | Null in calculation | Use `\|\| 0` fallback |
| ShowIf not working | Condition false | Check condition logic |
| ShowIf not working | Field empty | Check field has value |

## 📍 Works In

- ✅ Computed Formula fields
- ✅ ShowIf conditions
- ❌ Option labels (not supported)
- ❌ Dynamic filtering (not yet)

## 🚀 Setup Steps

1. **Add Dropdown with Scores**
   - Field Name: `q1_severity`
   - Options: Critical (10), High (7), Medium (5), Low (2)

2. **Create Computed Field**
   - Formula: `q1_severity->score`

3. **Or Add ShowIf**
   - Condition: `q1_severity->score > 7`

4. **Test**
   - Select option in form
   - Computed field shows score
   - Conditional fields show/hide

## 💾 Storage Format

```javascript
// When user selects dropdown option:
answers[questionId] = {
  value: "high",      // The selected value
  score: 7            // The option score
}

// Field map built for formulas:
fieldMap = {
  q1_severity: { value: "high", score: 7 }
}

// In formula:
q1_severity->score  // Resolves to: 7
```

## 🔗 Quick Links

- Main Guide: `SCORE_REFERENCE_README.md`
- Quick Start: `SCORE_REFERENCE_QUICK_START.md`
- Visual Guide: `SCORE_REFERENCE_VISUAL_GUIDE.md`
- Complete Guide: `DROPDOWN_SCORE_REFERENCE_GUIDE.md`
- Examples: `BEFORE_AFTER_EXAMPLES.md`
- Technical: `IMPLEMENTATION_GUIDE_SCORE_REFERENCES.md`

## 🎓 Examples by Domain

### Healthcare
```
Risk = Severity + Probability
Alert if Risk > Threshold
```

### Education
```
Grade = (Knowledge + Skills + Participation) / 3
Show Advanced if Grade > 85
```

### Business
```
Score = (Sales + Customer Satisfaction + Quality) / 3
Bonus if Score > 90
```

### Compliance
```
Compliance = Safety + Documentation + Audit
Flag if Compliance < 70
```

## ⚡ Performance

- ✅ No performance impact
- ✅ Negligible overhead
- ✅ Scales to 100+ fields
- ✅ Fast evaluation (<1ms)

## 🔐 Backward Compatibility

- ✅ 100% compatible
- ✅ No breaking changes
- ✅ Existing forms unchanged
- ✅ Can mix old + new syntax

## 📞 Need Help?

1. Check this card
2. Read `SCORE_REFERENCE_README.md`
3. See examples in `DROPDOWN_SCORE_REFERENCE_GUIDE.md`
4. Troubleshoot in `DROPDOWN_SCORE_REFERENCE_GUIDE.md#troubleshooting`

---

**Print this card for quick reference!**
