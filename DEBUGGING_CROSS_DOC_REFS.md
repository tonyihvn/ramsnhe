# Cross-Document Cell References - Debugging & Testing

## How to Test Cross-Document Cell References

### Setup
1. Create or open a report
2. Upload 2+ Excel files with some data
3. Edit one of the files and add formulas that reference cells from another file

### Test Case 1: Simple Cross-Document Reference
**Document 1**: "Sales.xlsx" - Cell A1 contains value `100`
**Document 2**: "Multiplier.xlsx" - Cell B2 contains value `2`

**Formula in Document 1, Cell C1**:
```javascript
report1.doc2_M_B2 * report1_S_A1
```

**Expected Result**: `2 * 100 = 200`

### Test Case 2: Same-Document Reference (Should Still Work)
**Document 1**: "Data.xlsx"
- Cell A1 = `50`
- Cell A2 = `30`

**Formula in Document 1, Cell A3**:
```javascript
report1_D_A1 + report1_D_A2
```

**Expected Result**: `50 + 30 = 80`

### Test Case 3: Multiple Cross-Document References
**Document 1**: "Budget.xlsx"
- A1 = `1000` (total budget)

**Document 2**: "Expenses.xlsx"
- B1 = `300` (item 1)
- B2 = `200` (item 2)

**Formula in Document 1, Cell A2**:
```javascript
report1_B_A1 - (report1.doc2_E_B1 + report1.doc2_E_B2)
```

**Expected Result**: `1000 - (300 + 200) = 500`

## Console Logging for Debugging

When formulas are evaluated, the following will be logged to browser console:

```
Resolved report1_B_A1 to: 1000 (type: number)
Resolved report1.doc2_E_B1 to: 300 (type: number)
Resolved report1.doc2_E_B2 to: 200 (type: number)
Formula result: 500 Expression: report1_B_A1 - (report1.doc2_E_B1 + report1.doc2_E_B2) Refvalue: 1000-(300+200)
```

### What Each Log Means
1. **"Resolved [cellRef] to: [value]"** - Cell reference was successfully found and its value extracted
2. **"Formula result: [value]"** - The JavaScript expression was evaluated successfully
3. **"Refvalue: [formula with values]"** - Shows the formula with all cell references replaced by their values (useful for auditing)

## Common Issues & Solutions

### Issue: Formula returns NaN
**Cause**: Referenced cell contains non-numeric data or cell reference not found

**Solution**:
- Check browser console for warning messages
- Verify the cell reference format is correct: `report{id}.doc{id}_{abbr}_{column}{row}`
- Ensure the cell contains a number or numeric string

### Issue: Cross-Document Reference Shows as Undefined
**Cause**: Document context not built properly

**Solution**:
- Check that the document ID is correct in the cell reference
- Verify the uploaded document shows up in the "Uploaded Files" list
- Make sure the cell location (column + row) exists in the referenced document

### Issue: Formula Shows as Null
**Cause**: Error during evaluation or missing cell values

**Solution**:
- Check browser console for error messages
- Verify all referenced cells have values
- Try a simpler formula first to isolate the issue

## Stored Formula Structure

When a formula is saved, it's stored as:

```json
{
  "report1_B_A2": {
    "value": 200,
    "formula": "report1.doc2_M_B2 * report1_S_A1",
    "refvalue": "2*100"
  }
}
```

- **value**: The calculated result
- **formula**: The original formula (for editing/display)
- **refvalue**: The formula with cell references replaced by actual values (for transparency)

## Troubleshooting Steps

1. **Open Browser DevTools** (F12 or Ctrl+Shift+I)
2. **Go to Console tab**
3. **Look for logs** starting with "Resolved" or "Formula result"
4. **Check for warnings/errors** about cell references
5. **Verify cell reference format** matches the pattern shown in logs

## Cell Reference Pattern Guide

### Valid Formats
- Same document: `report1_S_A1` (report ID 1, abbreviation S, column A, row 1)
- Cross-document: `report1.doc2_S_A1` (report ID 1, document ID 2, abbreviation S, column A, row 1)
- Multi-column: `report1.doc3_E_AA15` (column AA, row 15)

### Invalid Formats (Won't Work)
- `doc2_S_A1` (missing report ID)
- `report1_S_A` (missing row number)
- `report1.S_S_A1` (dot should only be between report and doc ID)
- `REPORT1_S_A1` (uppercase REPORT - must be lowercase)

## Performance Notes

- Formulas are evaluated when the cell is set and when the document is saved
- For documents with many formulas, there might be a slight delay as all are evaluated
- Cross-document references require building a context from all uploaded documents
- Performance should be acceptable for typical use cases (< 1000 cells with formulas)

## Integration Points

### ReportViewPage.tsx
- Main location where formulas are created and evaluated
- Supports both same-document and cross-document references
- Stores formulas with value and refvalue for transparency

### FillFormPage.tsx
- Uses cross-document references in computed fields
- Can reference cells when filling forms (if formulas context is provided)

### BuildFormPage.tsx
- Computed question formulas can reference cells
- Example: `age(dob) + report1_HR_E5`

## Advanced Examples

### Percentage Calculation
```javascript
(report1.doc2_A_B2 / report1_D_C5) * 100
```

### Conditional Result
```javascript
report1_D_A1 > 100 ? report1.doc2_S_B5 * 1.1 : report1.doc2_S_B5 * 0.9
```

### Complex Multi-Step
```javascript
const subtotal = report1_I_A1 + report1.doc2_E_B3;
const tax = subtotal * 0.1;
return subtotal + tax;
```
