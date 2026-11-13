# Architecture Diagram: Text-to-SQL Provider Integration

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        RAMSNHE APPLICATION ARCHITECTURE                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝


                        ┌─────────────────────────────────┐
                        │    USER INTERFACE (React)       │
                        │                                 │
                        │  Settings → App Tab              │
                        │  ┌──────────────────────────┐   │
                        │  │ Text-to-SQL Provider     │   │
                        │  │ ◯ Vanna.AI              │   │
                        │  │ ◯ Vercel AI SDK         │   │
                        │  └──────────────────────────┘   │
                        │                                 │
                        │  Settings → AI Integrations     │
                        │  ├─ Vanna DDL Training          │
                        │  └─ Vercel AI SDK               │
                        └─────────────┬───────────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
                ▼                     ▼                     ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │   Frontend State │  │    HTTP Calls    │  │   Settings UI    │
        │                  │  │                  │  │                  │
        │ activeTab        │  │ GET /provider    │  │ Radio buttons    │
        │ settings object  │  │ POST /provider   │  │ Test buttons     │
        │ handleChange()   │  │ POST /generate   │  │ Config inputs    │
        │ handleTest()     │  │ POST /test       │  └──────────────────┘
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
                 └─────────────┬───────┘
                               │
                ┌──────────────▼──────────────┐
                │                             │
                │  Node.js Backend Server     │
                │  (Express)                  │
                │                             │
                │  Routes:                    │
                │  ├─ /api/text-to-sql/*     │
                │  ├─ /api/ai-settings/*     │
                │  ├─ /api/vanna/*           │
                │  └─ /api/settings/*        │
                │                             │
                └──────────────┬──────────────┘
                               │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │         ┌───────────▼─────────┐           │
        │         │  Provider Router    │           │
        │         │                     │           │
        │         │ Check database      │           │
        │         │ textToSqlProvider   │           │
        │         │ setting             │           │
        │         └──────┬──────┬───────┘           │
        │                │      │                   │
        ▼                ▼      ▼                   ▼
    ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐
    │ PostgreSQL │  │   Vanna Server  │  │  Vercel AI SDK   │
    │ Database   │  │                 │  │                  │
    │            │  │  Flask Python   │  │  Cloud LLM       │
    │ Tables:    │  │  App on Port    │  │  (OpenAI,        │
    │ ├─settings │  │  5000           │  │   Anthropic,     │
    │ ├─ai_*     │  │                 │  │   Cohere, etc)   │
    │ └─...      │  │  Features:      │  │                  │
    └────────────┘  │  ├─ Train DDL   │  │  Features:       │
                    │  ├─ Generate    │  │  ├─ Multi-model  │
                    │  │    SQL       │  │  ├─ Multi-       │
                    │  ├─ Health      │  │  │   provider     │
                    │  │    checks    │  │  └─ Cloud        │
                    │  └─ Test DB     │  │    managed       │
                    │     connection  │  │                  │
                    └─────────────────┘  └──────────────────┘
                           │                      │
                           │ Query: question      │ Query: question
                           │                      │ + API key
                           ▼                      ▼
                    ┌──────────────┐      ┌──────────────┐
                    │ Database DDL │      │ LLM Model    │
                    │ Training     │      │ (gpt-4,      │
                    │ Stored Data  │      │  claude-3,   │
                    │              │      │  command,    │
                    │ Generated:   │      │  etc)        │
                    │ Generated SQL│      │              │
                    │ + Context    │      │ Generated SQL│
                    └──────┬───────┘      └────┬─────────┘
                           │                   │
                           └─────────┬─────────┘
                                     │
                            ┌────────▼────────┐
                            │   SQL Result    │
                            │                 │
                            │ SELECT * FROM   │
                            │ facilities      │
                            │ WHERE beds > 10 │
                            └────────┬────────┘
                                     │
                                     │ Return to frontend
                                     │
                            ┌────────▼────────┐
                            │  Display Result │
                            │                 │
                            │  Show SQL       │
                            │  Execute query  │
                            │  Display data   │
                            └─────────────────┘


╔═══════════════════════════════════════════════════════════════════════════════╗
║                              WORKFLOW DIAGRAM                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝


                         ADMIN SELECTION WORKFLOW
                         ━━━━━━━━━━━━━━━━━━━━━━━

Admin User
    │
    ├─→ Settings → App
    │       │
    │       ├─→ Choose Provider
    │       │   ◯ Vanna.AI (self-hosted)
    │       │   ◯ Vercel AI SDK (cloud)
    │       │
    │       └─→ Save Setting
    │           │
    │           ▼
    │       POST /api/text-to-sql/provider
    │           │
    │           ▼
    │       Database stores choice
    │
    │
    └─→ Settings → AI Integrations
        │
        ├─→ If Vanna.AI selected:
        │   │
        │   ├─→ Vanna DDL Training tab
        │   │   ├─ Enter server URL
        │   │   ├─ Enter database connection
        │   │   ├─ Test connection
        │   │   └─ Train on DDL
        │   │
        │   └─→ POST to Vanna server
        │
        └─→ If Vercel AI SDK selected:
            │
            ├─→ Vercel AI SDK tab
            │   ├─ Select provider
            │   ├─ Enter API key
            │   ├─ Enter model name
            │   ├─ Test connection
            │   └─ Configure settings
            │
            └─→ POST to backend


                         USER QUERY WORKFLOW
                         ━━━━━━━━━━━━━━━━━━

User Types Question
    │
    │ "Show me all facilities with more than 10 beds"
    │
    ▼
POST /api/text-to-sql/generate
    │
    │ {
    │   "question": "Show me...",
    │   "businessId": 1
    │ }
    │
    ▼
Backend Router checks:
    │
    │ GET text-to-sql provider from database
    │
    ├─ If "vanna": 
    │  │
    │  ▼
    │  Call: POST http://127.0.0.1:5000/api/generate-sql
    │  │
    │  ├─ Vanna server loads trained DDL
    │  ├─ Analyzes question
    │  ├─ Generates SQL
    │  │
    │  └─ Return SQL to backend
    │
    └─ If "vercel-ai":
       │
       ▼
       Call: Vercel AI provider with API key
       │
       ├─ Send question to LLM
       ├─ LLM generates SQL
       │
       └─ Return SQL to backend
        │
        ▼
    Return SQL to frontend
        │
        ▼
    Display SQL to user


╔═══════════════════════════════════════════════════════════════════════════════╗
║                           FILE ORGANIZATION                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

ramsnhe/
│
├── 📁 vanna_server/                    ← Vanna.AI Server
│   ├── app.py                          (Flask REST API)
│   ├── requirements.txt                (Python dependencies)
│   ├── .env                            (Configuration)
│   ├── start_vanna.bat                 (Windows startup)
│   ├── start_vanna.sh                  (Unix startup)
│   └── README.md                       (Documentation)
│
├── 📁 server/
│   ├── index.js                        (Main backend)
│   ├── vanna-routes.js                 (Vanna integration)
│   ├── ai-settings-routes.js           (AI settings)
│   └── text-to-sql-provider-routes.js  ← NEW (Provider routing)
│
├── 📁 components/
│   └── AIIntegrationsTab.tsx           (Updated: Added Vercel AI tab)
│
├── 📁 pages/
│   └── SettingsPage.tsx                (Updated: Added provider selector)
│
└── 📖 Documentation
    ├── QUICK_START_TEXT_TO_SQL.md                 (5 min setup)
    ├── TEXT_TO_SQL_PROVIDER_GUIDE.md              (Full guide)
    ├── IMPLEMENTATION_SUMMARY_TEXT_TO_SQL.md      (Details)
    ├── SETUP_COMPLETE_TEXT_TO_SQL.md              (Status)
    └── vanna_server/README.md                     (Server docs)


╔═══════════════════════════════════════════════════════════════════════════════╗
║                         CONFIGURATION HIERARCHY                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

                          Settings Database
                          ├─ textToSqlProvider: "vanna" | "vercel-ai"
                          └─ Other AI settings...
                                 ▲
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            Settings UI Form             Backend Routes
            (SettingsPage.tsx)           (Express)
            ├─ Radio buttons             │
            └─ Save button               ▼
                    │              /api/text-to-sql/*
                    │                   │
                    ▼                   ▼
            User selects         Backend checks DB
            provider             Routes request
                                 accordingly


╔═══════════════════════════════════════════════════════════════════════════════╗
║                            ERROR HANDLING FLOW                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Request Error
    │
    ├─→ Validation Error
    │   │
    │   └─→ 400 Bad Request
    │       └─→ Message: "Invalid provider"
    │
    ├─→ Connection Error (Vanna)
    │   │
    │   └─→ 500 Server Error
    │       └─→ Message: "Failed to connect to Vanna server"
    │
    ├─→ API Error (Vercel AI)
    │   │
    │   └─→ 500 Server Error
    │       └─→ Message: "Vercel AI API error"
    │
    └─→ Database Error
        │
        └─→ 500 Server Error
            └─→ Message: "Database operation failed"

All errors logged with:
- Timestamp
- Error details
- Stack trace
- Request information


╔═══════════════════════════════════════════════════════════════════════════════╗
║                         DATA FLOW EXAMPLES                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

EXAMPLE 1: Vanna.AI Flow
────────────────────────

User Input:
"How many facilities have beds greater than 50?"
                    │
                    ▼
          Vanna Server
          (localhost:5000)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    DDL Data   Question  Trained Model
                    │
                    ▼
         LLM processes query
                    │
                    ▼
    "SELECT COUNT(*) FROM facilities WHERE beds > 50"
                    │
                    ▼
         Backend returns SQL
                    │
                    ▼
    Frontend displays SQL
                    │
                    ▼
      User executes query


EXAMPLE 2: Vercel AI SDK Flow
──────────────────────────────

User Input:
"Show facilities by location"
                    │
                    ▼
      Backend checks provider
          (vercel-ai)
                    │
                    ▼
    Call Vercel provider
    + Question + API Key
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    OpenAI    Anthropic   Cohere
    (chosen)
                    │
                    ▼
      LLM generates SQL
                    │
                    ▼
  "SELECT * FROM facilities ORDER BY location"
                    │
                    ▼
         Backend returns SQL
                    │
                    ▼
    Frontend displays SQL
                    │
                    ▼
      User executes query


╔═══════════════════════════════════════════════════════════════════════════════╗
║                            DEPLOYMENT DIAGRAM                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝

DEVELOPMENT:
┌─────────────────────────────────────────────────────────────┐
│ Developer Machine                                           │
│                                                             │
│  ┌─────────────────┐        ┌──────────────────┐           │
│  │ React Frontend  │        │  Node.js Backend │           │
│  │  :9090          │        │      :3000       │           │
│  └────────┬────────┘        └────────┬─────────┘           │
│           │                          │                     │
│           └──────────────┬───────────┘                     │
│                          │                                 │
│         ┌────────────────┼────────────────┐                │
│         │                │                │                │
│         ▼                ▼                ▼                │
│     PostgreSQL    Vanna Server      Database              │
│        DB        (localhost:5000)      Config             │
│    (localhost)                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

PRODUCTION:
┌─────────────────────────────────────────────────────────────┐
│ Production Environment                                      │
│                                                             │
│  ┌─────────────────┐        ┌──────────────────┐           │
│  │ React Frontend  │        │  Node.js Backend │           │
│  │  (CDN/Build)    │        │  (PM2/Docker)    │           │
│  └────────┬────────┘        └────────┬─────────┘           │
│           │                          │                     │
│           └──────────────┬───────────┘                     │
│                          │                                 │
│         ┌────────────────┼─────────────────┐               │
│         │                │                 │               │
│         ▼                ▼                 ▼               │
│     PostgreSQL    Vanna Server    Cloud Providers         │
│     (Production)  (Docker/K8s)    (OpenAI, etc)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

This diagram shows the complete architecture of the text-to-SQL provider integration,
including all components, data flows, and deployment scenarios.
