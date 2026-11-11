# Command Reference - Single Table Prefix Implementation

## 🚀 Quick Commands to Execute

### Start Server
```bash
# Development mode with hot reload
npm run dev

# Or production mode
npm start

# Expected output:
# [migrations] Running migration: 004_consolidate_table_prefix.sql
# [migrations] Running migration: 005_drop_all_non_prefixed_tables.sql
# SUCCESS: All tables are properly prefixed with dqatb_
# Server running on port 3000
```

### Verify Database (PostgreSQL)

#### Check Total Tables
```sql
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema='public' AND table_type='BASE TABLE';
```
Expected: `~36` tables

#### Check Prefixed Tables Only
```sql
SELECT COUNT(*) as dqatb_tables 
FROM information_schema.tables 
WHERE table_schema='public' AND table_type='BASE TABLE' 
AND table_name LIKE 'dqatb_%';
```
Expected: Matches total_tables (36)

#### Check No Non-Prefixed Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public' AND table_type='BASE TABLE' 
AND table_name NOT LIKE 'dqatb_%' AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;
```
Expected: `(0 rows)` - No results

#### List All dqatb_ Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public' AND table_type='BASE TABLE' 
AND table_name LIKE 'dqatb_%'
ORDER BY table_name;
```

#### Check Data Count in Key Tables
```sql
-- Should have data
SELECT COUNT(*) as users_count FROM dqatb_users;
SELECT COUNT(*) as activities_count FROM dqatb_activities;
SELECT COUNT(*) as organizations_count FROM dqatb_businesses;
```

### Test Application

#### Via Browser
```
1. URL: http://172.16.12.39:9090
2. Login: admin@demo.com
3. Password: DemoAdmin123!
4. Navigate: Dashboard → Super Admin → Organizations
5. Verify: Each organization appears ONCE (no duplicates)
```

#### Via cURL
```bash
# Get auth token
curl -X POST http://172.16.12.39:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"DemoAdmin123!"}'

# Check if login works
# Expected: User object with id, role, etc.
```

### View Server Logs

#### Real-time Logs
```bash
# Terminal running 'npm run dev'
# Look for:
tail -f app_output.log

# Search for migration messages
grep -i "migration" app_output.log
grep -i "dqatb_" app_output.log
```

### Git Commands

#### View All Changes Made
```bash
# Show all commits
git log --oneline -15

# Show changes in a specific commit
git show aa81612  # Quick start guide
git show 70f59ba  # Main implementation
git show 99e0839  # Fix TABLE_PREFIX

# Show all files changed
git diff 99e0839~1 HEAD --name-only

# View specific file changes
git show 99e0839:server/tablePrefix.js
```

#### Review Commits
```bash
# See detailed changes
git log -p -5 --reverse

# See file statistics
git log --stat -5

# See by author
git log --author="Copilot" --oneline -10
```

### Database Backup/Restore

#### Backup Database Before Migration
```bash
# Full database backup
pg_dump -U postgres -d dqaidb -F c -b -v -f dqaidb_backup_$(date +%Y%m%d).dump

# OR Quick text backup
pg_dump -U postgres -d dqaidb > dqaidb_backup_$(date +%Y%m%d).sql
```

#### Restore from Backup
```bash
# Restore from dump
pg_restore -U postgres -d dqaidb -v dqaidb_backup_20261111.dump

# OR from SQL file
psql -U postgres -d dqaidb < dqaidb_backup_20261111.sql
```

### Manual Migrations (If Needed)

#### Run Migration 004 Manually
```bash
psql -U postgres -d dqaidb -f server/migrations/004_consolidate_table_prefix.sql
```

#### Run Migration 005 Manually
```bash
psql -U postgres -d dqaidb -f server/migrations/005_drop_all_non_prefixed_tables.sql
```

### Clean Up Commands

#### Remove Migrations From History (NOT RECOMMENDED)
```bash
# Undo last commit (don't push!)
git reset --soft HEAD~1

# Or hard reset (WARNING - destructive)
git reset --hard HEAD~1
```

#### Clear Browser Cache
```bash
# Chrome/Chromium
Ctrl + Shift + Delete  # Open cache clear dialog

# Firefox
Ctrl + Shift + Delete  # Open cache clear dialog

# Or use dev tools
F12 → Application → Clear Site Data
```

#### Restart Application Services
```bash
# Kill all node processes
pkill -f "node"

# Verify killed
ps aux | grep node

# Restart
npm run dev
```

---

## 📋 Troubleshooting Commands

### Check Service Status

#### Is Server Running?
```bash
lsof -i :3000   # Linux/Mac
netstat -ano | findstr :3000  # Windows
# Should show node listening on port 3000
```

#### Is Frontend Running?
```bash
lsof -i :9090   # Linux/Mac
netstat -ano | findstr :9090  # Windows
# Should show dev server listening on port 9090
```

### Check Logs

#### Server Logs
```bash
# From where server started
tail -f app_output.log

# Search for errors
grep -i "error" app_output.log

# Search for migrations
grep -i "migration" app_output.log
grep -i "dqatb_" app_output.log
```

#### Browser Console Errors
```javascript
// Press F12 → Console → Look for red errors
// Common issues:
// - Failed to load resource: 401 Unauthorized
// - Cannot read properties of undefined
// - Table not found errors
```

