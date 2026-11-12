# Quick Action Guide

## ✅ IMMEDIATE ACTIONS

### 1. Fix Upload Error (DO NOW)
**Problem:** Console shows ERR_CONNECTION_REFUSED for uploads  
**Solution:** Already fixed in vite.config.ts

**Action Required:**
```bash
# Kill the running Vite dev server
# Then restart it:
npm run dev
```

**Verify:**
1. Open browser to http://localhost:9090
2. Upload a report banner
3. Check console - should have NO errors for /uploads/reports/...
4. Image should display correctly

---

## 🚀 VANNA.AI IMPLEMENTATION (PRIORITY ORDER)

### Phase 1️⃣: Database Setup (Estimated: 2 hours)
**What:** Create 5 new PostgreSQL tables  
**Who:** Database admin  
**Files needed:** VANNA_LANCEDB_IMPLEMENTATION_PLAN.md (lines: Database Schema Extension)

**Steps:**
1. Review SQL schema in implementation plan
2. Run migrations on your PostgreSQL database
3. Verify tables created: 
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name LIKE 'dqatb_%' AND table_name IN (
     'dqatb_prompt_contexts',
     'dqatb_vanna_training_sessions',
     'dqatb_lance_vectors',
     'dqatb_ai_conversations',
     'dqatb_conversation_sessions'
   );
   ```

---

### Phase 2️⃣: Dependencies (Estimated: 30 minutes)
**What:** Install Vanna.AI, LanceDB, and related packages  
**Who:** Backend developer  
**Command:**
```bash
npm install vanna lancedb sentence-transformers ai langchain pg
```

**Update .env:**
```env
VANNA_API_KEY=your_vanna_api_key
VANNA_MODEL=claude3
LANCEDB_CONNECTION_STRING=postgresql://user:pass@localhost:5432/dqaidb
LANCEDB_VECTOR_SIZE=1536
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

---

### Phase 3️⃣: Backend API Routes (Estimated: 4 hours)
**What:** Create API endpoints for Vanna integration  
**Who:** Backend developer  
**File:** server/index.js

**Routes to implement:**
```
POST   /api/admin/prompt-contexts       - Create prompt context
GET    /api/admin/prompt-contexts       - List contexts
GET    /api/admin/prompt-contexts/:id   - Get one context
PUT    /api/admin/prompt-contexts/:id   - Update context
DELETE /api/admin/prompt-contexts/:id   - Delete context

POST   /api/vanna/train                 - Start training session
GET    /api/vanna/train/status/:id      - Check training status
GET    /api/vanna/training-sessions     - List training sessions

POST   /api/vanna/prompt                - Send prompt/query
GET    /api/vanna/conversations/:id     - Get chat history
```

**Key files to create:**
- `server/vanna-integration.js` - Vanna.AI wrapper
- `server/lancedb-service.js` - Vector DB operations
- `server/llm-context.js` - Context assembly logic

---

### Phase 4️⃣: Frontend - Settings Tab (Estimated: 3 hours)
**What:** Add "Prompt Context" tab in Settings page  
**Who:** Frontend developer  
**File:** pages/SettingsPage.tsx

**Components needed:**
- PromptContextList.tsx - List all contexts
- PromptContextForm.tsx - Create/edit context
- TrainingSessionsPanel.tsx - Manage training

**Features:**
- CRUD for prompt contexts
- System prompt editor (multi-line textarea)
- Token limit slider (500-4000)
- Temperature slider (0-1)
- Training session management

---

### Phase 5️⃣: Frontend - Dashboard Chat (Estimated: 5 hours)
**What:** Add chat interface to Activity Dashboard  
**Who:** Frontend developer  
**File:** pages/ActivityDashboard.tsx

**Components needed:**
- ChatPanel.tsx - Message list + input
- ResultsVisualization.tsx - Chart display
- ChartSelector.tsx - Select chart type
- DataExport.tsx - Export results

**Features:**
- Send prompts to backend
- Display AI responses
- Auto-generate charts (6 types)
- Conversation history
- SQL preview
- Data table view

---

### Phase 6️⃣: Integration & Testing (Estimated: 3 hours)
**What:** Test end-to-end workflows  
**Who:** QA team

**Test Cases:**
- [ ] Create prompt context in Settings
- [ ] Train Vanna.AI on database
- [ ] Query activity data via chat
- [ ] Charts auto-generate correctly
- [ ] Conversation continues across reloads
- [ ] LLM provides accurate insights
- [ ] Error handling works
- [ ] Performance is acceptable

---

