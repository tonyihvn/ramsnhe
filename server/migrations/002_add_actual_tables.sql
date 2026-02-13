-- Migration: Add actual_tables and actual_table_rows tables for "Create Actual Table" feature
-- This allows users to convert uploaded Excel/CSV files into persistent database tables

-- Create actual_tables: stores metadata about created tables
CREATE TABLE IF NOT EXISTS actual_tables (
    id SERIAL PRIMARY KEY,
    database_name TEXT NOT NULL UNIQUE, -- Database-friendly name (no spaces, e.g., "sales_report")
    title TEXT NOT NULL, -- Display title for the table
    activity_id INTEGER,
    program_id INTEGER,
    report_id INTEGER,
    business_id INTEGER,
    submitted_by INTEGER,
    schema JSONB, -- Column definitions: { "column_name": { "type": "text|number|date|etc", "required": false }, ... }
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    CONSTRAINT fk_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
    CONSTRAINT fk_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
);

-- Create actual_table_rows: stores the actual data rows for created tables
CREATE TABLE IF NOT EXISTS actual_table_rows (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL,
    row_data JSONB NOT NULL, -- Stores the actual row values as JSON object
    program_id INTEGER,
    activity_id INTEGER,
    report_id INTEGER,
    business_id INTEGER,
    submitted_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_table FOREIGN KEY (table_id) REFERENCES actual_tables(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_actual_tables_activity ON actual_tables(activity_id);
CREATE INDEX IF NOT EXISTS idx_actual_tables_business ON actual_tables(business_id);
CREATE INDEX IF NOT EXISTS idx_actual_table_rows_table ON actual_table_rows(table_id);
CREATE INDEX IF NOT EXISTS idx_actual_table_rows_activity ON actual_table_rows(activity_id);
CREATE INDEX IF NOT EXISTS idx_actual_table_rows_business ON actual_table_rows(business_id);

-- Create a view to combine table metadata with row count information
CREATE OR REPLACE VIEW actual_tables_with_stats AS
SELECT 
    at.id,
    at.database_name,
    at.title,
    at.activity_id,
    at.program_id,
    at.report_id,
    at.business_id,
    at.submitted_by,
    at.schema,
    at.created_at,
    at.updated_at,
    at.created_by,
    COALESCE(COUNT(atr.id), 0) as row_count
FROM actual_tables at
LEFT JOIN actual_table_rows atr ON at.id = atr.table_id
GROUP BY at.id, at.database_name, at.title, at.activity_id, at.program_id, 
         at.report_id, at.business_id, at.submitted_by, at.schema, at.created_at, 
         at.updated_at, at.created_by;
