# Excel File Editing & Computed Columns - Feature Implementation

## Overview
This document describes the comprehensive enhancements made to the ReportViewPage to support advanced Excel file editing, formula-based computed columns, and unique cell referencing.

## Changes Made

### 1. **File Upload During Editing** ✅
**Issue Fixed:** Uploading additional files during editing of submitted activity now saves properly.

**Implementation:**
- Added new `POST /api/uploaded_docs` server endpoint to create new uploaded file entries
- Added file upload UI in the edit mode interface with visual feedback
- Files are automatically parsed from Excel/CSV format and saved to the database
- Users receive success/error notifications

**User Experience:**
- When editing an uploaded Excel file, a new "Upload additional Excel files" section appears
- Users can upload new files without losing their editing progress
- All files are immediately available in the uploaded files list

### 2. **Row Management** ✅
**New Features:** Add and delete rows from Excel files during editing

**Implementation:**
- **Add Row:** Green "+" button in the table header adds a new empty row
- **Delete Row:** Red "×" button at the end of each row removes that row
- New rows are tracked separately (shown with green background) and saved on commit
- Row indices are displayed clearly on the left side of the table

**Database Changes:**
- Updated `PUT /api/uploaded_docs/:id` endpoint to handle `newRows` parameter
- New rows are concatenated to existing data before any partial updates

### 3. **Unique Cell Naming System** ✅
**New Convention:** Each cell has a unique identifier for formula references

**Cell Reference Format:**
```
report{REPORT_ID}_{FILE_ABBR}_{COLUMN_LETTER}{ROW_NUMBER}
```

**Example:**
- Report ID: 1
- File: "Patient Level"
- Cell: Column A, Row 3
- **Reference:** `report1_PL_A3`

**How It Works:**
1. Report ID is taken from the current report
2. File abbreviation: First letter of each word in filename (max 3 chars)
   - "Patient Level" → "PL"
   - "Lab Results" → "LR"
3. Column letters: Excel-style (A, B, C, ..., Z, AA, AB, etc.)
4. Row numbers: Start from 1

**Visual Feedback:**
- Cell references appear in the column header beneath column names
- Hovering over a cell displays its full reference in a tooltip
- Users can copy references for use in formulas

### 4. **Computed Columns with JavaScript Expressions** ✅
**New Capability:** Create calculated columns using cell references in formulas

**Features:**
- Define custom column names
- Use JavaScript expressions with cell references
- Automatic evaluation across all rows
- Support for arithmetic and logical operations

**Formula Syntax:**
```
report1_PL_A1 + report1_PL_B1
report1_LR_C1 * 2
report1_PL_A1 > 100 ? "High" : "Low"
```

**Implementation Details:**
- `generateCellName()` helper creates unique cell identifiers
- `resolveCellReference()` helper parses cell references and retrieves values
- `evaluateExpression()` helper safely evaluates formulas using Function constructor
- Computed columns are saved as regular columns in the file_content

**Usage Example:**
1. Add computed column named "Total"
2. Enter formula: `report1_PL_A1+report1_PL_B1`
3. Click "Add"
4. New column appears with computed values for all rows

### 5. **Data Persistence** ✅
**Save Mechanism:**
- Changed rows are tracked by `editedCells` Set
- New rows are tracked by `editingNewRows` Set
- On save, only changed rows and new rows are sent to server
- Server updates database with `file_content` JSON
- UI updates reflected immediately

**State Management:**
- `editingDocData`: Current table data being edited
- `editedCells`: Set of cell keys that were modified (format: `rowIdx_columnKey`)
- `editingNewRows`: Set of row indices that are new
- `computedColumnInputs`: Temporary UI state for formula input fields

## Files Modified

### Frontend (React/TypeScript)
**File:** `pages/ReportViewPage.tsx`

**New State Variables:**
```typescript
const [editingNewRows, setEditingNewRows] = useState<Set<number>>(new Set());
const [computedColumns, setComputedColumns] = useState<Record<string, any>>({});
const [computedColumnInputs, setComputedColumnInputs] = useState<Record<string, string>>({});
```

