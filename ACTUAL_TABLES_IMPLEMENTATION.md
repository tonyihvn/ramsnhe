# Actual Tables Feature Implementation

## Overview
This document describes the implementation of the "Create Actual Table" feature, which allows users to convert uploaded Excel/CSV files into persistent database tables with relationship columns and formula/function support.

## Feature Summary

### 1. Create Actual Table Button (ReportViewPage)
- Added a "Create Actual Table" button to each uploaded parsed file in ReportViewPage
- When clicked, user is prompted for:
  - **Table Title**: Display name for the table (e.g., "Sales Report")
  - **Database Name**: Database-friendly name without spaces (e.g., "sales_report")
- Creates an actual_table record with:
  - Extracted schema from file columns (data types: text, number, date, etc.)
  - Relationship columns: program_id, activity_id, report_id, business_id, submitted_by
  - All file rows inserted into actual_table_rows

### 2. Database Schema

#### actual_tables
```sql
id SERIAL PRIMARY KEY
database_name TEXT NOT NULL UNIQUE
title TEXT NOT NULL
activity_id INTEGER (FK to activities)
program_id INTEGER
report_id INTEGER
business_id INTEGER (FK to businesses)
submitted_by INTEGER (FK to users)
schema JSONB -- Column definitions: { "column_name": { "type": "text|number|date", "required": false }, ... }
created_at TIMESTAMP
updated_at TIMESTAMP
created_by INTEGER
```

#### actual_table_rows
```sql
id SERIAL PRIMARY KEY
table_id INTEGER NOT NULL (FK to actual_tables, CASCADE delete)
row_data JSONB -- Actual values stored as JSON object
program_id INTEGER
activity_id INTEGER
report_id INTEGER
business_id INTEGER
submitted_by INTEGER
created_at TIMESTAMP
updated_at TIMESTAMP
```

### 3. API Endpoints

#### POST /api/actual_tables
Create a new actual table from uploaded file content.

**Request Body:**
```json
{
  "title": "Sales Report",
  "databaseName": "sales_report",
  "activityId": 123,
  "programId": 456,
  "reportId": 789,
  "businessId": 1,
  "fileContent": [ { "col1": "val1", "col2": 100 }, ... ]
}
```

**Response:**
```json
{
  "success": true,
  "table": { ...table object with schema }
}
```

#### GET /api/actual_tables
List all actual tables with optional filters.

**Query Parameters:**
- `activityId` - Filter by activity
- `businessId` - Filter by business
- `programId` - Filter by program

**Response:**
```json
[
  {
    "id": 1,
    "database_name": "sales_report",
    "title": "Sales Report",
    "activity_id": 123,
    "schema": { "col1": { "type": "text", "required": false }, ... },
    "row_count": 150,
    "created_at": "2026-02-13T10:00:00Z"
  },
  ...
]
```

#### GET /api/actual_tables/:tableId
Get a specific table with all its rows.

**Response:**
```json
{
  "id": 1,
  "database_name": "sales_report",
  "title": "Sales Report",
  "schema": { ... },
  "rows": [
    { "id": 1, "row_data": { ... }, "created_at": "..." },
    ...
  ]
}
```

#### POST /api/actual_tables/:tableId/rows
Add rows to an existing table.

**Request Body:**
```json
{
  "rows": [
    { "col1": "val1", "col2": 100 },
    ...
  ]
}
```

#### PUT /api/actual_tables/:tableId
Update table metadata (title, schema).

#### DELETE /api/actual_tables/:tableId
Delete a table and all its rows (cascade delete).

### 4. FillFormPage Integration

#### Template Selection
- New section displayed when actual_tables exist for the activity
- Dropdown to select an optional table template
- When a template is selected and user uploads CSV/Excel:
  - All rows from uploaded files are automatically saved to the selected table
  - Existing table rows are preserved
  - Success message shows number of rows added

#### File Upload Flow
1. User selects optional table template (or leaves as "None")
2. User uploads CSV/Excel files (parsed normally)
3. On finalize:
   - If template selected: Save file data to table via `POST /api/actual_tables/:tableId/rows`
   - Continue with normal report submission flow

### 5. ReportViewPage Integration

#### Actual Tables Section
- New "Actual Tables" section displayed at bottom of report view
- Shows all actual_tables linked to the activity
- For each table:
  - Table title and database name displayed
  - Full data grid showing all rows and columns
  - Row count and creation timestamp
  - Delete button (admin only)

#### Formula & Function Support
- Tables displayed can reference uploaded files (existing functionality)
- Each cell supports:
  - Simple formulas: `TableA_A1 + TableB_C3`
  - Cross-document references
  - Complex JavaScript expressions
  - Text/number concatenation
  - Math functions

#### Table Display Features
- Read-only view in main report (formulas not yet editable for tables)
- Full row/column visibility
- Sortable columns (future enhancement)
- Export capability (future enhancement)

