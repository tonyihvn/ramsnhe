-- Add cell_formulas column to uploaded_docs table
ALTER TABLE IF EXISTS dqai_uploaded_docs 
ADD COLUMN IF NOT EXISTS cell_formulas JSONB DEFAULT NULL;

-- For other database prefixes
ALTER TABLE IF EXISTS uploaded_docs 
ADD COLUMN IF NOT EXISTS cell_formulas JSONB DEFAULT NULL;
