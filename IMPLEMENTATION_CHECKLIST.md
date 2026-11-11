# Implementation Checklist - Single Table Prefix Strategy

## ✅ Code Changes Completed

- [x] Fixed `server/tablePrefix.js` to apply `TABLE_PREFIX` from `.env`
- [x] Created Migration 004: Consolidate data to prefixed tables
- [x] Created Migration 005: Drop all non-prefixed tables
- [x] Renamed `useMockData.ts` → `useData.ts` (33 files updated)
- [x] Updated `server/index.js` comments and documentation
- [x] Updated `.env.example` with `TABLE_PREFIX` setting
- [x] Created comprehensive guides:
  - [x] TABLE_PREFIX_CONSOLIDATION.md
  - [x] SINGLE_TABLE_PREFIX_GUIDE.md

## 🚀 Next Steps to Execute

### Step 1: Restart Backend Server
```bash
# Kill current backend process
# Then restart:
npm run dev
# Or
npm start
```

**What happens**:
- Migrations 004 and 005 run automatically
- Data copied from `activities` → `dqatb_activities`
- All non-prefixed tables dropped
- Only `dqatb_*` tables remain

### Step 2: Verify Database Migration
Run these SQL queries:

```sql
-- Check total tables
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Check prefixed tables (should equal total)
SELECT COUNT(*) as dqatb_tables FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
AND table_name LIKE 'dqatb_%';

-- Check for non-prefixed tables (should be 0)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
AND table_name NOT LIKE 'dqatb_%' AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;
```

**Expected Result**:
```
total_tables = ~36
dqatb_tables = ~36
(No non-prefixed tables found)
```

### Step 3: Test Application
1. Open browser: `http://172.16.12.39:9090`
2. Login: `admin@demo.com` / `DemoAdmin123!`
3. Navigate: Super Admin → Organizations
4. **Verify**: Organizations appear ONCE (no duplicates)
5. Test: Create/edit/delete an organization

### Step 4: Verify Server Logs
Check backend server console for:
```
[migrations] Running migration: 004_consolidate_table_prefix.sql
[migrations] Running migration: 005_drop_all_non_prefixed_tables.sql
SUCCESS: All tables are properly prefixed with dqatb_
```

## 📋 Verification Checklist

After completing all steps:

- [ ] Server restarted successfully
- [ ] No errors in server logs
- [ ] Database migration messages visible
- [ ] SQL verification queries show only `dqatb_*` tables
- [ ] Can log in as admin
- [ ] Super Admin → Organizations shows businesses ONCE
- [ ] No "duplicate" data visible
- [ ] Can create new organization
- [ ] Can edit existing organization
- [ ] Can delete organization
- [ ] All CRUD operations work normally

## 🎯 Expected Behavior After Implementation

### Frontend (useData hook)
```javascript
const { activities } = useData();
// Fetches from API → /api/activities
// Backend queries dqatb_activities table
// Returns data only once (no duplicates)
```

### Backend (All Queries)
```javascript
SELECT * FROM dqatb_users;       // Always prefixed
SELECT * FROM dqatb_activities;  // Always prefixed
// Non-prefixed tables no longer exist
```

### Database
```
Only these tables exist:
✅ dqatb_users
✅ dqatb_activities
✅ dqatb_programs
... (all with dqatb_ prefix)

These tables are GONE:
❌ users
❌ activities
❌ programs
... (all non-prefixed versions deleted)
```

## 🚨 Troubleshooting

### Issue: Still seeing duplicate data
**Solution**: 
1. Verify migrations ran (check logs)
2. Check database has only `dqatb_*` tables
3. Restart frontend (clear browser cache)
4. Refresh page: `Ctrl+Shift+Delete` then reload

### Issue: Login fails with 401 error
**Solution**:
1. Verify `.env` has correct API URLs
2. Check backend is running on port 3000
3. Verify `VITE_API_URL=http://172.16.12.39:3000/api`

### Issue: Migration didn't run
**Solution**:
1. Check server logs for migration messages
2. Verify migrations directory exists
3. Manually run: `psql -d dqaidb -f server/migrations/004_consolidate_table_prefix.sql`

### Issue: Migration fails with permission error
**Solution**:
1. Check PostgreSQL user has DROP TABLE permission
2. User should be owner of tables
3. Verify DB connection credentials in `.env`

## 📝 Configuration Reference

### .env File - Required Settings
```env
# MUST be set before first run
TABLE_PREFIX=dqatb_

# API URLs (for network IP access)
VITE_API_URL=http://172.16.12.39:3000/api
VITE_AUTH_URL=http://172.16.12.39:3000/auth

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dqaidb
DB_USER=postgres
DB_PASSWORD=admin
```

## ✨ Benefits After Implementation

✅ **No More Duplicates**: Each table exists only once
✅ **Single Source of Truth**: One set of data to manage
✅ **No Mock Data**: All data from PostgreSQL backend
✅ **Consistent Naming**: All tables follow `dqatb_` prefix
✅ **Clean Database**: No confusion about which tables to use
✅ **Scalable**: Same strategy works for multi-tenancy

## 📚 Documentation Files

- `TABLE_PREFIX_CONSOLIDATION.md` - Original consolidation doc
- `SINGLE_TABLE_PREFIX_GUIDE.md` - Comprehensive implementation guide
- `IMPLEMENTATION_CHECKLIST.md` - This file

---

**Time to Complete**: 15-30 minutes
**Risk Level**: ⚠️ Medium (data migration involved, but safe)
**Rollback**: Not recommended (old tables deleted)
**Backups**: Recommended before starting

**Ready to proceed? Start with Step 1: Restart Backend Server** 🚀
