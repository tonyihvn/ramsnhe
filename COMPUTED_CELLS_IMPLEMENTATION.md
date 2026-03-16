# Computed Cells Implementation Summary

## Overview
The system now supports **computed cells** - allowing users to apply formulas to specific existing cells in uploaded Excel files. Unlike computed columns, computed cells update the value of an existing cell while storing the formula for retrieval and re-editing.

## Architecture

### Frontend (ReportViewPage.tsx)
1. **State Management**
   - `cellFormulas`: Record<string, string> - Maps cell references to their formulas
   - `selectedCellForFormula`: string | null - Currently selected cell for editing
   - `formulaInput`: string - Formula being edited

2. **Cell Selection & Formula Loading**
   - Users click on any cell in the editable table
   - Clicking sets `selectedCellForFormula` to the cell reference (e.g., "report1_PL_B6")
   - If a formula exists for that cell, it loads into the formula input field
   - Visual feedback: selected cells show purple border, cells with formulas show blue border

3. **Formula Application Flow**
   ```
   User clicks cell → Cell selected and formula loads
                   → User enters formula (e.g., "report1_PL_A1*2")
                   → Clicks "Set Formula" button
                   → Formula is evaluated (safe evaluation with Function constructor)
                   → Result updates the cell value
                   → Formula stored in cellFormulas object
                   → Marked as edited cell
   ```

4. **Saving Changes**
   - When user clicks "Save Changes", the system sends:
     - `partialUpdate`: Changed cell values
     - `newRows`: Any new rows added
     - `cellFormulas`: All formulas (mapped cellRef → formula)
   - Server persists to database
   - Response includes `formulas` field which reloads state

5. **Loading from Database**
   - When user clicks "Edit" on a document:
     - API returns `formulas` field (transformed from `cell_formulas` column)
     - `cellFormulas` state is populated with existing formulas
     - Users can see and modify existing computed cells

### Backend (server/index.js)

1. **Database Schema**
   - Table: `uploaded_docs`
   - New column: `cell_formulas JSONB` - Stores formula mappings
   - Format: `{"report1_PL_B6": "report1_PL_A1*2", "report1_PL_C5": "SUM(report1_PL_A1:A10)"}`

2. **GET /api/uploaded_docs**
   - Returns list of uploaded documents
   - Transforms `cell_formulas` column to `formulas` field for frontend compatibility
   - Also parses `file_content` JSONB if needed

3. **POST /api/uploaded_docs**
   - Creates new uploaded document
   - Initializes `cell_formulas` as NULL
   - Returns response with `formulas` field (empty object initially)

4. **PUT /api/uploaded_docs/:id**
   - Accepts: `partialUpdate`, `newRows`, `cellFormulas`
   - Loads existing `cell_formulas` from database
   - Merges incoming `cellFormulas` with existing ones
   - Persists both `file_content` and `cell_formulas`
   - Returns updated document with `formulas` field

### Cell Naming Convention
Cells are uniquely identified as: `report{reportId}_{fileAbbreviation}_{columnLetter}{rowNumber}`
- Example: `report1_PL_B6`
  - report ID: 1
  - file abbreviation: PL (from filename like "Production List")
  - column: B
  - row: 6

### Formula Evaluation
- Uses safe evaluation with Function constructor
- Resolves cell references by looking them up in the data
- Supports standard operators: +, -, *, /, %, ^, etc.
- Supports functions: SUM, AVERAGE, MIN, MAX, COUNT, IF, etc.

## Workflow Example

1. **User uploads Excel file** during activity editing
2. **User opens file for editing**
3. **User selects cell B6** (contains value "100")
4. **User enters formula**: `report1_PL_A1*2`
5. **User clicks "Set Formula"**
   - Formula evaluates (let's say A1 contains 50)
   - Cell B6 value updates to 100
   - Formula is stored: `cellFormulas["report1_PL_B6"] = "report1_PL_A1*2"`
   - Cell marked as edited

6. **User clicks "Save Changes"**
   - Request sent with `cellFormulas: {"report1_PL_B6": "report1_PL_A1*2"}`
   - Server persists to database column `cell_formulas`

7. **User edits file again later**
   - Document loaded with `formulas: {"report1_PL_B6": "report1_PL_A1*2"}`
   - `cellFormulas` state populated
   - User clicks cell B6
   - Formula "report1_PL_A1*2" loads into formula input field
   - User can modify or view the formula

## Database Migration
Run migration to add the column:
```sql
ALTER TABLE IF EXISTS dqai_uploaded_docs 
ADD COLUMN IF NOT EXISTS cell_formulas JSONB DEFAULT NULL;

ALTER TABLE IF EXISTS uploaded_docs 
ADD COLUMN IF NOT EXISTS cell_formulas JSONB DEFAULT NULL;
```

Migration file: `server/migrations/001_add_cell_formulas.sql`

## Key Differences from Computed Columns
- **Computed Columns** (old): Created new columns with calculated values
- **Computed Cells** (new): Updates existing cells with formula results while preserving formula for retrieval
- Formulas are first-class data stored separately from cell values
- Formulas can be edited and re-evaluated during subsequent editing sessions
