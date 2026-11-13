# 📋 Next Steps & Testing Guide

**Current Status**: All systems running and ready for testing
**Last Updated**: November 13, 2026

## 🚀 Quick Start

### Current System Status
```
✅ Backend (Express):        http://localhost:3000
✅ Vanna Server (Flask):      http://127.0.0.1:8888
✅ Frontend (Vite):           http://localhost:9091
✅ Database (PostgreSQL):     dqaidb@localhost:5432
```

### Running Processes
```bash
# Terminal 1: Backend server (currently running on shellId: 41)
npm run server:dev

# Terminal 2: Frontend dev server (currently running on shellId: 42)
npm run dev
```

---

## 📖 Manual Testing Checklist

### Phase 1: Frontend Accessibility ✅

- [ ] **Open application in browser**
  ```
  URL: http://localhost:9091
  Expected: Homepage with login prompt
  ```

- [ ] **Verify homepage loads**
  - [ ] Header navigation visible
  - [ ] DQAi branding present
  - [ ] Sign In button accessible
  - [ ] Key features section visible

### Phase 2: Authentication 🔐

- [ ] **Navigate to login page**
  ```
  URL: http://localhost:9091/#/login
  Expected: Login form with email/password fields
  ```

- [ ] **Login with test credentials**
  - **Email**: `admin@demo.com`
  - **Password**: `password123`
  - **Expected Result**: Redirect to dashboard

- [ ] **Troubleshooting if login fails**
  ```
  # Check backend logs
  Terminal 1 (shellId 41): Look for auth/login POST requests
  
  # Test login API directly
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.com","password":"password123"}'
  
  # Expected: 200 OK with session cookie
  ```

### Phase 3: Settings Access 🔧

Once logged in:

- [ ] **Navigate to Settings**
  - URL: `http://localhost:9091/#/settings`
  - Expected: Settings page with tabs

- [ ] **Find AI Integrations Tab**
  - Look for tab labeled "AI Integrations" or icon ⚙️
  - Should contain subtabs for:
    - [ ] Vanna DDL Training (🗃️)
    - [ ] AI Context (🧠)
    - [ ] LLM (🤖)
    - [ ] RAG (📚)

### Phase 4: Vanna Server Status 📊

In the **AI Integrations** → **Vanna DDL Training** tab:

- [ ] **Verify Vanna Status Display**
  - Status badge should show: "✓ Running on port 8888"
  - Uptime counter should be increasing
  - Color indicator should be green

- [ ] **Test Vanna Controls**
  - [ ] **Start Button**: Try clicking (should show "already running")
  - [ ] **Stop Button**: Click to stop server
    - Expected: Status changes to "Stopped"
    - Backend logs should show: `[Vanna Server] Shutting down...`
  - [ ] **Restart Button**: Click to restart
    - Expected: Status briefly shows "Starting..."
    - Then changes back to "Running on port 8888"

### Phase 5: Vanna Training Features 🎓

In the same Vanna tab:

- [ ] **View Training Records Table**
  - Look for table showing DDL training records
  - Columns should include: ID, Type, Content, Date, Actions

