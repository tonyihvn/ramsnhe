# AI Assistant & Settings Configuration Guide

## Overview

The AI Assistant functionality has been enhanced with comprehensive settings management for Vanna.AI, LanceDB, VectorDB, embedding models, and LLM providers. This document guides you through setup and usage.

## ✨ Features

### 1. **Vanna DDL Training** 🗃️
- Configure Vanna.AI API credentials
- Auto-train on database schema changes
- Support for GPT-4, Claude 3, and other models
- Track training sessions and history

### 2. **LanceDB Vector Store** 🗄️
- Vector database configuration
- Embeddings collection management
- Vector dimension settings
- Seamless integration with Vanna.AI

### 3. **VectorDB Settings** 📦
- Support for multiple providers: LanceDB, Pinecone, Weaviate, Milvus, Qdrant
- Host and port configuration
- API key management
- Namespace configuration

### 4. **Embedding Model** 🧵
- Support for OpenAI, HuggingFace, Cohere, Azure
- Configurable model selection
- Custom endpoint support
- Dimension settings

### 5. **LLM Model** 🧠
- Multiple providers: OpenAI, Anthropic, Google, Azure, Llama
- Temperature and token control
- Model selection and API key management
- Response quality configuration

### 6. **AI Assistant Features** 🤖
- Enable/disable AI Assistant
- Chart generation support
- Insights and analysis features
- Conversation context management
- Response tone customization

## 🚀 Quick Start

### 1. Access AI Settings
Navigate to: **Settings → AI Settings** (Admin only)

### 2. Configure Vanna.AI
```
Vanna API URL: https://api.vanna.ai
Vanna API Key: sk-your-api-key
Model: gpt-4
Auto Train DDL: ON
Training Interval: 24 hours
```

### 3. Configure LanceDB
```
LanceDB URL: http://localhost:8081
Database: activities_db
Collection: activities_embeddings
Vector Dimension: 1536
```

### 4. Configure Embedding Model
```
Provider: OpenAI
Model: text-embedding-3-small
Dimension: 1536
API Key: sk-your-embedding-key
```

### 5. Configure LLM
```
Provider: OpenAI
Model: gpt-4
Temperature: 0.7
Max Tokens: 2000
API Key: sk-your-llm-key
```

### 6. Enable AI Assistant Features
- Enable AI Assistant: ✅
- Enable Chart Generation: ✅
- Enable Insights: ✅
- Conversation Context: 5 messages
- Response Tone: Professional

### 7. Test Connections
Click "Test Connection" buttons for each component to verify setup.

## 📋 Database Tables

### dqai_ai_settings
Stores all AI configuration for your business

```sql
SELECT * FROM dqai_ai_settings WHERE business_id = 1;
```

### dqai_vanna_queries
Logs all SQL generation requests and executions

```sql
SELECT * FROM dqai_vanna_queries 
WHERE business_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

### dqai_vanna_analyses
Stores LLM analysis results and interpretations

```sql
SELECT * FROM dqai_vanna_analyses 
WHERE business_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

### dqai_ai_conversations
Tracks conversation history between users and AI

```sql
SELECT * FROM dqai_ai_conversations 
WHERE business_id = 1 
ORDER BY last_interaction DESC;
```

## 🔧 API Endpoints

### Get AI Settings
```
GET /api/ai-settings/:businessId
```

### Save AI Settings
```
PUT /api/ai-settings/:businessId
```

### Generate SQL with Vanna
```
POST /api/vanna/generate-sql
Body: {
  businessId: 1,
  prompt: "Show total reports per facility",
  context: { activityId: 123 }
}
```

### Execute SQL Query
```
POST /api/execute-sql
Body: {
  businessId: 1,
  sql: "SELECT * FROM dqai_activities",
  activityId: 123
}
```

### Analyze with LLM
```
POST /api/llm/analyze
Body: {
  businessId: 1,
  prompt: "What are the key insights?",
  queryResult: { rows: [...] },
  llmModel: "gpt-4",
  tone: "professional"
}
```

### Test Connections
```
POST /api/vanna/test-connection
POST /api/lancedb/test-connection
POST /api/embedding/test-connection
POST /api/llm/test-connection
```

## 💻 Component Usage

### AIAssistantDashboard Component

Replaces the old AI section in Activity Dashboard. Features:
- Conversation history
- Multi-turn chat support
- SQL generation via Vanna
- LLM analysis
- Chart visualization
- Error handling

```tsx
<AIAssistantDashboard 
  activityId={activityId} 
  currentUser={currentUser} 
/>
```

### AISettingsPage Component

Admin-only settings management with 6 configuration tabs:
- Vanna DDL Training
- LanceDB Vector Store
- VectorDB Settings
- Embedding Model
- LLM Model
- AI Assistant Features

