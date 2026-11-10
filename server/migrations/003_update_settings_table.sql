-- Migration: Add business_id to settings table for multi-tenant support
-- This migration updates the settings table to support per-business settings

-- Add business_id column if it doesn't exist
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS business_id INTEGER DEFAULT NULL;

-- Drop old primary key if it exists (old schema had key as PK)
ALTER TABLE IF EXISTS settings DROP CONSTRAINT IF EXISTS settings_pkey;

-- Add new composite primary key with business_id
ALTER TABLE IF EXISTS settings ADD PRIMARY KEY (key, business_id);

-- Create index for faster lookups by business_id
CREATE INDEX IF NOT EXISTS idx_settings_business_id ON settings(business_id);



