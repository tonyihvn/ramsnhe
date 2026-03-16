# Cell Reference Examples & Usage Guide

## Quick Reference Examples

### Cell Naming Convention
Each cell in an editable Excel table has a unique name following this pattern:

```
report{reportId}_{fileAbbreviation}_{columnLetter}{rowNumber}
```

### Real-World Examples

#### Example 1: Patient Level Data
- **Report ID:** 5
- **File Name:** "Patient Level"
- **File Abbreviation:** PL (first letters: P + L)
- **Cell References:**
  - Column A, Row 1: `report5_PL_A1`
  - Column B, Row 1: `report5_PL_B1`
  - Column A, Row 10: `report5_PL_A10`
  - Column AA, Row 1: `report5_PL_AA1`

#### Example 2: Lab Results
- **Report ID:** 3
- **File Name:** "Lab Results"
- **File Abbreviation:** LR (first letters: L + R)
- **Cell References:**
  - Column C, Row 2: `report3_LR_C2`
  - Column D, Row 5: `report3_LR_D5`

#### Example 3: Monthly Summary
- **Report ID:** 8
- **File Name:** "Monthly Summary"
- **File Abbreviation:** MS (first letters: M + S)
- **Cell References:**
  - Column A, Row 1: `report8_MS_A1`
  - Column E, Row 12: `report8_MS_E12`

## Formula Examples

### Simple Arithmetic
```
# Add two values
report5_PL_A1 + report5_PL_B1

# Multiply a value by 2
report5_PL_C1 * 2

# Calculate average
(report5_PL_A1 + report5_PL_B1) / 2

# Calculate percentage
(report5_PL_A1 / report5_PL_B1) * 100
```

### Conditional Logic
```
# Simple if-then
report5_PL_A1 > 100 ? "High" : "Low"

# Multiple conditions
report5_PL_A1 > 100 && report5_PL_B1 < 50 ? "Alert" : "Normal"

# Complex condition
report5_PL_A1 > 0 ? report5_PL_A1 * report5_PL_B1 : 0
```

### String Operations
```
# Concatenation requires custom handling - use in formulas like:
report5_PL_A1.toString() + " units"

# Comparison
report5_PL_Status === "Active" ? 1 : 0
```

### Using Multiple Files
When you have multiple uploaded Excel files in the same report:

```
# Combine data from two different files
report5_PL_A1 + report5_LR_C2

# Compare values from different files
report5_PL_TotalCost > report5_LR_Threshold ? "Over" : "Under"

# Calculate using data from 3 files
(report5_MS_Revenue - report5_MS_Expense) / report5_PL_Count
```

## Creating Computed Columns - Step by Step

### Scenario 1: Calculate Total Cost
**File:** Patient Level (PL)
**Goal:** Multiply Quantity (Column A) × Price (Column B)

1. Open file in edit mode
2. Scroll to "Add Computed Column" section
3. **Column Name:** `Total Cost`
4. **Formula:** `report5_PL_A1 * report5_PL_B1`
5. Click "Add"
6. Result: New column "Total Cost" appears with calculated values for each row
   - Row 1: A1 value × B1 value
   - Row 2: A2 value × B2 value
   - Row 3: A3 value × B3 value
   - etc.

### Scenario 2: Calculate Status Flag
**File:** Lab Results (LR)
**Goal:** Create column indicating if Result (Column D) is abnormal

1. Open file in edit mode
2. Scroll to "Add Computed Column" section
3. **Column Name:** `Abnormal`
4. **Formula:** `report3_LR_D1 < 50 || report3_LR_D1 > 150 ? "Yes" : "No"`
5. Click "Add"
6. Result: New column "Abnormal" with "Yes" or "No" based on values

### Scenario 3: Multi-File Calculation
**Files:** Patient Level (PL) + Lab Results (LR)
**Goal:** Calculate Ratio between two files

1. Open either file in edit mode
2. Scroll to "Add Computed Column" section
3. **Column Name:** `Lab Ratio`
4. **Formula:** `report5_LR_Result / report5_PL_Value` (assuming similar row structure)
5. Click "Add"
6. Result: New column with calculated ratios

## Using Computed Cells in Form Fields

Once you've created computed columns with unique cell names, you can reference them in form building:

### In Dynamic Field Values
When building a form, you can make field values reference computed cells:
```
Field Type: Text
Default Value: report5_PL_TotalCost
```