## 🔐 Security Considerations

1. **API Keys**: All API keys are stored encrypted (in production)
2. **Read-Only SQL**: Only SELECT queries are allowed
3. **Business Isolation**: Settings per business
4. **Authentication**: Admin-only access
5. **Audit Logging**: All queries logged for compliance

## 📊 Activity Dashboard Integration

The AI Assistant in Activity Dashboard now:
- ✅ **Removed**: "Generated SQL (preview)" display
- ✅ **Removed**: "Run SQL button" in preview mode
- ✅ **Added**: Direct Vanna.AI SQL generation
- ✅ **Added**: Automatic LLM analysis
- ✅ **Added**: Chart visualization support
- ✅ **Added**: Conversation history
- ✅ **Added**: Context-aware responses

### Usage Flow:
1. User asks a question about activity data
2. Vanna.AI generates SQL based on activity schema
3. SQL executes against the database (read-only)
4. Query results sent to LLM for interpretation
5. LLM provides analysis, insights, and recommendations
6. Optional chart visualization if requested
7. Full conversation history maintained

## 🛠️ Setup Instructions

### Step 1: Create Database Tables
```bash
# Run the SQL migration
psql -U your_user -d your_db -f ai-settings-schema.sql
```

### Step 2: Configure Environment Variables
```env
VANNA_API_URL=https://api.vanna.ai
VANNA_API_KEY=sk-xxx
LANCEDB_URL=http://localhost:8081
EMBEDDING_API_KEY=sk-xxx
LLM_API_KEY=sk-xxx
```

### Step 3: Register API Routes
In your server's main file (e.g., `index.js` or `server.js`):
```javascript
import aiSettingsRoutes from './ai-settings-routes.js';
import vannaIntegrationRoutes from './vanna-integration-routes.js';

app.use('/api', aiSettingsRoutes);
app.use('/api', vannaIntegrationRoutes);
```

### Step 4: Verify Installation
- Navigate to `/ai-settings` (admin only)
- Test each connection type
- Verify database tables were created

## 🧪 Testing

### Test Vanna SQL Generation
```javascript
const response = await fetch('/api/vanna/generate-sql', {
  method: 'POST',
  body: JSON.stringify({
    businessId: 1,
    prompt: "How many activities are completed?",
    context: { activityId: 123 }
  })
});
```

### Test LLM Analysis
```javascript
const response = await fetch('/api/llm/analyze', {
  method: 'POST',
  body: JSON.stringify({
    businessId: 1,
    prompt: "What trends do you see?",
    queryResult: { rows: [{name: 'A', count: 10}] },
    llmModel: "gpt-4"
  })
});
```

## 📚 API Documentation

### AI Settings GET Response
```json
{
  "vannaApiUrl": "https://api.vanna.ai",
  "vannaApiKey": "sk-xxx",
  "vannaModel": "gpt-4",
  "autoTrainDDL": true,
  "trainingInterval": 24,
  "lancedbUrl": "http://localhost:8081",
  "lancedbDatabase": "activities_db",
  "lancedbCollectionName": "activities_embeddings",
  "lancedbVectorDimension": 1536,
  "vectordbProvider": "lancedb",
  "vectordbHost": "localhost",
  "vectordbPort": 8000,
  "embeddingModel": "openai",
  "embeddingModelName": "text-embedding-3-small",
  "embeddingDimension": 1536,
  "llmProvider": "openai",
  "llmModel": "gpt-4",
  "llmTemperature": 0.7,
  "llmMaxTokens": 2000,
  "enableAIAssistant": true,
  "enableChartGeneration": true,
  "enableInsights": true,
  "conversationContext": 5,
  "responseToneStyle": "professional"
}
```

## ⚠️ Troubleshooting

### Connection Test Fails
- Verify API keys are correct
- Check network connectivity
- Ensure firewall allows connections
- Review API endpoint URLs

### SQL Generation Not Working
- Ensure Vanna API is configured
- Check activity has DDL schema
- Verify Vanna is trained on your database
- Check query logs for errors

### LLM Not Responding
- Verify LLM API key
- Check API endpoint accessibility
- Ensure sufficient rate limits
- Monitor token usage

### Chart Visualization Not Showing
- Enable "Chart Generation" in settings
- Verify query results have numeric data
- Check browser console for errors
- Ensure prompt mentions charts/visualization

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API logs: `dqai_vanna_queries`, `dqai_vanna_analyses`
3. Test connections individually
4. Check configuration values match your setup

## 🔄 Future Enhancements

- [ ] Streaming responses for long-running queries
- [ ] Advanced chart configuration UI
- [ ] Multi-language support
- [ ] Fine-tuning training data
- [ ] Custom prompt templates
- [ ] Batch query processing
- [ ] Export analysis results
- [ ] Scheduled report generation
