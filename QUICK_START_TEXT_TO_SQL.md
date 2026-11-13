# 🚀 Text-to-SQL Provider Setup - Quick Start

## What's New?

Your application now supports **two text-to-SQL providers**:
- 🗃️ **Vanna.AI** - Self-hosted, requires setup
- ⚡ **Vercel AI SDK** - Cloud-based, quick setup

Choose one to use for AI-powered SQL generation!

---

## ⚡ Quick Setup (5 minutes)

### Option A: Use Vercel AI SDK (Fastest)

1. **Get an API Key**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/
   - Cohere: https://dashboard.cohere.ai/

2. **Configure in App**
   ```
   Settings → AI Integrations → Vercel AI SDK
   ```
   - Paste your API key
   - Select your model
   - Click "Test Vercel AI Connection"

3. **Enable in App Settings**
   ```
   Settings → App → Text-to-SQL Provider
   ```
   - Select "Vercel AI SDK"

✅ **Done! Ready to generate SQL**

---

### Option B: Use Vanna.AI (Self-Hosted)

1. **Start the Server**
   
   **Windows:**
   ```bash
   cd vanna_server
   start_vanna.bat
   ```
   
   **macOS/Linux:**
   ```bash
   cd vanna_server
   bash start_vanna.sh
   ```

2. **Train on Your Database**
   ```
   Settings → AI Integrations → Vanna DDL Training
   ```
   - Server URL: `http://127.0.0.1:5000`
   - Database Connection: `postgresql://user:pass@localhost:5432/db`
   - Paste your DDL (CREATE TABLE statements)
   - Click "Train Vanna on DDL"

3. **Enable in App Settings**
   ```
   Settings → App → Text-to-SQL Provider
   ```
   - Select "Vanna.AI"

✅ **Done! Ready to generate SQL**

---

## 📊 Which Should I Choose?

| Need | Choose |
|------|--------|
| Quick setup, minimal config | ⚡ Vercel AI SDK |
| Self-hosted, offline support | 🗃️ Vanna.AI |
| Lower costs at scale | 🗃️ Vanna.AI |
| Multi-provider support | ⚡ Vercel AI SDK |
| Custom database training | 🗃️ Vanna.AI |
| No infrastructure needed | ⚡ Vercel AI SDK |

---

## ✅ Test Your Setup

After configuration:

1. **Test Connection Button**
   - In AI Integrations, click "Test [Provider] Connection"
   - Should see "✅ Connection successful"

2. **Generate SQL**
   - Go to any analytics dashboard
   - Click "AI Analytics" or "Generate SQL"
   - Ask a natural language question
   - See generated SQL appear

3. **Verify it's Working**
   - Check which provider is being used
   - Settings → App → Text-to-SQL Provider shows your selection

---

## 🎯 Common Tasks

### Switch Providers
```
Settings → App → Text-to-SQL Provider
```
Select the other provider and save.

### Update Vanna Training
```
Settings → AI Integrations → Vanna DDL Training
```
Paste new DDL and click "Train Vanna on DDL"

### Change Vercel AI Model
```
Settings → AI Integrations → Vercel AI SDK
```
Update model name and test connection.

### Check Provider Status
```
Settings → AI Integrations
```
Use test buttons to verify current provider is working.

---

## 🐛 Troubleshooting

### "Connection failed" message
- Verify your API key is correct
- Check Vanna server is running (if using Vanna.AI)
- Ensure database connection string is valid
- Check network connectivity

### SQL generation not working
- Verify provider is tested and connected
- For Vanna.AI: Ensure DDL training is complete
- For Vercel AI: Verify API key has sufficient quota
- Try a simpler question first

### Server won't start (Vanna.AI)
- Ensure Python 3.8+ is installed
- Port 5000 must be available
- Check `.env` file in `vanna_server` folder
- Review error messages in terminal

---

## 📁 Files & Folders

```
ramsnhe/
├── vanna_server/                    # Vanna.AI server
│   ├── app.py                       # Main server
│   ├── requirements.txt             # Dependencies
│   ├── .env                         # Configuration
│   ├── start_vanna.bat              # Windows start
│   ├── start_vanna.sh               # macOS/Linux start
│   └── README.md                    # Detailed docs
│
├── components/
│   └── AIIntegrationsTab.tsx        # Provider settings UI
│
├── pages/
│   └── SettingsPage.tsx             # Provider selector
│
├── server/
│   └── text-to-sql-provider-routes.js  # Backend routes
│
└── TEXT_TO_SQL_PROVIDER_GUIDE.md    # Full documentation
```

---

## 📚 Learn More

- **Vanna.AI Setup**: See `vanna_server/README.md`
- **Full Guide**: See `TEXT_TO_SQL_PROVIDER_GUIDE.md`
- **API Details**: Check `server/text-to-sql-provider-routes.js`

---

## 💡 Tips

1. **Start with Vercel AI SDK** if you're new to this
2. **Test your provider** before using in production
3. **Check logs** if anything goes wrong
4. **Keep API keys secure** and never commit them
5. **Monitor usage** especially for cloud providers

---

## 🆘 Still Having Issues?

1. Verify all prerequisites are installed
2. Check configuration files (.env)
3. Test connection in Settings
4. Review application logs
5. Ensure network connectivity
6. Try the other provider as a test

**You're all set! Start generating SQL with AI! 🎉**
