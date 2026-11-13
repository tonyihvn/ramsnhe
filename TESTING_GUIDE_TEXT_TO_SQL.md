# 🧪 Complete Testing Guide - Vanna.AI & Vercel AI SDK Integration

## Prerequisites

```bash
# 1. Backend running
npm run dev
# → Backend: http://localhost:3000
# → Frontend: http://localhost:9090

# 2. Database migrations applied
npm run migrate
# This creates all training record tables

# 3. Vanna server running (for Vanna tests)
cd vanna_server
./start_vanna.bat  # Windows
bash start_vanna.sh # Unix
# → http://127.0.0.1:5000
```

---

## ✅ PHASE 1: Database & Server Setup

### Test 1.1: Database Connection
```bash
# Navigate to Settings → Database
# Click "Test Connection"
# Expected: "Connection succeeded" ✅
```

### Test 1.2: Verify Migration Tables
```bash
# Open DBMS Browser (Settings → DBMS)
# Look for these tables:
✅ dqatb_vanna_training_records
✅ dqatb_vercel_training_records
✅ dqatb_ai_context_activities
✅ dqatb_database_credentials
✅ dqatb_provider_training_history

# Click each table to verify structure
```

### Test 1.3: Vanna Server Health
```bash
# In browser or curl:
GET http://127.0.0.1:5000/health

# Expected response:
{
  "status": "healthy",
  "vanna": "connected",
  "database_type": "postgres",
  "database": "ramsnhe",
  "host": "localhost",
  "port": 5432,
  "trained_data": {
    "ddl_entries": 0,
    "documentation_entries": 0,
    "training_count": 0
  }
}
✅ Server is running and connected
```

---

## ✅ PHASE 2: Frontend UI & Settings

### Test 2.1: Settings → Database Tab
```
1. Go to Settings → Database
2. Verify you can see:
   ✅ Host field (filled with localhost or your DB host)
   ✅ Port field (5432)
   ✅ Database field (ramsnhe)
   ✅ User field (postgres or your user)
   ✅ Password field
3. Click "Test Connection"
4. Expected: ✅ "Connection succeeded"
5. Click "Save DB Settings"
6. Expected: ✅ "Saved DB settings to .env and settings table"
```

### Test 2.2: Settings → AI Integrations Tab
```
1. Go to Settings → AI Integrations
2. Click "Vanna DDL Training" tab
3. Expected to see:
   ✅ Server URL input field
   ✅ Database Connection String field
   ✅ "Test Vanna Connection" button
   ✅ "Train Vanna on DDL" button
   ✅ Training Records table (currently empty)

4. Click "Vercel AI SDK" tab
5. Expected to see:
   ✅ Provider selector (OpenAI, Anthropic, Cohere, etc)
   ✅ API Key input
   ✅ Model Name input
   ✅ Temperature slider (0-1)
   ✅ Max Tokens input
   ✅ "Test Vercel AI Connection" button
```

### Test 2.3: Text-to-SQL Provider Selector (Settings → App)
```
1. Go to Settings → App tab
2. Scroll down to find "Text-to-SQL Provider"
3. Expected to see:
   ✅ Radio button for "Vanna.AI"
   ✅ Radio button for "Vercel AI SDK"
   ✅ Current selection indicator
   ✅ Link to configure selected provider

4. Click "Vanna.AI" radio button
5. Expected: Selection updates, shows Vanna config link

6. Click "Vercel AI SDK" radio button
7. Expected: Selection updates, shows Vercel config link

8. Click the config link
9. Expected: Jumps to AI Integrations tab with correct provider section
```

---

## ✅ PHASE 3: Vanna Training Records

### Test 3.1: Add Vanna Training Record
```
1. Go to Settings → AI Integrations → Vanna DDL Training
2. Click "➕ Add DDL" button
3. Fill in form:
   - Training Type: Select "DDL (Database Schema)"
   - Title: "Facilities Table"
   - Content: Paste SQL schema (see below)
4. Click "Save Record"
5. Expected: ✅ "Training record created" toast
6. Record appears in table below with:
   ✅ Checkbox (for selection)
   ✅ Title
   ✅ Training type badge
   ✅ Preview of content
   ✅ Created date & user
   ✅ Edit & Delete buttons

Example DDL Content:
```sql
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    location VARCHAR(255),
    beds INTEGER
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES facilities(id),
    name VARCHAR(255),
    status VARCHAR(50)
);
```
```

### Test 3.2: Edit Vanna Training Record
```
1. In Vanna DDL Training section, click "✏️ Edit" on a record
2. Form appears with record data pre-filled
3. Change title to "Facilities and Activities Schema"
4. Click "Update Record"
5. Expected: ✅ "Training record updated" toast
6. Changes are saved and visible in table
```

