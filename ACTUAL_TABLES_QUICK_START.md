# Actual Tables Feature - Quick Start Guide

## Feature Overview
The **Actual Tables** feature allows you to convert uploaded Excel/CSV files into persistent database tables that can be reused across submissions and support formulas like your uploaded files.

## How to Use

### Step 1: Create an Actual Table from an Uploaded File

1. Navigate to **ReportViewPage** for any submitted report
2. Scroll to the **Uploaded Files** section
3. For any parsed Excel/CSV file, click the **"Create Actual Table"** button
4. Enter the **Table Title** (e.g., "Sales Report" or "Employee List")
5. Enter the **Database Name** in database-friendly format:
   - No spaces
   - Use underscores for word separation
   - Example: `sales_report`, `employee_list`, `inventory_data`
6. Click **Confirm**
7. Success! The table is created with all columns and rows from the file

### Step 2: Use Table Templates When Submitting Forms

1. Navigate to **FillFormPage** for an activity
2. Fill in the form questions normally
3. Click **Next: Upload Files**
4. Scroll to the **"Select Existing Table (Optional)"** section
5. If tables were created for this activity, they appear in the dropdown:
   - Table title is shown
   - Current row count is displayed
   - Example: "Sales Report (150 rows)"
6. Select a table OR leave as "None" to skip
7. Upload your CSV/Excel files as normal
8. When you click **"Finalize Submission"**:
   - If a table was selected, all uploaded file rows are automatically added to that table
   - Existing rows in the table are preserved
   - Success message shows how many rows were added

### Step 3: View and Reference Tables in Reports

1. Navigate to **ReportViewPage** for a submitted report
2. Scroll to the bottom to find the **"Actual Tables"** section
3. All created tables for this activity are displayed as data grids:
   - Columns show data type information
   - All rows are visible
   - Row count and creation date shown
4. Tables can be referenced in formulas and calculations:
   - Use cell references: `report1_SalesReport_A1 + report1_Inventory_C5`
   - Combine with uploaded file references
   - Supports all formula features

### Step 4: Manage Tables

**To Delete a Table (Admin Only):**
1. In ReportViewPage, find the table in the "Actual Tables" section
2. Click the **"Delete"** button
3. Confirm deletion in dialog
4. Table and all rows are permanently removed

## Key Benefits

✅ **Persistent Storage** - Tables persist across multiple submissions  
✅ **Template Reuse** - Select the same table for multiple uploads  
✅ **Data Consolidation** - Combine data from multiple submissions into one table  
✅ **Formula Support** - Reference table cells in calculations like uploaded files  
✅ **Relationship Tracking** - Auto-links to activity, program, report, and user  
✅ **Type Safety** - Column types automatically extracted and tracked  

## Column Data Types Supported

When creating tables from files, columns are auto-detected as:
- **Text** - String/text data
- **Number** - Numeric values (integers, decimals)
- **Date** - Date values
- **Email** - Email addresses
- **Phone** - Phone numbers
- **Currency** - Monetary values

## Relationship Fields (Automatic)

Every table row automatically includes:
- **program_id** - Associated program
- **activity_id** - Associated activity
- **report_id** - Associated report
- **business_id** - Associated business/organization
- **submitted_by** - User who created the rows
- **Timestamps** - created_at, updated_at

## Common Workflows

### Workflow 1: Consolidating Monthly Data
1. Create table "monthly_sales" from January data
2. In February form submission, select "monthly_sales" template
3. Upload February data → automatically adds to same table
4. In March, repeat with same template
5. Result: One table with all 3 months of data

### Workflow 2: Cross-Activity Reporting
1. Create table "employee_master" from HR activity
2. Create table "payroll_data" from Finance activity
3. In reports, reference both tables:
   - Formula: `employee_master_B3 + payroll_data_C3`
   - Combines data across activities

### Workflow 3: Templates for Consistent Data
1. Define a "Staff Attendance" table structure
2. Every month, upload attendance in same format
3. Select template and upload
4. Historical attendance data grows monthly
5. Report on trends over time

## Troubleshooting

**Q: "Table not appearing in template list"**
A: Tables must be created for the same activity. Create a table first via "Create Actual Table" button, then it appears as template in FillFormPage.

**Q: "Uploaded data not saved to table"**
A: Make sure to select the table from dropdown before uploading. The table selection is required to save data.

**Q: "Column name has space/special character"**
A: Database name cannot have spaces. Use underscores or hyphens instead. Example: instead of "Sales Report", use "sales_report".

**Q: "Can I edit table data after creation?"**
A: Currently tables are read-only in reports. Add new rows by uploading new files and selecting the table as template.

**Q: "How do I delete a table?"**
A: Admin users only. Go to ReportViewPage, find the table in "Actual Tables" section, click Delete button.

## Formula Examples with Tables

```javascript
// Reference a table cell
report1_sales_A1

// Simple arithmetic
report1_sales_A1 * 1.1

// Reference multiple tables
report1_sales_B3 + report1_inventory_C5

// Conditional logic
report1_sales_A1 > 1000 ? report1_sales_A2 * 0.9 : report1_sales_A2

// Array operations (future)
SUM(report1_sales_A:A)
AVERAGE(report1_inventory_B:B)
```

## Tips & Best Practices

💡 Use descriptive table names (e.g., "quarterly_budget" instead of "data1")  
💡 Ensure consistent column order when uploading multiple files to same table  
💡 Document what each column represents for team reference  
💡 Archive old tables by exporting data before deletion  
💡 Use table templates for recurring data collection  
💡 Test formulas referencing tables before using in production  

## Support

For issues or feature requests:
1. Check the [ACTUAL_TABLES_IMPLEMENTATION.md](./ACTUAL_TABLES_IMPLEMENTATION.md) for technical details
2. Review error messages in browser console (F12)
3. Contact system administrator for access issues