**New Helper Functions:**
```typescript
const generateCellName(docId, filename, colIndex, rowIndex): string
const resolveCellReference(cellRef): any
const evaluateExpression(expression): any
```

**UI Enhancements:**
- Cell Reference Guide box at top
- File upload section in edit mode
- Row number column on left
- Add/Delete row buttons
- Cell reference tooltip on hover
- Computed column input section with visual guides

### Backend (Node.js/Express)
**File:** `server/index.js`

**New Endpoint:**
```javascript
POST /api/uploaded_docs
```
- Creates new uploaded file entry
- Accepts: reportId, filename, fileContent (array), activityId, facilityId
- Returns: Created document object with id, created_at, etc.

**Updated Endpoint:**
```javascript
PUT /api/uploaded_docs/:id
```
- Enhanced to support `newRows` parameter
- Concatenates new rows before applying partial updates
- Maintains backward compatibility with existing partialUpdate format

## Testing Checklist

- [x] Upload new Excel file during editing
- [x] Add new rows to existing table
- [x] Delete rows from existing table
- [x] Cell references display correctly in headers and tooltips
- [x] Computed columns evaluate correctly
- [x] Formula references resolve properly
- [x] Changes persist after save
- [x] Multiple files can be edited independently
- [x] Error handling for invalid formulas
- [x] File format validation
- [x] Null/undefined cell value handling

## Usage Instructions for End Users

### Adding a New Excel File During Form Editing
1. Click "Edit" on an uploaded Excel file in the Uploaded Files section
2. Scroll down to "Upload additional Excel files" box
3. Click "Choose file" and select your Excel file
4. File is automatically processed and added to the list

### Editing Table Data
1. Click "Edit" on the file you want to modify
2. Edit cells directly - they'll highlight in blue as you change them
3. To add a row: Click the green "+" button in the header
4. To delete a row: Click the red "×" button at the end of the row
5. Click "Save Changes" to persist your edits

### Creating Computed Columns
1. Scroll to "Add Computed Column" section
2. Enter a name for your new column (e.g., "Total Cost")
3. Enter a formula using cell references:
   - Hover over cells to see their reference names
   - Example: `report1_PL_A1 * report1_PL_B1`
4. Click "Add" button
5. The new column appears in the table with computed values
6. Click "Save Changes" to save the new column

### Using Cell References in Form Building
During form building or form editing, you can reference computed cells:
- Format: `report{ID}_{ABBR}_{COL}{ROW}`
- Example: `report1_PL_Total` for a computed column
- Use in field conditions or dynamic values

## Technical Notes

### Cell Naming Algorithm
```
Column Index to Letter Conversion:
0 → A, 1 → B, ..., 25 → Z, 26 → AA, 27 → AB, ...

Example: Column 26 (AA)
col = 26
colLetter = String.fromCharCode(65 + (26 % 26)) + colLetter  // "A"
col = Math.floor(26 / 26) - 1 = 0
colLetter = String.fromCharCode(65 + (0 % 26)) + colLetter   // "AA"
```

### Formula Evaluation Safety
- Uses `Function` constructor with whitelisted variables only
- No direct `eval()` to prevent code injection
- Cell references must match pattern: `report\d+_[A-Z]{1,3}_[A-Z]+\d+`
- Invalid formulas return `null` with error logging

### Database Schema
The `file_content` column stores JSON array:
```json
[
  {"Column1": "value1", "Column2": "value2", "Total": 100},
  {"Column1": "value3", "Column2": "value4", "Total": 200}
]
```

## Future Enhancements

Potential improvements for future iterations:
1. Formula validation before save
2. Column type definitions (numeric, text, date)
3. Built-in functions (SUM, AVG, COUNT, etc.)
4. Advanced cell reference navigation UI
5. Formula history and suggestions
6. Excel file template support
7. Batch import from multiple sheets
8. Cell comment support

## Error Handling

The implementation includes:
- Try-catch blocks around file parsing
- Validation for row index bounds
- Null/undefined value handling
- User-friendly error messages via swalError
- Success notifications via swalSuccess
- Console logging for debugging

## Compatibility

- Works with .xlsx, .xls, and .csv files
- Tested with ExcelJS library
- Compatible with existing form building system
- Backward compatible with existing uploaded_docs data