### Database Diagnostics

#### Check Connection
```bash
psql -U postgres -h localhost -d dqaidb -c "SELECT 1"
# Should return: (1 row) with value 1
```

#### Check Tables Exist
```bash
psql -U postgres -d dqaidb -c "\dt"
# Lists all tables in public schema
```

#### Check Specific Table Structure
```bash
psql -U postgres -d dqaidb -c "\d dqatb_users"
# Shows columns, types, constraints for dqatb_users table
```

#### Check Data Integrity
```bash
psql -U postgres -d dqaidb <<SQL
SELECT 'dqatb_users' as table_name, COUNT(*) as rows FROM dqatb_users
UNION ALL
SELECT 'dqatb_activities', COUNT(*) FROM dqatb_activities
UNION ALL
SELECT 'dqatb_businesses', COUNT(*) FROM dqatb_businesses
ORDER BY table_name;
SQL
```

---

## 🔄 Rollback Procedures

### If Migration Causes Issues

#### Restore from Backup
```bash
# Stop server
npm stop

# Restore database
pg_restore -U postgres -d dqaidb dqaidb_backup_20261111.dump

# Restart server
npm run dev
```

#### Reset Git to Before Migration (NOT RECOMMENDED)
```bash
# Find commit before migration
git log --oneline | head

# Reset to before migration
git reset --hard 99e0839  # Before TABLE_PREFIX fix

# WARNING: This deletes all changes made after that commit!
# Only do this if absolutely necessary
```

---

## 📊 Monitoring Commands

### Real-time Monitoring

#### Monitor Node Process
```bash
# Linux/Mac
top -p $(pgrep -f "node")

# Windows
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Select-Object *
```

#### Monitor Database
```bash
psql -U postgres -d dqaidb -c "SELECT * FROM pg_stat_activity WHERE datname='dqaidb';"
```

#### Monitor Disk Space
```bash
# Check database size
psql -U postgres -d dqaidb -c "SELECT pg_size_pretty(pg_database_size('dqaidb'));"

# Check table sizes
psql -U postgres -d dqaidb -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## 🛠️ Configuration Verification

### Check .env File
```bash
# Linux/Mac
cat .env | grep -E "TABLE_PREFIX|API_URL|AUTH_URL"

# Windows PowerShell
Get-Content .env | Select-String "TABLE_PREFIX|API_URL|AUTH_URL"

# Expected output:
# TABLE_PREFIX=dqatb_
# VITE_API_URL=http://172.16.12.39:3000/api
# VITE_AUTH_URL=http://172.16.12.39:3000/auth
```

### Verify Frontend Variables
```bash
# In browser console (F12):
console.log(import.meta.env.VITE_API_URL)
console.log(import.meta.env.VITE_AUTH_URL)
# Should show absolute URLs, not /api and /auth
```

---

## 📚 Documentation Review Commands

### View All Documentation
```bash
# List all markdown files
find . -name "*.md" -type f | grep -E "(SOLUTION|QUICK|IMPLEMENTATION|SINGLE|TABLE_PREFIX)" | sort

# View specific guide
cat QUICK_START.md
cat SOLUTION_SUMMARY.md
cat IMPLEMENTATION_CHECKLIST.md
```

### Check Git History for Changes
```bash
# Show all commits related to table prefix
git log --all --oneline | grep -i "table\|prefix\|mock"

# Show files changed in main commit
git show --name-status 70f59ba
```

---

## 🎯 Success Validation

### Complete Verification Script
```bash
#!/bin/bash

echo "=== Validating Single Table Prefix Implementation ==="
echo ""

echo "1. Checking server is running..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Server running" || echo "❌ Server not running"

echo ""
echo "2. Checking database tables..."
TOTAL=$(psql -U postgres -d dqaidb -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
PREFIXED=$(psql -U postgres -d dqaidb -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'dqatb_%'")
echo "Total tables: $TOTAL"
echo "Prefixed tables: $PREFIXED"
[ "$TOTAL" = "$PREFIXED" ] && echo "✅ All tables prefixed" || echo "❌ Non-prefixed tables remain"

echo ""
echo "3. Checking data exists..."
USERS=$(psql -U postgres -d dqaidb -t -c "SELECT COUNT(*) FROM dqatb_users")
ACTIVITIES=$(psql -U postgres -d dqaidb -t -c "SELECT COUNT(*) FROM dqatb_activities")
echo "Users: $USERS"
echo "Activities: $ACTIVITIES"

echo ""
echo "✅ Validation complete!"
```

---

## 📞 Getting Help

### Check Specific Documentation
```bash
# For quick overview
QUICK_START.md

# For step-by-step
IMPLEMENTATION_CHECKLIST.md

# For technical details
SINGLE_TABLE_PREFIX_GUIDE.md

# For problem analysis
TABLE_PREFIX_CONSOLIDATION.md
```

### Review Commit History
```bash
# Key commits to review
git show 99e0839  # Initial TABLE_PREFIX fix
git show 70f59ba  # Main implementation
git show aa81612  # Quick start guide
```

---

**All commands are ready to use. Copy and paste as needed!** 🚀
