# 🚀 AI Assistant Installation Checklist

## Pre-Installation Requirements

- [ ] Node.js and npm installed
- [ ] PostgreSQL database running
- [ ] Vanna.AI account & API key
- [ ] OpenAI account & API key
- [ ] LLM API key (OpenAI, Claude, etc.)
- [ ] Text editor or IDE open

---

## Step-by-Step Installation

### Step 1: Create Database Tables
```bash
# Option A: Using psql command line
psql -U your_db_user -d your_database_name -f ai-settings-schema.sql

# Option B: Using pgAdmin or your database client
# Copy contents of ai-settings-schema.sql and execute
```

**Verify**: Check that these tables exist:
- [ ] dqai_ai_settings
- [ ] dqai_vanna_queries
- [ ] dqai_vanna_analyses
- [ ] dqai_ai_conversations
- [ ] dqai_vanna_training_sessions

### Step 2: Update Environment Variables

Add to your `.env` file:
```env
# Vanna.AI Configuration
VANNA_API_URL=https://api.vanna.ai
VANNA_API_KEY=sk-your-vanna-key-here

# LanceDB Configuration
LANCEDB_URL=http://localhost:8081
LANCEDB_DATABASE=activities_db

# Embedding Model (OpenAI)
EMBEDDING_API_KEY=sk-your-embedding-key-here
EMBEDDING_MODEL=text-embedding-3-small

# LLM Model (OpenAI)
LLM_API_KEY=sk-your-llm-key-here
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
```

### Step 3: Register Backend Routes

**File**: `server/index.js` (or your main server file)

Add these imports at the top:
```javascript
import aiSettingsRoutes from './ai-settings-routes.js';
import vannaIntegrationRoutes from './vanna-integration-routes.js';
```

Add these route registrations (after Express app initialization):
```javascript
// Register AI settings and Vanna integration routes
app.use('/api', aiSettingsRoutes);
app.use('/api', vannaIntegrationRoutes);
```

**Verify**: Search for this line to confirm routes are registered:
```javascript
app.use('/api/settings', settingsRoutes);
```
Your new routes should be registered nearby.

### Step 4: Verify Frontend Components Are In Place

Check these files exist:
- [ ] `components/AIAssistantDashboard.tsx`
- [ ] `pages/AISettingsPage.tsx`

Check these files are updated:
- [ ] `App.tsx` - Contains `import AISettingsPage` and route
- [ ] `pages/ActivityDashboardPage.tsx` - Uses `AIAssistantDashboard` component
- [ ] `appRoutes.ts` - Contains `/ai-settings` route
- [ ] `server/tablePrefix.js` - Contains new table constants

### Step 5: Start the Application

```bash
# Install dependencies if needed
npm install

# Start development server
npm run dev

# Or production build
npm run build && npm start
```

### Step 6: Access AI Settings Page

1. Navigate to: `http://localhost:5173/#/login` (adjust port as needed)
2. Login with **admin account**
3. Go to: **Settings → AI Settings**
4. Verify the page loads with 6 tabs

**Tabs should be visible**:
- [ ] Vanna DDL Training
- [ ] LanceDB Vector Store
- [ ] VectorDB Settings
- [ ] Embedding Model
- [ ] LLM Model
- [ ] AI Assistant

### Step 7: Configure API Credentials

In the AI Settings page:

**Tab 1: Vanna DDL Training**
- [ ] Enter Vanna API URL
- [ ] Enter Vanna API Key
- [ ] Select Model (GPT-4)
- [ ] Keep "Auto Train DDL" enabled
- [ ] Leave Training Interval at 24 hours
- [ ] Click "Test Vanna Connection" → Should succeed ✅

**Tab 2: LanceDB Vector Store**
- [ ] Enter LanceDB URL
- [ ] Enter Database Name
- [ ] Keep Collection Name as "activities_embeddings"
- [ ] Keep Vector Dimension at 1536
- [ ] Click "Test LanceDB Connection" → Should succeed ✅

**Tab 3: VectorDB Settings**
- [ ] Select "lancedb" as provider
- [ ] Enter Host (localhost if local)
- [ ] Enter Port (8000 default)
- [ ] Leave API Key empty for local deployment

**Tab 4: Embedding Model**
- [ ] Select "openai" as provider
- [ ] Keep Model Name as "text-embedding-3-small"
- [ ] Keep Dimension at 1536
- [ ] Enter OpenAI API Key
- [ ] Click "Test Embedding Connection" → Should succeed ✅

**Tab 5: LLM Model**
- [ ] Select "openai" as provider
- [ ] Set Model to "gpt-4"
- [ ] Keep Temperature at 0.7
- [ ] Keep Max Tokens at 2000
- [ ] Enter OpenAI API Key
- [ ] Click "Test LLM Connection" → Should succeed ✅

**Tab 6: AI Assistant**
- [ ] Check "Enable AI Assistant"
- [ ] Check "Enable Chart Generation"
- [ ] Check "Enable Insights"
- [ ] Set Conversation Context to 5
- [ ] Set Response Tone to "Professional"

### Step 8: Save All Settings

- [ ] Click "Save Settings" button
- [ ] Should see: "✅ Settings saved successfully!"
- [ ] Wait 2-3 seconds for confirmation to disappear

### Step 9: Test AI Assistant in Activity Dashboard

1. Navigate to an **Activity Dashboard**: `Activities → Select an activity`
2. Scroll down to find the **"🤖 AI Assistant"** section
3. **Verify old UI is gone**:
   - [ ] NO "Generated SQL (preview)" section visible
   - [ ] NO "Run SQL (read-only)" button visible