### Test 3.3: Delete Vanna Training Record
```
1. Click "🗑️ Delete" on a record
2. Expected: ✅ "Training record deleted" toast
3. Record no longer appears in table
```

### Test 3.4: Retraining Trigger
```
1. In Vanna DDL Training section:
   - Create 2-3 training records
   - Check the checkboxes for multiple records
2. Expected: "🔄 Retrain (X selected)" button appears
3. Click the Retrain button
4. Expected: ✅ "Retraining initiated with X records"
5. Training history is updated
```

---

## ✅ PHASE 4: Vercel Training Records

### Test 4.1: Add Vercel Training Record
```
1. Go to Settings → AI Integrations → Vercel AI SDK
2. Scroll down to find "➕ Add Context" button
3. Fill in form:
   - Training Type: Select "Prompt Context"
   - Title: "Healthcare Analytics Context"
   - Content: Paste system prompt
4. Click "Save Record"
5. Expected: ✅ "Training record created" toast
6. Record appears in table below

Example Content:
"You are a healthcare data analyst..."
```

### Test 4.2: Edit & Delete Vercel Records
```
Same as Vanna (Test 3.2 & 3.3)
```

---

## ✅ PHASE 5: AI Context Activities (Learning Data)

### Test 5.1: Add AI Context Activity
```
1. Go to Settings → AI Integrations → (Scroll to bottom or find AI Context tab)
2. Look for AI Context Activities section
3. Click "➕ Add Activity" button
4. Fill in form:
   - Activity Type: "Question & Response"
   - Question: "How many facilities are in Lagos?"
   - Response: "SELECT COUNT(*) FROM facilities WHERE location = 'Lagos';"
   - Feedback Score: 5
   - Context Tags: "facilities, location"
5. Click "Save Activity"
6. Expected: ✅ "Activity added" toast
7. Activity appears in list with:
   ✅ Q & A content
   ✅ Star rating (⭐ 5/5)
   ✅ Activity type badge
   ✅ Context tags (#facilities #location)
   ✅ Creator and timestamp
   ✅ Edit & Delete buttons
```

### Test 5.2: Add Multiple Default Activities
```
Add these 5 sample activities:

1. Q: "Show top 5 facilities by bed count"
   A: "SELECT name, beds FROM facilities ORDER BY beds DESC LIMIT 5;"
   Tags: facilities, beds, ranking
   Score: 5

2. Q: "How many activities completed this month?"
   A: "SELECT COUNT(*) FROM activities WHERE status='completed' AND created_at >= NOW() - INTERVAL '1 month';"
   Tags: activities, monthly, completed
   Score: 5

3. Q: "Which facilities are in Lagos region?"
   A: "SELECT * FROM facilities WHERE region='Lagos';"
   Tags: facilities, location, filtering
   Score: 5

4. Q: "What is the success rate of activities?"
   A: "SELECT ROUND((COUNT(CASE WHEN status='completed' THEN 1 END)::float / COUNT(*) * 100), 2) as success_rate FROM activities;"
   Tags: activities, metrics, success
   Score: 5

5. Q: "Show activity trends over time"
   A: "SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) FROM activities GROUP BY DATE_TRUNC('month', created_at);"
   Tags: activities, trends, time-series
   Score: 5

Expected: All 5 activities appear in the list with badges and tags
```

### Test 5.3: Edit AI Context Activity
```
1. Click "✏️ Edit" on an activity
2. Change feedback score to 4
3. Update tags to "facilities, beds, analysis"
4. Click "Update Activity"
5. Expected: ✅ "Activity updated" toast
6. Changes are reflected in list
```

### Test 5.4: Delete AI Context Activity
```
1. Click "🗑️ Delete" on an activity
2. Expected: ✅ "Activity deleted" toast
3. Activity removed from list
```

---

## ✅ PHASE 6: Auto-Database Connection

### Test 6.1: Vanna Auto-Connection
```
1. In Vanna DDL Training section:
2. Click "Test Vanna Connection"
3. Backend should:
   ✅ Read database credentials from Settings → Database
   ✅ Pass them to Vanna server
   ✅ Vanna connects to your database
4. Expected: ✅ "Connection successful"

Verify in Vanna server logs:
"🔌 Vanna initialized with database: ramsnhe@localhost"
```

### Test 6.2: Backend Routes Work
```bash
# Test backend training records API
curl http://localhost:3000/api/training-records/vanna \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: YOUR_SESSION_COOKIE"

# Expected: JSON array of Vanna training records
[
  {
    "id": 1,
    "business_id": 1,
    "training_type": "DDL",
    "title": "Facilities Table",
    ...
  }
]

# Test Vercel records API
curl http://localhost:3000/api/training-records/vercel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: YOUR_SESSION_COOKIE"

# Expected: JSON array of Vercel training records

# Test AI Context activities API
curl http://localhost:3000/api/training-records/ai-context \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: YOUR_SESSION_COOKIE"

# Expected: JSON array of AI Context activities
```