### In Field Conditions
Show/hide fields based on computed column values:
```
Show field if: report5_LR_Abnormal === "Yes"
```

### In Dynamic Calculations
Use computed cell values in other calculations within the form:
```
Formula Field: (report5_PL_Quantity * report5_MS_UnitPrice) + report5_LR_Tax
```

## Common Formulas Reference

### Comparing Values
```javascript
report5_PL_A1 === report5_PL_B1 ? "Match" : "Different"
report5_PL_A1 > report5_PL_B1 ? "Greater" : "Less or Equal"
report5_PL_A1 >= 100 ? "Pass" : "Fail"
```

### Math Operations
```javascript
report5_PL_A1 + report5_PL_B1                    // Addition
report5_PL_A1 - report5_PL_B1                    // Subtraction
report5_PL_A1 * report5_PL_B1                    // Multiplication
report5_PL_A1 / report5_PL_B1                    // Division
Math.round(report5_PL_A1 * 100) / 100            // Rounding to 2 decimals
Math.abs(report5_PL_A1)                          // Absolute value
Math.max(report5_PL_A1, report5_PL_B1)           // Maximum
Math.min(report5_PL_A1, report5_PL_B1)           // Minimum
```

### String Operations
```javascript
report5_PL_Name.includes("Test") ? "Found" : "Not Found"
report5_PL_Name.toUpperCase()                    // Convert to uppercase
report5_PL_Name.toLowerCase()                    // Convert to lowercase
report5_PL_Name.length                           // String length
```

### Logical Operations
```javascript
report5_PL_A1 > 50 && report5_PL_B1 < 100 ? "In Range" : "Out of Range"
report5_PL_A1 > 100 || report5_PL_B1 > 100 ? "Alert" : "Normal"
!report5_PL_Approved ? "Pending" : "Approved"
```

### Nested Conditions
```javascript
report5_PL_Score > 90 ? "A" :
report5_PL_Score > 80 ? "B" :
report5_PL_Score > 70 ? "C" :
report5_PL_Score > 60 ? "D" : "F"
```

## Tips & Best Practices

### ✅ Do's
- Use clear, descriptive column names for computed columns
- Test formulas with sample data before finalizing
- Hover over cells to confirm cell reference names
- Use descriptive formula comments in column names
- Keep formulas relatively simple for maintainability

### ❌ Don'ts
- Don't use spaces in cell reference names
- Don't reference cells from files that may be deleted
- Don't create circular references (formula referencing its own column)
- Don't use invalid JavaScript syntax
- Don't expect text concatenation without .toString()

### 🔍 Troubleshooting
1. **Formula returns null:** Check syntax and cell references
2. **Cell reference not found:** Verify file hasn't been deleted
3. **Unexpected calculation:** Check data types (text vs numbers)
4. **Changes not saving:** Ensure "Save Changes" button was clicked

## Integration with Form Building

### Example Workflow
1. Create Excel files with base data
2. Upload to report during form submission
3. Edit files and create computed columns (e.g., "Total Cost", "Status")
4. During form building or editing, reference these computed cells:
   - Show confirmation field only if total exceeds threshold
   - Auto-populate totals in summary section
   - Flag unusual values for review

### Integration Steps
1. Note the computed cell names you created (e.g., `report1_PL_TotalCost`)
2. Go to form building/editing
3. In field properties, use cell references in:
   - Default values
   - Conditions
   - Calculated formulas
4. Save form
5. When form is filled, references resolve to computed values from uploaded files

## Advanced Examples

### Healthcare Report
```
report7_PL_Weight / (report7_PL_Height * report7_PL_Height)  // BMI calculation

report7_LR_RBC < 4.5 || report7_LR_RBC > 5.5 ? "Abnormal" : "Normal"

report7_PL_Symptoms.includes("Fever") ? "Possible Infection" : "No Infection"
```

### Financial Report
```
(report10_Revenue - report10_Expenses) / report10_Revenue * 100  // Profit margin

report10_SalesQ1 + report10_SalesQ2 + report10_SalesQ3 + report10_SalesQ4  // Annual total

report10_Current > report10_Target ? (report10_Current / report10_Target * 100).toFixed(1) + "%" : "Below Target"
```

### Education Report
```
(report8_Exam1 + report8_Exam2 + report8_Exam3) / 3  // Average score

report8_Attendance < 80 ? "Risk" : report8_GPA < 2.0 ? "Concern" : "Good"

Math.round((report8_Score / report8_MaxScore) * 100)  // Percentage score
```
