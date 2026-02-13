# Implementation Summary: Cross-Document Cell References

## What Was Implemented

You now have the ability to reference cells from one uploaded document to another, and use those references in:
1. **Computed Cell Formulas** in ReportViewPage (when editing uploaded documents)
2. **Computed Fields** in BuildFormPage (form questions with answer type COMPUTED)
3. **Conditional Display (showIf)** for form options

## Key Components

### 1. Formula Evaluator Utility (`utils/formulaEvaluator.ts`)
New utility module providing:
- `resolveCellReferenceFromContext()` - Resolve individual cell references
- `evaluateFormulaWithContext()` - Evaluate formulas with cross-document support
- `evaluateFormulasForForm()` - Evaluate formulas in form context with field values
- `buildFormulasContext()` - Build context from multiple documents

### 2. Updated Files

**ReportViewPage.tsx:**
- Enhanced `evaluateExpression()` to return both `value` and `refvalue`
- Fixed `resolveCellReference()` to correctly parse cell reference format
- Updated formula guide to show cross-document examples
- Formula storage now includes: `{ value: 136, formula: "report1_H_G1*2", refvalue: "68*2" }`

**FillFormPage.tsx:**
- Added import for new formula evaluator utilities
- Updated `evaluateFormula()` to support cross-document references with optional context

### 3. Documentation (`CROSS_DOCUMENT_REFERENCES.md`)
Complete guide including:
- Cell reference format specification
- Usage examples
- Common patterns
- Troubleshooting tips
- API reference

## Cell Reference Formats

### Same Document (Original)
```
report1_H_H1
```
Format: `report{reportId}_{abbreviation}_{column}{row}`

### Cross-Document (New)
```
report1.doc2_H_H1
```
Format: `report{reportId}.{docId}_{abbreviation}_{column}{row}`

## Usage Examples

### In ReportViewPage (Excel Cells)
Edit an uploaded document and create formulas combining data:
```javascript
// Same document
report1_H_H1 * 2

// Cross-document
(report1_D_A1 * report1.doc2_E_B2) / report1.doc3_F_C3
```

### In BuildFormPage (Form Computed Fields)
Create a COMPUTED question with formula:
```javascript
// Combine form field with cell values
age(dob) + report1_HR_E5 + report1.doc2_SAL_C2
```

### In BuildFormPage (showIf Conditions)
Conditionally display form options:
```javascript
// Show this option only if certain conditions are met
report1_D_A1 > 100 && report1.doc2_S_B5 === 'Active'
```

## How It Works

1. **Formula Input**: User enters a formula with cell references (e.g., `report1_H_H1 + report1.doc2_E_A5`)
2. **Parsing**: Formula parser identifies cell references using regex pattern
3. **Resolution**: Each cell reference is resolved to its actual value from the uploaded document's file_content
4. **Reference Tracking**: A `refvalue` is created showing the formula with substituted values (e.g., `"68+45"`)
5. **Evaluation**: The formula is evaluated as JavaScript to produce the final result
6. **Storage**: Result is saved with both the evaluated `value` and the `refvalue` for transparency

## Data Structure

Formulas are now stored as objects:
```json
{
  "report1_H_G2": {
    "value": 136,
    "formula": "report1_H_G1*2",
    "refvalue": "68*2"
  }
}
```

This ensures:
- **value**: The calculated result
- **formula**: The original formula for editing/transparency
- **refvalue**: Shows what values were used (useful for auditing)

## Testing Recommendations

1. **Test single-document formulas** in ReportViewPage to ensure backward compatibility
2. **Test cross-document references** by uploading multiple files and referencing between them
3. **Test in computed fields** - add COMPUTED question with cross-document cell references
4. **Test showIf conditions** - use cross-document references in conditional option display
5. **Test error handling** - use invalid cell references to ensure graceful fallback

## Future Enhancements

Potential additions:
- Visual cell reference picker for cross-document selection
- Formula validation before saving
- Formula preview showing calculated values
- Support for named ranges across documents
- Integration with computed fields in table repeat rows