4. **Test new AI Assistant**:
   - [ ] Text input field present
   - [ ] Ask question: "How many responses are there?"
   - [ ] Click "✨ Ask AI" button
   - [ ] Should see "⏳ Processing..."
   - [ ] After ~5-10 seconds, should show:
     - [ ] "💡 AI Analysis" response
     - [ ] Chat history appears

### Step 10: Verify Database Logging

Open your database client and run:

```sql
-- Check settings are saved
SELECT COUNT(*) as settings_count FROM dqai_ai_settings WHERE business_id = 1;

-- Should return: 1

-- Check queries are logged
SELECT COUNT(*) as query_count FROM dqai_vanna_queries WHERE business_id = 1;

-- Should return: >= 1 (after testing AI)

-- Check analyses are logged
SELECT COUNT(*) as analysis_count FROM dqai_vanna_analyses WHERE business_id = 1;

-- Should return: >= 1 (after AI responses)
```

---

## Troubleshooting

### Issue: 404 Not Found on /api-settings
**Solution**: Make sure routes are registered in server/index.js

### Issue: "AI settings not configured" error
**Solution**: Complete Step 7 (Configure API Credentials)

### Issue: Vanna connection fails
**Solution**: 
- [ ] Check Vanna API URL is correct
- [ ] Check Vanna API Key is valid
- [ ] Verify network connectivity
- [ ] Check firewall allows outbound HTTPS

### Issue: LLM connection fails
**Solution**:
- [ ] Check OpenAI API key
- [ ] Verify account has credits
- [ ] Check API key hasn't expired
- [ ] Ensure correct key is copied

### Issue: AI Assistant component not visible
**Solution**:
- [ ] Verify `AIAssistantDashboard.tsx` is in `components/`
- [ ] Check `ActivityDashboardPage.tsx` imports it
- [ ] Clear browser cache
- [ ] Restart development server

### Issue: Settings not saving
**Solution**:
- [ ] Check database connection
- [ ] Verify tables were created
- [ ] Check for JavaScript errors in console
- [ ] Verify admin user role

### Issue: Chart not displaying
**Solution**:
- [ ] Check "Enable Chart Generation" in settings
- [ ] Ensure query returns numeric data
- [ ] Ask question that specifically mentions "chart" or "visualization"
- [ ] Check browser console for errors

---

## Post-Installation Testing

### Test Sequence
1. [ ] Settings page loads without errors
2. [ ] All 6 configuration tabs present
3. [ ] Connections test successfully
4. [ ] Settings save and persist
5. [ ] Activity Dashboard loads AI component
6. [ ] Can type and submit questions
7. [ ] Receive AI responses
8. [ ] Conversation history maintains
9. [ ] Chart visualization works (if requested)
10. [ ] All queries logged to database

### Performance Baseline
- Vanna SQL generation: 3-10 seconds
- LLM analysis: 3-15 seconds
- Total response time: 6-25 seconds

---

## File Manifest

**Components** (Frontend):
- ✅ `components/AIAssistantDashboard.tsx` (9.8 KB)
- ✅ `pages/AISettingsPage.tsx` (23.8 KB)

**Backend Routes** (API):
- ✅ `server/ai-settings-routes.js` (11 KB)
- ✅ `server/vanna-integration-routes.js` (11 KB)

**Database** (Schema):
- ✅ `ai-settings-schema.sql` (5.2 KB)

**Documentation**:
- ✅ `AI_ASSISTANT_SETUP_GUIDE.md` (9.2 KB)
- ✅ `AI_IMPLEMENTATION_SUMMARY.md` (10.2 KB)
- ✅ This file: `AI_INSTALLATION_CHECKLIST.md`

**Modified Files**:
- ✅ `App.tsx` - Added AI Settings route
- ✅ `pages/ActivityDashboardPage.tsx` - Updated AI section
- ✅ `appRoutes.ts` - Added /ai-settings route
- ✅ `server/tablePrefix.js` - Added table constants

---

## Success Indicators ✅

When everything is working:
1. Admin can access `/ai-settings` page
2. All 6 configuration tabs load
3. Connection tests show ✅ Success
4. Settings save without errors
5. Activity Dashboard shows new AI Assistant
6. Old "Run SQL" button is gone
7. AI responses appear within 10 seconds
8. Conversation history visible
9. Database tables populated with logs
10. No JavaScript errors in console

---

## Support Resources

**Quick Links**:
- [ ] Read: `AI_ASSISTANT_SETUP_GUIDE.md` (Detailed guide)
- [ ] Read: `AI_IMPLEMENTATION_SUMMARY.md` (Technical overview)
- [ ] Check: Database schema in `ai-settings-schema.sql`
- [ ] Review: API docs in comments in `vanna-integration-routes.js`

**Database Queries**:
```sql
-- View all settings
SELECT * FROM dqai_ai_settings WHERE business_id = 1;

-- View recent queries
SELECT * FROM dqai_vanna_queries 
WHERE business_id = 1 
ORDER BY created_at DESC 
LIMIT 5;

-- View analyses
SELECT * FROM dqai_vanna_analyses 
WHERE business_id = 1 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## Installation Status

- [ ] **Pre-checks**: All requirements met
- [ ] **Database**: Tables created
- [ ] **Environment**: Variables set
- [ ] **Backend**: Routes registered
- [ ] **Frontend**: Components verified
- [ ] **Configuration**: Settings entered
- [ ] **Testing**: All tests passed
- [ ] **Documentation**: Reviewed

**Installation Date**: _______________
**Completed By**: _______________
**Status**: ⏳ In Progress / ✅ Complete

---

**Next**: Start using AI Assistant and enjoy intelligent data analysis! 🎉
