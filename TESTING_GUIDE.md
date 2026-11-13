# 🧪 Testing Guide - Vanna Server & Ollama Integration

## 📍 Quick Links
- **Full Docs**: [COMPLETION_SUMMARY.txt](./COMPLETION_SUMMARY.txt)
- **Technical Deep-Dive**: [VANNA_OLLAMA_UPDATE.md](./VANNA_OLLAMA_UPDATE.md)
- **Setup Reference**: [SETUP_COMPLETE.md](./SETUP_COMPLETE.md)

---

## ✅ Pre-Test Checklist

Before starting tests, ensure:

```bash
# 1. All files are in place
ls -la server/vanna-server-manager.js      # Should exist
ls -la server/vanna-server-routes.js       # Should exist
ls -la vanna_server/app.py                 # Should exist

# 2. Node modules installed
npm list | grep -i vanna                   # Should show packages

# 3. Python dependencies installed
pip list | grep vanna                      # Should show vanna
pip list | grep flask                      # Should show flask
```

---

## 🚀 Test #1: Server Auto-Start

### Objective
Verify that Vanna server starts automatically when Express starts.

### Steps

1. **Start the application**:
   ```bash
   npm start
   # or
   npm run dev
   ```

2. **Watch for startup messages**:
   ```
   Expected in console:
   [Vanna Server] Starting Vanna server on port 8888...
   [Vanna Server] Waiting for server readiness...
   [Vanna Server] ✓ Vanna server started successfully
   ```

3. **Verify process is running**:
   ```bash
   # In another terminal:
   lsof -i :8888              # Mac/Linux
   netstat -ano | findstr 8888 # Windows
   
   # Should see Python process listening on port 8888
   ```

### Expected Results
- ✅ Console shows startup messages
- ✅ Port 8888 shows Python process
- ✅ App loads successfully in browser
- ✅ No errors in console

### Troubleshooting
If it fails:
1. Check Python is installed: `python3 --version`
2. Check dependencies: `pip install vanna flask flask-cors`
3. Check port 8888 is free: `netstat -ano | findstr 8888`
4. Check app.py location: `ls -la vanna_server/app.py`

---

## 🎛️ Test #2: Server Status Display

### Objective
Verify the UI shows correct server status and updates in real-time.

### Steps

