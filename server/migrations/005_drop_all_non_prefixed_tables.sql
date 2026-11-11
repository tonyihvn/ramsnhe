-- Migration: Drop all non-prefixed tables
-- This ensures only TABLE_PREFIX (dqatb_) tables are used
-- Run this AFTER 004_consolidate_table_prefix.sql

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Get all non-prefixed tables that we care about
  FOR r IN
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'dqatb_%'
    AND table_name NOT LIKE 'dqai_%'
    AND table_name NOT LIKE 'pg_%'
    ORDER BY table_name
  LOOP
    BEGIN
      EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
      RAISE NOTICE 'Dropped table: %', r.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to drop table %: %', r.table_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'All non-prefixed tables have been removed';
  RAISE NOTICE 'Only dqatb_ prefixed tables remain in use';
END $$;

-- Final verification
DO $$
DECLARE
  total_tables INTEGER;
  prefixed_tables INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tables
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO prefixed_tables
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name LIKE 'dqatb_%';

  RAISE NOTICE '=== Table Summary ===';
  RAISE NOTICE 'Total tables: %', total_tables;
  RAISE NOTICE 'dqatb_ prefixed tables: %', prefixed_tables;
  RAISE NOTICE 'Non-prefixed tables: %', (total_tables - prefixed_tables);
  
  IF (total_tables - prefixed_tables) > 0 THEN
    RAISE WARNING 'WARNING: Found non-prefixed tables that were not dropped!';
  ELSE
    RAISE NOTICE 'SUCCESS: All tables are properly prefixed with dqatb_';
  END IF;
END $$;