## 📊 TIMELINE ESTIMATE

| Phase | Time | Complexity | Who |
|-------|------|-----------|-----|
| 0️⃣ Upload Fix | 5 min | Trivial | DevOps |
| 1️⃣ Database | 2 hrs | Low | DBA |
| 2️⃣ Dependencies | 30 min | Low | Backend |
| 3️⃣ Backend API | 4 hrs | Medium | Backend |
| 4️⃣ Settings UI | 3 hrs | Medium | Frontend |
| 5️⃣ Dashboard Chat | 5 hrs | High | Frontend |
| 6️⃣ Testing | 3 hrs | Medium | QA |
| **TOTAL** | **~17.5 hrs** | | **Team** |

**Recommended:** 2-3 days with 1-2 developers working in parallel

---

## 💡 IMPLEMENTATION STRATEGY

### Option A: Sequential (Safer)
1. Complete Phase 1-3 (Backend ready)
2. Complete Phase 4-5 (Frontend)
3. Phase 6 (Test all together)
- **Pro:** Less integration issues
- **Con:** Slower delivery
- **Best for:** Teams with less experience

### Option B: Parallel (Faster)
- Phase 1-2: Database + Dependencies (DBA + Backend)
- Phase 3: Backend API (Backend dev 1)
- Phase 4-5: Frontend UI (Frontend dev)
- Integrate after Phase 3 is done
- **Pro:** Faster delivery
- **Con:** More coordination needed
- **Best for:** Experienced teams

### Option C: Minimal First (MVP)
**Scope down to MVP:**
- Phase 1: Database ✓
- Phase 2: Dependencies ✓
- Phase 3: Minimal endpoints (just prompt processing)
- Phase 4: Simple chat UI
- Phase 5: Basic line charts only
- Expand in future iterations
- **Timeline:** ~8-10 hours
- **Best for:** Getting to market quickly

---

## 🎯 KEY DECISION POINTS

Before starting, confirm:

1. **LLM Provider:** Will use active LLM from Settings→LLM ✓
2. **Database:** PostgreSQL for vectors ✓
3. **Training:** Manual via UI ✓
4. **Charts:** All 6 types (line, bar, pie, heatmap, scatter, table) ✓
5. **Scope:** Full Featured ✓

---

## 📚 REFERENCE DOCUMENTATION

Keep these handy:
- 📄 VANNA_LANCEDB_IMPLEMENTATION_PLAN.md - Full technical details
- 📄 UPLOAD_FIX_AND_VANNA_SUMMARY.md - Overview & architecture
- 🔗 [Vanna.AI Docs](https://docs.vanna.ai)
- 🔗 [LanceDB Docs](https://lancedb.com/docs)
- 🔗 [LangChain Docs](https://python.langchain.com)

---

## ⚠️ COMMON PITFALLS TO AVOID

1. **Don't forget to train Vanna.AI** on database schema
   - Without training, SQL generation will fail
   - Always run training before querying

2. **Don't expose raw SQL to users**
   - Sanitize and validate all queries
   - Only show safe queries

3. **Don't store conversations indefinitely**
   - Set session TTL to 24 hours
   - Auto-cleanup expired sessions

4. **Don't hardcode LLM provider**
   - Always read from Settings→LLM
   - Fallback gracefully if unavailable

5. **Don't forget vector DB indexing**
   - Add indexes on frequently searched columns
   - Monitor query performance

---

## 🚨 EMERGENCY ROLLBACK

If something breaks:
```bash
# Revert vite.config.ts
git checkout vite.config.ts

# Restart dev server
npm run dev

# Check file serving
curl http://localhost:3000/uploads/...
```

---

## ✅ READY CHECKLIST

Before you start:
- [ ] Read VANNA_LANCEDB_IMPLEMENTATION_PLAN.md completely
- [ ] Understand the architecture (6-phase breakdown)
- [ ] Have .env credentials ready (Vanna API key, LLM keys)
- [ ] Database access confirmed
- [ ] Team roles assigned (DBA, Backend, Frontend, QA)
- [ ] Timeline reviewed
- [ ] Decisions confirmed (LLM, vectors, scope)

---

## 🎬 LET'S GO!

**Step 1 (Right Now):**
```bash
# Restart Vite to fix uploads
npm run dev
```

**Step 2 (Next):**
Tell me when you're ready and I'll help you:
- Start Phase 1 (Database schema)
- Create migration scripts
- Set up backend routes
- Build frontend UI

**Who should start first?** DBA → Backend Dev → Frontend Dev

---

**Questions?** Ask and I'll provide more details!
