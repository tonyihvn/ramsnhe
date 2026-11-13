# Text-to-SQL Provider Integration Guide

This document explains the new text-to-SQL provider selection feature that allows switching between Vanna.AI and Vercel AI SDK.

## 🎯 Overview

The application now supports two text-to-SQL providers:

1. **Vanna.AI** - Self-hosted SQL generation with custom DDL training
2. **Vercel AI SDK** - Cloud-based LLM interface with multi-provider support

## 📋 Prerequisites

### For Vanna.AI
- Python 3.8+ installed locally
- Access to `vanna_server` folder

### For Vercel AI SDK
- API key from your chosen provider (OpenAI, Anthropic, Cohere, etc.)
- No local dependencies needed

## 🚀 Setup Instructions

### Step 1: Configure Vanna.AI Server (Optional)

If you want to use Vanna.AI:

```bash
# Navigate to vanna_server folder
cd vanna_server

# Windows
start_vanna.bat

# macOS/Linux
bash start_vanna.sh
```

The server will start on `http://127.0.0.1:5000`

### Step 2: Set Up Text-to-SQL Provider in App

1. Go to **Settings** → **App**
2. Scroll to **"🤖 Text-to-SQL Provider"** section
3. Choose between:
   - **Vanna.AI**: For self-hosted SQL generation
   - **Vercel AI SDK**: For cloud-based LLM interface

### Step 3: Configure Your Selected Provider

#### If using Vanna.AI:
1. Go to **Settings** → **AI Integrations** → **Vanna DDL Training**
2. Set server URL to `http://127.0.0.1:5000`
3. Enter your database connection string
4. Click **Test Vanna Connection**
5. Upload your database DDL for training

#### If using Vercel AI SDK:
1. Go to **Settings** → **AI Integrations** → **Vercel AI SDK**
2. Select your provider (OpenAI, Anthropic, etc.)
3. Enter your API key
4. Specify the model name
5. Click **Test Vercel AI Connection**

## 🔄 Provider Comparison

| Feature | Vanna.AI | Vercel AI SDK |
|---------|----------|---------------|
| Setup | Local/Docker | Cloud-based |
| Training Required | Yes | No |
| Cost | Low (self-hosted) | Based on API usage |
| Customization | High | Medium |
| Speed | Depends on server | Cloud-dependent |
| Multi-provider | No | Yes |
| Offline Support | Yes | No |

## 📊 API Endpoints

### Get Current Provider
```
GET /api/text-to-sql/provider
```

Response:
```json
{
  "provider": "vanna" or "vercel-ai"
}
```

### Set Provider
```
POST /api/text-to-sql/provider
Content-Type: application/json

{
  "provider": "vanna" or "vercel-ai"
}
```

### Generate SQL
```
POST /api/text-to-sql/generate
Content-Type: application/json

{
  "question": "Show me all facilities with more than 10 beds",
  "businessId": 1
}
```

### Test Provider Connection
```
POST /api/text-to-sql/test
```

## 🛠️ Configuration Files

### Application Settings (.env)
```env
# Main App
VANNA_SERVER_URL=http://127.0.0.1:5000
```

### Vanna Server Settings (vanna_server/.env)
```env
VANNA_HOST=127.0.0.1
VANNA_PORT=5000
VANNA_API_KEY=demo-key
VANNA_MODEL=gpt-4
DATABASE_URL=postgresql://user:password@localhost:5432/database
DATABASE_TYPE=postgres
```

## 🔧 Usage in Components

To use the selected text-to-SQL provider in your components:

```typescript
// Generate SQL using the configured provider
async function generateSQL(question: string) {
  const response = await fetch('/api/text-to-sql/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ 
      question,
      businessId: currentUser.businessId 
    })
  });
  
  if (response.ok) {
    const { sql, provider } = await response.json();
    console.log(`Generated SQL using ${provider}:`, sql);
  }
}
```

## 📈 Recommended Usage

### Use Vanna.AI When:
- ✅ You want full control over the infrastructure
- ✅ You have specific database schemas to train on
- ✅ You prefer lower ongoing costs
- ✅ You need offline capability
- ✅ Your data cannot leave your network

### Use Vercel AI SDK When:
- ✅ You want quick setup without infrastructure
- ✅ You need multi-provider support
- ✅ You prefer cloud-managed solutions
- ✅ You don't need custom training data
- ✅ You want to switch providers easily

## 🐛 Troubleshooting

### Vanna Server Won't Start
1. Ensure Python 3.8+ is installed
2. Check if port 5000 is available
3. Verify `.env` configuration
4. Check server logs for errors

### Connection Test Fails
1. Verify the selected provider is configured
2. Check network connectivity
3. Ensure API keys are correct
4. Review server logs

### SQL Generation Returns No Results
1. For Vanna: Ensure DDL training is complete
2. For Vercel AI: Verify API key and model are correct
3. Try a different question phrasing
4. Check provider-specific error logs

## 🔐 Security Considerations

1. **API Keys**: Never commit keys to version control
2. **Vanna Server**: Restrict network access to trusted IPs
3. **Database Credentials**: Use strong passwords
4. **HTTPS**: Enable HTTPS in production for all APIs
5. **Rate Limiting**: Implement rate limiting on text-to-sql endpoints

## 📚 Additional Resources

- [Vanna.AI Documentation](https://docs.vanna.ai)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai)
- [vanna_server/README.md](./vanna_server/README.md)

## ✅ Verification Checklist

- [ ] Provider selected in Settings → App
- [ ] Provider configuration complete in AI Integrations
- [ ] Test connection successful
- [ ] SQL generation working
- [ ] Performance acceptable for your use case
- [ ] Error handling in place
- [ ] Logs being monitored

## 🆘 Getting Help

If you encounter issues:

1. Check the application logs
2. Check the Vanna server logs (if using Vanna.AI)
3. Verify configuration settings
4. Test API endpoints directly with curl/Postman
5. Review error messages for specific guidance
