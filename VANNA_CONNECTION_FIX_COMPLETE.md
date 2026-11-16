# Vanna Connection Failed - Fix Complete

## Issues Fixed

### 1. **Duplicate React Import** (ClusterLayer.tsx)
- **Problem**: `React` was imported twice on lines 1 and 5
- **Solution**: Removed duplicate import, consolidated to use the first import which includes `useEffect`
- **File**: `components/ClusterLayer.tsx`

### 2. **Invalid Fetch Timeout Parameter** (ai-settings-routes.js)
- **Problem**: The fetch API doesn't support `timeout` as an option parameter. This was causing all connection tests to fail silently
- **Solution**: 
  - Added a `fetchWithTimeout` helper function that uses `AbortController` for proper timeout handling
  - Updated all test-connection endpoints to use the new helper:
    - `/api/vanna/test-connection`
    - `/api/lancedb/test-connection`
    - `/api/embedding/test-connection`
    - `/api/llm/test-connection`
  - 5-second timeout is now properly enforced across all HTTP requests
- **File**: `server/ai-settings-routes.js`

## How It Works Now

### When you click "Test Vanna Connection":

1. **Frontend** (AIIntegrationsTab.tsx) sends a request to `/api/vanna/test-connection`
2. **Backend** (ai-settings-routes.js) receives the request and:
   - If no URL provided, automatically tries to connect to local Vanna server at `http://127.0.0.1:8888/health`
   - If URL is provided, tests the connection to that URL
   - Uses AbortController to enforce 5-second timeout
3. **Returns** appropriate success/error response

## To Fix the "Vanna connection failed" Error

You need to **start the Vanna Python server**. Follow these steps:

### Option 1: Windows (Recommended)
1. Open Command Prompt or PowerShell
2. Navigate to the project folder:
   ```
   cd C:\Users\ginte\OneDrive\Desktop\PROJECTS\REACTJS\ramsnhe\vanna_server
   ```
3. Run the startup script:
   ```
   start_vanna.bat
   ```
4. The script will:
   - Check for Python installation
   - Create a virtual environment (if needed)
   - Install dependencies from requirements.txt
   - Start the Flask server on port 8888

### Option 2: Manual Start (Windows)
```bash
cd vanna_server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Option 3: Linux/Mac
```bash
cd vanna_server
./start_vanna.sh
```

## Verify Installation

Once the Vanna server is running:
1. Go to AI Settings in your app
2. Click "Test Vanna Connection"
3. Should see: ✓ Local Vanna server is running on port 8888

Or test manually:
```bash
curl http://localhost:8888/health
```

Should return:
```json
{
  "status": "healthy",
  "vanna": "connected",
  "database_type": "postgres",
  "database": "ramsnhe",
  "host": "localhost",
  "port": 5432,
  ...
}
```

## Dependencies Installed by Vanna Server

The `requirements.txt` includes:
- Flask (web framework)
- flask-cors (cross-origin support)
- python-dotenv (environment variables)
- vanna (optional, for actual Vanna AI features)

## Configuration

The Vanna server automatically uses database credentials from your `.env` file:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: ramsnhe)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password
- `VANNA_PORT` - Port for Vanna server (default: 8888)
- `VANNA_HOST` - Host for Vanna server (default: 0.0.0.0)

## Files Modified

1. **components/ClusterLayer.tsx** - Fixed duplicate React import
2. **server/ai-settings-routes.js** - Added fetchWithTimeout helper and updated all test-connection endpoints

## Testing the Fixes

After starting the Vanna server:
1. Navigate to AI Settings
2. Click "Test Vanna Connection"
3. You should see a success message instead of "VANNA connection failed"
4. Try other tests (LLM, Embedding, LanceDB) - they now have proper timeout handling too

## Notes

- The Vanna server must be running for any connection tests to work
- The backend will try to connect to `http://127.0.0.1:8888` if no custom URL is provided
- All timeout-based fetch requests now use the proper AbortController API
- The timeout is set to 5 seconds (5000ms) for all remote connections
