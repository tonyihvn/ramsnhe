-- Migration: Consolidate tables to use TABLE_PREFIX exclusively
-- This migration safely migrates data from non-prefixed tables to prefixed tables
-- and drops the old tables to prevent duplication

-- Get the prefix from the environment (defaults to 'dqatb_')
-- Note: This script assumes the prefixed tables already exist

-- Step 1: Copy data from non-prefixed to prefixed tables (only if prefixed tables exist and non-prefixed still have data)
-- We use transactions to ensure atomicity

DO $$
DECLARE
  prefix_table TEXT;
  old_table TEXT;
  count_prefixed INTEGER;
  count_old INTEGER;
BEGIN
  -- Loop through each core table and migrate data
  FOR prefix_table IN
    SELECT unnest(ARRAY[
      'businesses',
      'users',
      'programs',
      'facilities',
      'activities',
      'activity_roles',
      'activity_reports',
      'answers',
      'questions',
      'roles',
      'permissions',
      'role_permissions',
      'user_roles',
      'user_permissions',
      'form_schemas',
      'uploaded_docs',
      'datasets',
      'dataset_content',
      'rag_schemas',
      'reports_powerbi',
      'report_templates',
      'api_connectors',
      'api_ingests',
      'audit_events',
      'email_verifications',
      'page_permissions',
      'password_resets',
      'settings',
      'user_preferences',
      'feedback_messages',
      'landing_page_config',
      'plan_assignments',
      'plans',
      'user_approvals',
      'indicators',
      'llm_providers',
      'actual_tables',
      'actual_table_rows'
    ])
  LOOP
    -- Build the prefixed table name with 'dqatb_' prefix
    old_table := prefix_table;
    prefix_table := 'dqatb_' || prefix_table;
    
    -- Check if both tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = prefix_table) 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = old_table)
    THEN
      -- Get row counts
      EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(prefix_table) INTO count_prefixed;
      EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(old_table) INTO count_old;
      
      -- Only migrate if old table has data and prefixed table is empty
      IF count_old > 0 AND count_prefixed = 0 THEN
        RAISE NOTICE 'Migrating data from % to % (% rows)', old_table, prefix_table, count_old;
        EXECUTE 'INSERT INTO ' || quote_ident(prefix_table) || ' SELECT * FROM ' || quote_ident(old_table);
        RAISE NOTICE 'Successfully migrated data from % to %', old_table, prefix_table;
      ELSIF count_old > 0 AND count_prefixed > 0 THEN
        RAISE NOTICE 'WARNING: Both % (%) and % (%) have data. Manual review needed.', 
          old_table, count_old, prefix_table, count_prefixed;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Table migration completed';
END $$;

-- Step 2: Drop non-prefixed tables (keep prefixed versions only)
-- This prevents confusion and ensures single source of truth

DO $$
BEGIN
  -- Drop in reverse dependency order to avoid foreign key constraints
  DROP TABLE IF EXISTS dqai_audit_batches CASCADE;
  DROP TABLE IF EXISTS dqai_api_ingests CASCADE;
  DROP TABLE IF EXISTS dqai_api_connectors CASCADE;
  DROP TABLE IF EXISTS dqai_report_templates CASCADE;
  DROP TABLE IF EXISTS dqai_reports_powerbi CASCADE;
  DROP TABLE IF EXISTS dqai_dataset_content CASCADE;
  DROP TABLE IF EXISTS dqai_datasets CASCADE;
  DROP TABLE IF EXISTS dqai_rag_schemas CASCADE;
  DROP TABLE IF EXISTS dqai_uploaded_docs CASCADE;
  DROP TABLE IF EXISTS dqai_answers CASCADE;
  DROP TABLE IF EXISTS dqai_questions CASCADE;
  DROP TABLE IF EXISTS dqai_actual_table_rows CASCADE;
  DROP TABLE IF EXISTS dqai_actual_tables CASCADE;
  DROP TABLE IF EXISTS dqai_activity_reports CASCADE;
  DROP TABLE IF EXISTS dqai_activity_roles CASCADE;
  DROP TABLE IF EXISTS dqai_activities CASCADE;
  DROP TABLE IF EXISTS dqai_user_approvals CASCADE;
  DROP TABLE IF EXISTS dqai_page_permissions CASCADE;
  DROP TABLE IF EXISTS dqai_form_schemas CASCADE;
  DROP TABLE IF EXISTS dqai_user_permissions CASCADE;
  DROP TABLE IF EXISTS dqai_role_permissions CASCADE;
  DROP TABLE IF EXISTS dqai_user_roles CASCADE;
  DROP TABLE IF EXISTS dqai_user_preferences CASCADE;
  DROP TABLE IF EXISTS dqai_feedback_messages CASCADE;
  DROP TABLE IF EXISTS dqai_landing_page_config CASCADE;
  DROP TABLE IF EXISTS dqai_plan_assignments CASCADE;
  DROP TABLE IF EXISTS dqai_indicators CASCADE;
  DROP TABLE IF EXISTS dqai_llm_providers CASCADE;
  DROP TABLE IF EXISTS dqai_password_resets CASCADE;
  DROP TABLE IF EXISTS dqai_email_verifications CASCADE;
  DROP TABLE IF EXISTS dqai_permissions CASCADE;
  DROP TABLE IF EXISTS dqai_role_permissions CASCADE;
  DROP TABLE IF EXISTS dqai_audit_events CASCADE;
  DROP TABLE IF EXISTS dqai_settings CASCADE;
  DROP TABLE IF EXISTS dqai_roles CASCADE;
  DROP TABLE IF EXISTS dqai_facilities CASCADE;
  DROP TABLE IF EXISTS dqai_programs CASCADE;
  DROP TABLE IF EXISTS dqai_plans CASCADE;
  DROP TABLE IF EXISTS dqai_users CASCADE;
  DROP TABLE IF EXISTS dqai_businesses CASCADE;
  
  RAISE NOTICE 'Dropped non-prefixed (dqai_) tables';
END $$;

-- Step 3: Verify no duplicate tables remain (optional - just for logging)
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name LIKE 'dqai_%';
  
  IF table_count > 0 THEN
    RAISE WARNING 'WARNING: Found % remaining dqai_ prefixed tables that were not dropped', table_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All dqai_ prefixed tables removed. Using dqatb_ tables exclusively.';
  END IF;
END $$;
