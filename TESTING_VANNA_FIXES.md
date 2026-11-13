# Testing Guide - Vanna Connection Errors

## Quick Test Checklist

### Prerequisites
- Node.js server is running: `npm run dev`
- React development server is running
- You're logged in as an admin user

### Step-by-Step Testing

#### 1. Verify Routes Are Registered
```bash
# Check that the routes are loaded (look in server console)
# You should see the server starting without errors
npm run dev
```

#### 2. Test Vanna Connection (Local Server)
**Scenario:** Testing local Vanna server on default port

1. Open browser Dev Tools (F12)
2. Go to Settings → AI Settings → Vanna DDL Training tab
3. Leave "Vanna API URL" empty
4. Ensure "Vanna API Key" is also empty (or any value)
5. Click "Test Vanna Connection" button
6. **Expected Result:** 
   - ✅ Success: "Local Vanna server is running on port 8888"
   - ❌ Error: "Vanna API URL is required... local Vanna server... not running"

#### 3. Test LLM Connection (Local Model)
**Scenario:** Testing local LLM without external API

1. Go to Settings → AI Settings → LLM Model tab
2. In "LLM Provider" dropdown, select "Llama (Local)"
3. Leave "API Key" empty
4. Click "Test LLM Connection" button
5. **Expected Result:**
   - ✅ Success: "Local LLM model configured. Make sure the local server is running."

#### 4. Test LLM Connection (OpenAI)
**Scenario:** Testing with valid/invalid OpenAI API key

1. Go to Settings → AI Settings → LLM Model tab
2. In "LLM Provider" dropdown, select "OpenAI"
3. Enter a test API key in "API Key" field
4. Click "Test LLM Connection" button
5. **Expected Results:**
   - ✅ Valid key: "OpenAI connection successful"
   - ❌ Invalid key: "OpenAI API connection failed... Invalid API key or model"

#### 5. Test Embedding Connection (Local)
**Scenario:** Testing local embedding model

1. Go to Settings → AI Settings → Embedding Model tab
2. In "Embedding Provider" dropdown, select "HuggingFace"
3. Leave "API Key" empty
4. Click "Test Embedding Connection" button
5. **Expected Result:**
   - ✅ Success: "Local embedding model configured. Ensure the service is running."

## Debugging

### Check Server Console Logs
```bash
# Look for error messages when routes are registered
npm run dev
# Should show: "[Vanna Server Routes] Starting server..."
# Should NOT show: 404 errors when testing connections
```

### Check Network Tab (Browser Dev Tools)
1. Open Dev Tools (F12)
2. Go to Network tab
3. Click "Test Connection" button
4. Look for POST request:
   - URL: `/api/vanna/test-connection` (or llm/embedding)
   - Status: Should be 200 (success) or 400 (validation error), NOT 404
   - Response: Should show error details if test failed

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 error on test | Routes not registered | Restart server: `npm run dev` |
| "Failed to stop Vanna server" | 404 response | Restart server |
| "LLM connection error" with no details | Missing backend route | Check import in index.js |
| Local model marked as error | Requires API key | Backend logic now handles this |

## Expected Behavior After Fix

### ✅ What Should Work Now:

1. **Local LLM Models**
   - Select "Llama (Local)" or similar
   - Test connection without API key
   - Get success message

2. **Local Embedding Models**
   - Select local provider
   - Test connection without API key
   - Get success message (or endpoint check)

3. **Auto-detect Local Vanna**
   - Leave URL empty
   - Test connection
   - If running on port 8888, detects it automatically

4. **Better Error Messages**
   - All errors now include details
   - Specific messages for each provider
   - Suggestions for fixing issues

5. **API Key Validation**
   - Only required for cloud providers
   - Specific errors for invalid keys
   - Status codes in response

## Verification Script

You can also test via curl:

```bash
# Test Vanna (local)
curl -X POST http://localhost:3000/api/vanna/test-connection \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"businessId": 1, "vannaApiUrl": "", "vannaApiKey": ""}'

# Test LLM (local)
curl -X POST http://localhost:3000/api/llm/test-connection \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"businessId": 1, "llmProvider": "llama", "llmApiKey": ""}'

# Test Embedding (local)
curl -X POST http://localhost:3000/api/embedding/test-connection \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"businessId": 1, "embeddingModel": "local", "embeddingApiKey": ""}'
```

## Success Criteria

✅ All tests pass when:
1. Routes are registered (no 404 errors)
2. Local models work without API keys
3. Cloud providers validate API keys properly
4. Error messages are helpful and specific
5. Vanna server auto-detects on default port
6. All connection tests complete quickly

## Next Steps

1. Run through all test scenarios above
2. Check browser Network tab for proper responses
3. Verify error messages are helpful
4. Test with both local and cloud providers
5. Document any remaining issues

## Support

If issues persist:
1. Check server logs for detailed error messages
2. Verify all routes are imported in `server/index.js`
3. Ensure database connectivity
4. Confirm user authentication is working