1. **Open the app** in browser (http://localhost:3000)

2. **Navigate to Settings**:
   - Click Settings icon
   - Open Settings → AI Integrations

3. **Go to Vanna DDL Training tab**:
   - Should see "Vanna DDL Training" as first tab
   - Look for status display

4. **Verify status display**:
   ```
   Expected to see:
   ✓ Running on port 8888
   Database: [auto-connected from Settings]
   Start Time: [timestamp]
   Uptime: [seconds]
   ```

5. **Watch auto-refresh**:
   - Wait 5 seconds
   - Uptime should increase by 5
   - Status should stay consistent

### Expected Results
- ✅ Status badge shows "✓ Running on port 8888"
- ✅ Database shows as auto-connected
- ✅ Uptime increments every 5 seconds
- ✅ No error messages

### Troubleshooting
If status shows "Error":
1. Check console for error messages
2. Test API: `curl http://localhost:3000/api/vanna-server/status`
3. Check Express logs for details
4. Restart app

---

## 🎮 Test #3: Server Controls

### Objective
Verify Start/Stop/Restart buttons work correctly.

### Steps

1. **From Vanna DDL Training tab**, locate buttons:
   - "Stop" button (green when running)
   - "Start" button (gray when running)
   - "Restart" button (always enabled)

2. **Test Stop button**:
   ```
   Click: Stop
   Expected result:
   - Status changes to: ○ Stopped
   - Stop button becomes disabled
   - Start button becomes enabled
   ```

3. **Verify process stopped**:
   ```bash
   lsof -i :8888        # Should show NOTHING
   curl localhost:8888  # Should timeout
   ```

4. **Test Start button**:
   ```
   Click: Start
   Expected result:
   - Status changes to: ✓ Running on port 8888
   - Stop button becomes enabled
   - Start button becomes disabled
   - Uptime resets to 0
   ```

5. **Verify process restarted**:
   ```bash
   lsof -i :8888        # Should show Python process
   curl localhost:8888  # Should connect
   ```

6. **Test Restart button**:
   ```
   Note uptime: X seconds
   Click: Restart
   Expected result:
   - Brief pause (1-2 seconds)
   - Status stays: ✓ Running on port 8888
   - Uptime resets to 0
   - Process still running on 8888
   ```

### Expected Results
- ✅ All buttons respond immediately
- ✅ Status updates in real-time
- ✅ Process actually starts/stops
- ✅ No console errors
- ✅ Can start/stop multiple times

### Troubleshooting
If buttons don't work:
1. Check browser console for errors
2. Verify API endpoints: `curl http://localhost:3000/api/vanna-server/start`
3. Check user is admin in settings
4. Refresh page and try again

---

## 🧠 Test #4: AI Integrations Tab Reorganization

### Objective
Verify tabs are reorganized correctly with Ollama option visible.

### Steps

1. **Navigate to Settings → AI Integrations**

2. **Verify tab structure**:
   ```
   Expected tabs:
   - Vanna DDL Training (first)
   - AI Integrations (second, highlighted)
   - Vercel AI SDK
   - LanceDB Vector Store
   - VectorDB Settings
   - Embedding Model
   - AI Assistant Features
   
   Note: NO "LLM Model" tab (duplicate removed)
   ```

3. **Click "AI Integrations" tab**:
   - Should show sub-tabs below
   - Sub-tabs should be: "AI Context", "LLM", "RAG"

4. **Click "LLM" sub-tab**:
   - Should show provider dropdown
   - Should include option: "Ollama (Local)"

5. **Verify no duplicate LLM tab**:
   - Scroll through all tabs
   - Should NOT see "LLM Model" tab
   - LLM content should only be in sub-tab

### Expected Results
- ✅ AI Integrations is a grouped tab
- ✅ Has 3 sub-tabs visible
- ✅ No duplicate tabs
- ✅ Ollama (Local) option visible
- ✅ All other tabs present and working

### Troubleshooting
If tabs look wrong:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check `AIIntegrationsTab.tsx` file is updated
4. Restart dev server

---

## 🎯 Test #5: Ollama Model Detection (Optional)

### Prerequisites
- Have Ollama installed: https://ollama.ai
- Ollama running: `ollama serve`
- Model pulled: `ollama pull llama2` (or mistral, neural-chat, etc.)

### Steps

1. **Verify Ollama is running**:
   ```bash
   curl http://127.0.0.1:11434/api/tags
   
   Expected: Returns JSON with models list
   ```

2. **In the app, go to**:
   - Settings → AI Integrations → AI Integrations (group) → LLM

3. **Select Ollama provider**:
   - Provider dropdown
   - Choose: "Ollama (Local)"

4. **Click "Detect Models" button**:
   - Should show loading spinner briefly
   - Models should appear in dropdown
   - Should see your pulled models

5. **Select a model**:
   - Choose from dropdown
   - Example: "llama2", "mistral", "neural-chat"

6. **Test connection**:
   - Click "Test LLM Connection"
   - Should show success message

### Expected Results
- ✅ Models load into dropdown
- ✅ Can select a model
- ✅ Test connection works
- ✅ No error messages
- ✅ If Ollama not running, shows helpful message

### Troubleshooting
If models won't load:

**If Ollama not running**:
```bash
ollama serve
# Then try "Detect Models" again
```

**If models aren't in dropdown**:
```bash
# Check Ollama has models
ollama list

# If empty, pull one
ollama pull llama2
```

**If connection test fails**:
```bash
# Test Ollama directly
curl http://127.0.0.1:11434/api/tags

# If fails, Ollama might be on different port
# Check default: http://127.0.0.1:11434
```

---

## 🛑 Test #6: Graceful Shutdown

### Objective
Verify that Vanna server shuts down cleanly when app stops.

### Steps

1. **App is running**:
   - Vanna should be running on port 8888
   - Check: `lsof -i :8888`

2. **Stop the app**:
   ```bash
   # In terminal where npm start is running:
   Ctrl+C
   ```

3. **Watch shutdown sequence**:
   ```
   Expected in console:
   [Vanna Server] Received shutdown signal
   [Vanna Server] Shutting down Vanna server...
   [Vanna Server] Waiting for process to terminate...
   [Vanna Server] ✓ Vanna server shut down successfully
   ```

4. **Verify process is gone**:
   ```bash
   # Should show nothing now
   lsof -i :8888
   
   # Should timeout (no connection)
   curl localhost:8888 --connect-timeout 1
   ```

5. **Restart and verify auto-start**:
   ```bash
   npm start
   # Should see startup messages again
   # Port 8888 should be in use again
   ```

### Expected Results
- ✅ Shutdown completes within 2-3 seconds
- ✅ No hung processes
- ✅ Port 8888 becomes free
- ✅ Auto-restart works on next app launch
- ✅ Can start/stop multiple times cleanly

### Troubleshooting
If shutdown hangs:
1. Process might be stuck
2. Manual kill: `pkill -f "python.*vanna_server"`
3. Check port: `lsof -i :8888`
4. Kill stuck process if needed

---

## 📊 Test #7: API Endpoints

### Objective
Verify all backend API endpoints are working.

### Prerequisites
- App running with Vanna server started
- User logged in as admin

### Steps

1. **Get Status** (no auth required):
   ```bash
   curl http://localhost:3000/api/vanna-server/status
   
   Expected:
   {
     "status": "running",
     "port": 8888,
     "host": "0.0.0.0",
     "uptime": 123,
     "processId": 12345
   }
   ```

2. **Health Check** (no auth required):
   ```bash
   curl http://localhost:3000/api/vanna-server/health
   
   Expected:
   {
     "ok": true,
     "status": "running"
   }
   ```

3. **Stop Server** (admin only):
   ```bash
   curl -X POST http://localhost:3000/api/vanna-server/stop
   
   Expected:
   {
     "ok": true,
     "status": "stopped",
     "message": "Vanna server stopped successfully"
   }
   ```

4. **Start Server** (admin only):
   ```bash
   curl -X POST http://localhost:3000/api/vanna-server/start
   
   Expected:
   {
     "ok": true,
     "status": "running",
     "message": "Vanna server started successfully"
   }
   ```

5. **Restart Server** (admin only):
   ```bash
   curl -X POST http://localhost:3000/api/vanna-server/restart
   
   Expected:
   {
     "ok": true,
     "status": "running",
     "message": "Vanna server restarted successfully"
   }
   ```

### Expected Results
- ✅ All endpoints return HTTP 200
- ✅ Status reflects actual server state
- ✅ Start/Stop/Restart work correctly
- ✅ Error responses for non-admin users
- ✅ No CORS errors

### Troubleshooting
If endpoints fail:
1. Check if user is logged in
2. Check if user has admin role
3. Check Express logs for errors
4. Verify routes are registered: check `server/index.js`

---

## 📋 Final Verification Checklist

- [ ] Test #1: Auto-start works
- [ ] Test #2: Status displays correctly
- [ ] Test #3: Controls (Start/Stop/Restart) work
- [ ] Test #4: UI tabs reorganized correctly
- [ ] Test #5: Ollama detection works (if applicable)
- [ ] Test #6: Graceful shutdown works
- [ ] Test #7: API endpoints respond correctly

---

## 🎉 Success Criteria

All tests pass if:

✅ Server starts automatically on app launch
✅ Real-time status updates every 5 seconds
✅ Start/Stop/Restart buttons work immediately
✅ UI shows reorganized AI Integrations tab
✅ Ollama models load (if installed)
✅ Clean shutdown with no hung processes
✅ All API endpoints return correct responses
✅ No console errors or warnings
✅ Can start/stop server multiple times
✅ App remains responsive during all operations

---

## 📞 Support

If tests fail:

1. **Check logs**:
   ```bash
   # Check Express logs for [Vanna Server] messages
   # Look for error stack traces
   ```

2. **Manual verification**:
   ```bash
   # Test Python directly
   python3 vanna_server/app.py
   
   # Test port availability
   netstat -ano | findstr :8888
   
   # Test Ollama (if applicable)
   curl http://127.0.0.1:11434/api/tags
   ```

3. **Check files**:
   - Verify `server/vanna-server-manager.js` exists
   - Verify `server/vanna-server-routes.js` exists
   - Verify `components/AIIntegrationsTab.tsx` updated

4. **Review documentation**:
   - [COMPLETION_SUMMARY.txt](./COMPLETION_SUMMARY.txt) - Comprehensive guide
   - [VANNA_OLLAMA_UPDATE.md](./VANNA_OLLAMA_UPDATE.md) - Technical details
   - [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) - Quick reference

---

## 🚀 Ready?

1. Run: `npm start`
2. Follow tests above
3. Report any issues
4. Deploy to production!

Good luck! 🎉