---

## ✅ PHASE 7: Provider Switching

### Test 7.1: Switch Between Providers
```
1. Settings → App
2. Select "Vanna.AI" as provider
3. Click Save
4. Go to AI Integrations → Vanna DDL Training
5. Verify Vanna section is active

6. Go back to Settings → App
7. Select "Vercel AI SDK" as provider
8. Click Save
9. Go to AI Integrations → Vercel AI SDK
10. Verify Vercel section is active

Expected: ✅ Provider switching works smoothly
          ✅ Configuration persists across sessions
```

### Test 7.2: Provider Auto-Connection
```
1. Set Vanna.AI as provider
2. Configure Vanna server URL: http://127.0.0.1:5000
3. Click "Test Vanna Connection"
4. Server logs should show connection attempt

5. Set Vercel AI SDK as provider
6. Enter OpenAI API key
7. Click "Test Vercel AI Connection"
8. Should show connection status (need to test with real API key)
```

---

## ✅ PHASE 8: End-to-End Workflow

### Complete Workflow Test
```
SETUP:
1. ✅ Start backend server
2. ✅ Start Vanna server
3. ✅ Run database migrations
4. ✅ Set provider to "Vanna.AI"

ADD TRAINING DATA:
5. ✅ Create DDL training record
6. ✅ Create Documentation training record
7. ✅ Add 5+ AI Context activities
8. ✅ Test Vanna connection

RETRAIN:
9. ✅ Select all training records
10. ✅ Click Retrain button
11. ✅ Verify retraining was triggered

VERIFY DATA PERSISTENCE:
12. ✅ Refresh page
13. ✅ All training records still visible
14. ✅ All AI Context activities still there
15. ✅ Provider setting still Vanna.AI

SWITCH PROVIDERS:
16. ✅ Change to Vercel AI SDK
17. ✅ Add Vercel training records
18. ✅ Switch back to Vanna.AI
19. ✅ Vanna records still there
```

---

## 🐛 Troubleshooting

### Issue: "Connection Failed - Failed to connect to Vanna server"
```
Solution:
1. Check Vanna server is running: http://127.0.0.1:5000/health
2. Verify port 5000 is not in use
3. Check backend logs for connection errors
4. Verify database credentials are correct in Settings
```

### Issue: Training Records Not Saving
```
Solution:
1. Check database connection: Settings → Database → Test Connection
2. Verify migration ran: Settings → DBMS, look for training tables
3. Check backend logs for SQL errors
4. Verify business_id is set correctly
```

### Issue: AI Context Activities Not Showing
```
Solution:
1. Refresh the page
2. Check browser console for errors
3. Verify businessId matches in database
4. Check backend /api/training-records/ai-context endpoint
```

### Issue: Retraining Not Working
```
Solution:
1. Select at least one record before retraining
2. Check backend logs for retrain endpoint
3. Verify Vanna server is running
4. Check training history in database
```

---

## ✅ Final Verification Checklist

- [ ] Database tables created (7 new tables)
- [ ] Settings → Database works with test connection
- [ ] Settings → App shows Text-to-SQL provider selector
- [ ] Settings → AI Integrations shows both Vanna and Vercel tabs
- [ ] Can create Vanna training records
- [ ] Can create Vercel training records
- [ ] Can create AI Context activities
- [ ] Can edit all types of records
- [ ] Can delete all types of records
- [ ] Retraining trigger works
- [ ] Provider auto-connection works
- [ ] Database credentials auto-loaded to Vanna server
- [ ] Data persists across page refreshes
- [ ] Backend API endpoints respond correctly
- [ ] All error messages are user-friendly

---

## 🎉 Success Criteria

✅ All tests pass
✅ Training records CRUD operations work
✅ Retraining can be triggered
✅ AI Context has default learning data
✅ Vanna server auto-connects to database
✅ Provider switching works
✅ Data persistence verified
✅ No console errors
✅ No database errors

---

## 📊 Deployment Readiness

After all tests pass:

- [ ] Backup database
- [ ] Run migrations on production
- [ ] Test with real LLM API keys
- [ ] Verify Vanna training works with real queries
- [ ] Set up monitoring for training jobs
- [ ] Configure rate limiting
- [ ] Enable encryption for API keys
- [ ] Set up audit logging
- [ ] Document provider-specific settings
- [ ] Train admin users on system

---

**Last Updated**: 2026-11-13
**Status**: Ready for Testing 🚀
