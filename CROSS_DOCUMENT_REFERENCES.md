# Cross-Document Cell References Guide

This guide explains how to reference cells from different uploaded documents in formulas within computed fields and showIf conditions.

## Overview

You can now reference cells from multiple uploaded documents in your formulas. This enables advanced calculations that combine data from different Excel files uploaded to a report.

## Cell Reference Formats

### Single Document (Same Report)
When referencing a cell from the same uploaded document in a report:
```
report1_H_H1
```
Format: `report{reportId}_{abbreviation}_{column}{row}`

- **reportId**: The report ID
- **abbreviation**: First letters of each word in filename (e.g., "Holiday_Hours" → "HH")
- **column**: Letter(s) for the column (A, B, ..., Z, AA, AB, etc.)
- **row**: Row number (1-based)

### Multiple Documents (Cross-Document)
When referencing a cell from a different uploaded document:
```
report1.doc2_H_H1
```
Format: `report{reportId}.{docId}_{abbreviation}_{column}{row}`

- **reportId**: The current report ID
- **docId**: The ID of the uploaded document you want to reference
- **abbreviation**: First letters of each word in the referenced document's filename
- **column**: Column letter(s)
- **row**: Row number

## Examples

### Example 1: Sum from Two Documents
You have two Excel files uploaded:
- Document 1: "Sales Data.xlsx" with total in cell A5 (value: 1000)
- Document 2: "Expenses.xlsx" with total in cell B3 (value: 200)

Formula to calculate net profit:
```javascript
report1_SD_A5 - report1.doc2_E_B3
// Result: 1000 - 200 = 800
```

### Example 2: Calculate Percentage from Different Documents
- Document 1: "Target Metrics.xlsx" with target value in A1 (5000)
- Document 2: "Actual Results.xlsx" with actual value in B2 (4500)

Formula to calculate percentage achieved:
```javascript
(report1.doc2_AR_B2 / report1_TM_A1) * 100
// Result: (4500 / 5000) * 100 = 90%
```

### Example 3: Complex Multi-Document Calculation
```javascript
(report1_D_C5 * report1.doc2_E_A2) + (report1.doc3_F_B4 / 2)
```

### Example 4: Conditional Logic with Cross-Document References
In a showIf condition:
```javascript
report1_S_A1 > 100 && report1.doc2_E_C3 < 50
```

## Using in Forms

### Computed Fields
In BuildFormPage, when creating a COMPUTED question:

1. Set the **Answer Type** to "COMPUTED"
2. Enter your formula in the **Computed Formula** textarea
3. You can reference:
   - Other form field names: `field_name`
   - Cells from uploaded documents: `report1_H_H1` or `report1.doc2_H_H1`
   - Date helpers: `age(dob)`, `diffDays(date1, date2)`, `parseDate(dateStr)`

Example:
```javascript
age(dob) + report1_HR_E5 + report1.doc2_SAL_C2
```

### Conditional Display (showIf)
When adding options to a dropdown/radio/checkbox, use showIf to conditionally display options:

```javascript
report1_D_A1 === 'Active' && report1.doc2_S_B5 > 100
```

## How It Works

1. **Cell Resolution**: When a formula is evaluated, each cell reference is resolved to its actual value from the uploaded document's data
2. **Value Substitution**: The formula parser replaces cell references with their values
3. **Calculation**: The resulting expression is evaluated using JavaScript
4. **Error Handling**: If a cell reference cannot be resolved, it returns `null` and the formula result will be `null`

## Building Formulas Context

For internal use, you can build a formulas context to enable cross-document references programmatically:

```typescript
import { buildFormulasContext, evaluateFormulaWithContext } from '../utils/formulaEvaluator';

// Assuming you have multiple uploaded documents
const documents = [
  { id: 1, filename: 'Sales.xlsx', file_content: [...], formulas: {...} },
  { id: 2, filename: 'Expenses.xlsx', file_content: [...], formulas: {...} }
];

// Build the context with report ID 1
const context = buildFormulasContext(documents, 1);

// Evaluate a formula
const { value, refvalue } = evaluateFormulaWithContext(
  'report1_S_A1 + report1.2_E_B3',
  context
);

console.log('Calculated Value:', value);      // 1000 + 200 = 1200
console.log('Reference Value:', refvalue);   // "1000+200"
```

## Common Patterns

### Sum Multiple Documents
```javascript
report1_D_A1 + report1.doc2_E_B2 + report1.doc3_F_C3
```

### Weighted Average
```javascript
(report1_W_A1 * 0.5) + (report1.doc2_E_B2 * 0.3) + (report1.doc3_F_C3 * 0.2)
```

### Conditional Aggregation
```javascript
report1_D_A1 > 100 ? report1.doc2_E_B2 * 1.1 : report1.doc2_E_B2 * 0.9
```

### Validation Against Target
```javascript
Math.abs(report1_D_A1 - report1.doc2_T_C5) <= 50
```

## Troubleshooting

### Formula Returns NaN
- Check that all cell references exist and contain numeric values
- Verify the cell locations and document IDs are correct
- Use console to see which cell values are being resolved

### Cell Reference Not Resolved
- Ensure the document ID exists: `report{reportId}.{docId}`
- Check the column letter and row number
- Verify the document has been uploaded to the report

### Formula Syntax Errors
- Remember JavaScript syntax rules
- Use proper operator precedence: `*` and `/` before `+` and `-`
- Test expressions in browser console first

## API Reference

See [formulaEvaluator.ts](../utils/formulaEvaluator.ts) for:
- `buildFormulasContext()` - Create a context from multiple documents
- `evaluateFormulaWithContext()` - Evaluate a formula against a context
- `evaluateFormulasForForm()` - Evaluate formulas in form context
- `resolveCellReferenceFromContext()` - Resolve individual cell references