## Modified Files

### Server Files
1. **server/tablePrefix.js**
   - Added ACTUAL_TABLES and ACTUAL_TABLE_ROWS table name mappings

2. **server/index.js**
   - Added actual_tables initialization in database setup (lines ~2300-2330)
   - Added 5 new API endpoints for actual tables CRUD operations

3. **server/migrations/002_add_actual_tables.sql**
   - New migration file with complete schema and indexes
   - View for combined table metadata with row counts

### Frontend Files
1. **pages/ReportViewPage.tsx**
   - Added actualTables state
   - Load actual_tables in useEffect
   - Display "Actual Tables" section with table grid
   - Added "Create Actual Table" button to file upload actions
   - Dialog to prompt for table title and database name

2. **pages/FillFormPage.tsx**
   - Added actualTables state
   - Added selectedTableId state
   - Load actual_tables useEffect for the activity
   - Display table template selector in file upload section
   - Save uploaded file data to selected table in handleFinalize

## Implementation Details

### Data Flow: Creating an Actual Table

```
1. User views ReportViewPage
   ↓
2. Loads uploaded_docs with "Create Actual Table" button
   ↓
3. User clicks "Create Actual Table" for a parsed file
   ↓
4. Prompts for title and database name
   ↓
5. Submits POST /api/actual_tables with:
   - file content (all rows)
   - extracted schema (from column types)
   - relationship fields (activity_id, program_id, etc.)
   ↓
6. Server creates actual_tables record
   ↓
7. Server inserts all rows into actual_table_rows
   ↓
8. Returns success with table metadata
   ↓
9. ReportViewPage reloads actual_tables list
```

### Data Flow: Using a Table Template

```
1. User navigates to FillFormPage
   ↓
2. Page loads and fetches actual_tables for activity
   ↓
3. "Select Existing Table" dropdown displayed (if tables exist)
   ↓
4. User selects a table (optional)
   ↓
5. User uploads CSV/Excel files
   ↓
6. On finalize:
   - Creates/updates report as normal
   - If table selected:
     a. Extracts all rows from uploaded files
     b. Calls POST /api/actual_tables/:tableId/rows
     c. Rows saved with relationship fields
   - Continues with file uploads and submission
   ↓
7. Success: "Data successfully submitted!"
   ↓
8. Navigate to /reports
```

### Data Flow: Viewing Tables in Report

```
1. User views ReportViewPage for a report
   ↓
2. Loads uploadedDocs, questions, AND actualTables
   ↓
3. Renders three sections:
   - Questions & Answers
   - Uploaded Files (with "Create Actual Table" button)
   - Actual Tables (read-only grid view)
   ↓
4. User can:
   - View all table data
   - See schema information (column types)
   - Delete tables (if admin)
   - (Future) Use formulas in cells
```

## Key Features

### Column Data Types
When creating actual tables, schema extracts column types:
- `text` - String values
- `number` - Numeric values
- `date` - Date values
- `email` - Email format
- `phone` - Phone format
- `currency` - Currency values

### Relationship Tracking
All rows include:
- `program_id` - Linked program
- `activity_id` - Linked activity
- `report_id` - Linked report
- `business_id` - Linked business/organization
- `submitted_by` - User who created the rows
- `created_at`, `updated_at` - Timestamps

### Data Integrity
- Cascade delete: Deleting a table removes all its rows
- Unique database_name: Prevents duplicate table names
- Schema validation: Column types tracked for future type enforcement

## Future Enhancements

1. **Table Editing in Report View**
   - Make cells editable with formula support
   - Allow adding/removing rows
   - Persist changes back to database

2. **Advanced Queries**
   - Filter/sort table data
   - Search within tables
   - Export to Excel/CSV

3. **Computed Columns**
   - Define formulas at column level
   - Auto-calculate for all rows
   - Reference columns across tables

4. **Table Templates**
   - Define reusable table structures
   - Clone existing tables
   - Share templates across activities

5. **Data Validation**
   - Enforce column types
   - Required field validation
   - Custom validation rules

6. **Performance**
   - Pagination for large tables
   - Lazy loading
   - Database indexes on frequent queries

## Testing Checklist

- [ ] Create actual table from uploaded file
- [ ] Verify database_name uniqueness
- [ ] Verify schema extraction from various data types
- [ ] Select table template in FillFormPage
- [ ] Upload files and save to table
- [ ] View tables in ReportViewPage
- [ ] Delete table (admin only)
- [ ] Cross-activity table isolation
- [ ] Relationship field population
- [ ] Formula references to table cells
- [ ] Multi-user concurrent uploads

## Security Considerations

- **Authentication**: All endpoints require session
- **Authorization**: Delete operations restricted to admins
- **Data Isolation**: Filters by activity_id, business_id ensure multi-tenancy
- **Input Validation**: File content validated before insertion
- **SQL Injection Prevention**: All queries use parameterized statements