- [ ] **Test CRUD Operations**
  - [ ] **Create**: Add new DDL training record
    ```
    Click "Add Training Record" or similar
    Paste sample DDL:
    ```sql
    CREATE TABLE activities (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      response TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    ```
    - Expected: Record added to table

  - [ ] **Read**: Click on record to view details
    - Expected: Modal/panel opens showing full content

  - [ ] **Update**: Edit existing record
    - Expected: Changes persist when saved

  - [ ] **Delete**: Remove record
    - Expected: Record removed from table after confirmation

### Phase 6: AI Context Configuration 🧠

Navigate to **AI Integrations** → **AI Context** subtab:

- [ ] **Verify AI Context Tab Exists**
  - Should show form for AI system prompt/context

- [ ] **Test Context Input**
  - [ ] Type sample AI context
  - [ ] Save changes
  - [ ] Verify it's persisted (reload page, context still there)

### Phase 7: LLM Configuration 🤖

In the **LLM** subtab:

- [ ] **Verify LLM Tab Exists**
  - Should show LLM provider settings
  
- [ ] **Check Available Providers**
  - [ ] OpenAI (default)
  - [ ] Ollama (if detecting local instance)
  - [ ] Vercel AI SDK (if configured)

- [ ] **Test Ollama Detection** (if Ollama running locally)
  - [ ] Select "Ollama (Local)" from dropdown
  - [ ] Wait for model detection
  - [ ] Should display available models list
  - [ ] Select a model and save
  - [ ] Expected logs in backend:
    ```
    [Ollama] Detecting local instance...
    [Ollama] Connected to http://localhost:11434
    [Ollama] Found models: [list of models]
    ```

### Phase 8: RAG Settings 📚

In the **RAG** subtab:

- [ ] **Verify RAG Tab Exists**
  - Should show RAG configuration options

- [ ] **Check Available Options**
  - [ ] LanceDB provider
  - [ ] VectorDB configuration
  - [ ] Embedding model selection

---

## 🔍 Verification Steps

### Backend Verification

```bash
# 1. Check if backend is running
curl http://localhost:3000/

# 2. Test Vanna status endpoint
curl http://localhost:3000/api/vanna-server/status

# Expected response:
# {
#   "status": "running",
#   "port": 8888,
#   "uptime": "00:05:23",
#   "message": "Vanna server running on 127.0.0.1:8888"
# }
```

### Vanna Server Verification

```bash
# 1. Test Vanna health endpoint
curl http://127.0.0.1:8888/health

# 2. Test training status
curl http://127.0.0.1:8888/api/training-status

# 3. Test database connection
curl -X POST http://127.0.0.1:8888/api/test-connection
```

### Frontend Verification

```bash
# Check browser console (F12)
# Look for:
✓ No CORS errors (should see green messages)
✓ Status polling working (check Network tab)
✓ State updates showing (Redux/Context logs if enabled)
```

---

## 🐛 Troubleshooting

### Login Not Working

**Symptom**: Login button doesn't respond or form clears

**Solution 1**: Check backend logs
```bash
# Terminal with backend (shellId: 41)
# Look for: POST /auth/login
# Expected: 200 OK or proper error message
```

**Solution 2**: Test login API directly
```powershell
$body = @{
    email = "admin@demo.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3000/auth/login' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body

$response.StatusCode
$response.Content
```

**Solution 3**: Verify database user
```sql
-- Check if user exists in database
SELECT id, email, role FROM public.users 
WHERE email = 'admin@demo.com' LIMIT 1;

-- Check password hash (should exist)
SELECT id, email, password_hash FROM public.users 
WHERE email = 'admin@demo.com' LIMIT 1;
```

### Vanna Status Shows "Error"

**Symptom**: Vanna status badge shows red/error state

**Actions to take**:
1. Check backend logs (shellId: 41) for Vanna errors
2. Verify port 8888 is not blocked by firewall
3. Try manually restarting Vanna via UI button
4. Check Python subprocess is running:
   ```powershell
   Get-Process python | Where-Object {$_.CommandLine -like "*vanna*"}
   ```

### Settings Page Not Loading

**Symptom**: Settings page shows blank or error

**Actions**:
1. Check browser console for errors (F12)
2. Check backend logs for database errors
3. Verify database connection:
   ```bash
   curl http://localhost:3000/api/test-db
   ```
4. Reload page or clear browser cache

### Frontend Port Conflict

**Symptom**: Frontend on port 9091 instead of expected 9090

**Explanation**: Port 9090 was already in use, Vite automatically used 9091

**To fix**:
```powershell
# Kill process on 9090
Get-NetTCPConnection -LocalPort 9090 | Stop-Process -Force
# Restart frontend
npm run dev
```

---

## 📊 Expected Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (User)                           │
│                  http://localhost:9091                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────┐
        │   React Frontend (Vite)         │
        │   Hot Module Replacement        │
        │   localhost:9091                │
        └────────────────┬────────────────┘
                         │ HTTP/WebSocket
                         ↓
        ┌────────────────────────────────┐
        │   Express Backend               │
        │   localhost:3000                │
        │   - Auth routes                 │
        │   - Settings API                │
        │   - Vanna control               │
        └────────────┬────────────────────┘
                     │
        ┌────────────┴─────────────┐
        ↓                          ↓
    ┌────────────┐          ┌──────────────┐
    │ PostgreSQL │          │ Vanna Server │
    │ localhost  │          │ (Python)     │
    │ :5432      │          │ 127.0.0.1    │
    │ dqaidb     │          │ :8888        │
    │            │          │              │
    └────────────┘          └──────────────┘
        DB Ops                   Flask/SQL
```

---

## ✅ Success Criteria

### Minimum Success (Core Features Working)
- [x] Backend starts without errors
- [x] Vanna server auto-starts
- [x] Frontend loads
- [x] Database connected
- [ ] Login works
- [ ] Settings page accessible
- [ ] Vanna status displays correctly

### Full Success (All Features Working)
- [ ] Login works with test credentials
- [ ] Settings → AI Integrations tab accessible
- [ ] Vanna DDL Training tab shows status "✓ Running"
- [ ] Start/Stop/Restart buttons functional
- [ ] Training records CRUD working
- [ ] Ollama detection working (if available)
- [ ] AI Context settings save/load correctly
- [ ] LLM configuration working
- [ ] RAG settings accessible

---

## 📞 Common Commands

```bash
# Start fresh
npm run server:dev    # Terminal 1
npm run dev          # Terminal 2

# Stop all services
# Ctrl+C in both terminals

# Check ports
netstat -tuln | grep -E "3000|8888|9091|5432"

# Check Python process
ps aux | grep vanna

# View backend logs in real-time
# Terminal 1: Already running, just read output

# View Vanna Python server logs
# Check backend terminal for [Vanna Server] messages
```

---

## 📈 Performance Expectations

| Operation | Expected Time | Status |
|-----------|---------------|--------|
| Backend startup | 5-10 seconds | ✅ Fast |
| Vanna auto-start | 3-5 seconds | ✅ Fast |
| Frontend load | <1 second | ✅ Very fast |
| Login request | 1-2 seconds | TBD |
| Settings page load | <1 second | TBD |
| Status update poll | 5 seconds | TBD |
| Vanna restart | 3-5 seconds | TBD |

---

## 📝 Notes for Testing

1. **Use private/incognito browser window** to avoid cached auth states
2. **Keep browser DevTools open** (F12) to monitor network and console
3. **Check backend logs constantly** - they will show what's happening server-side
4. **Test one feature at a time** - easier to debug if something breaks
5. **Clear browser cache** if you see stale UI
6. **Keep terminals running** - don't stop servers mid-test

---

**Happy Testing! 🎉**

Report any issues to the backend logs or browser console.
All core systems are operational and ready for verification.
