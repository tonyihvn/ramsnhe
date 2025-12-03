-- rename_dqai_to_nherams.sql
-- Idempotent migration script to rename objects that start with `dqai_` to `nherams_` in the public schema.
-- RUN THIS ONCE in the target Postgres database (e.g. using psql). Review and BACKUP your DB first.

BEGIN;

-- 1) Rename tables starting with dqai_ -> nherams_
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'dqai_%'
  LOOP
    RAISE NOTICE 'Renaming table % -> %', r.tablename, replace(r.tablename, 'dqai_', 'nherams_');
    EXECUTE format('ALTER TABLE public.%I RENAME TO %I', r.tablename, replace(r.tablename, 'dqai_', 'nherams_'));
  END LOOP;
END$$;

-- 2) Rename sequences starting with dqai_ -> nherams_
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' AND sequence_name LIKE 'dqai_%'
  LOOP
    RAISE NOTICE 'Renaming sequence % -> %', r.sequence_name, replace(r.sequence_name, 'dqai_', 'nherams_');
    EXECUTE format('ALTER SEQUENCE %I RENAME TO %I', r.sequence_name, replace(r.sequence_name, 'dqai_', 'nherams_'));
  END LOOP;
END$$;

-- 3) Update serial/default nextval expressions that reference dqai_ sequence names
DO $$
DECLARE
  r RECORD;
  new_default text;
BEGIN
  FOR r IN
    SELECT table_name, column_name, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_default LIKE '%dqai_%' AND column_default LIKE 'nextval(%'
  LOOP
    new_default := replace(r.column_default, 'dqai_', 'nherams_');
    RAISE NOTICE 'Altering default for %.%: % -> %', r.table_name, r.column_name, r.column_default, new_default;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %s', r.table_name, r.column_name, new_default);
  END LOOP;
END$$;

-- 4) Optionally rename indexes that start with dqai_ to nherams_ (non-critical)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'dqai_%'
  LOOP
    RAISE NOTICE 'Renaming index % -> %', r.indexname, replace(r.indexname, 'dqai_', 'nherams_');
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.indexname, replace(r.indexname, 'dqai_', 'nherams_'));
  END LOOP;
END$$;

COMMIT;

-- NOTE:
-- 1) This script renames tables, sequences, defaults and indexes in the public schema that start with `dqai_`.
-- 2) Triggers, constraints and foreign keys reference the table OID and will remain intact when tables are renamed.
-- 3) Application code (server SQL strings, migration files, scripts, docs) that hardcodes table names like `dqai_users` must be updated to use the new prefix (or the `TABLE_PREFIX` env var) after running this migration.
-- 4) BACKUP the database before running. Test in a non-production copy first.
-- 5) After running, restart the server so that any runtime caches behave with the new names.

-- Example psql usage (Windows PowerShell):
-- psql -h localhost -U postgres -d your_db_name -f server/rename_dqai_to_nherams.sql

