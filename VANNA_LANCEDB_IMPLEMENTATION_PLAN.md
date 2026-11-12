# Vanna.AI + LanceDB Integration Plan

**Status:** 🚀 Starting Implementation  
**Priority:** Full Featured  
**Date:** November 12, 2026

---

## Overview

Implementing a conversational AI system that:
1. Uses **Vanna.AI** for SQL generation from natural language
2. Uses **LanceDB** for vector database storage (PostgreSQL backend)
3. Integrates with the active LLM from Settings→LLM page
4. Enables AI-powered analytics on Activity Dashboard
5. Supports conversation continuity and data visualization

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND: Activity Dashboard (/activities/dashboard/{id})
│  - Chat Interface
│  - Chart Display
│  - Data Manipulation UI
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│  BACKEND: Prompt Processing API
│  - Vanna.AI SQL Generator
│  - LLM Context Manager
│  - Conversation State
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐ ┌──────────┐ ┌──────────┐
   │  Vanna  │ │ LanceDB  │ │   LLM    │
   │   .AI   │ │  Vector  │ │  Active  │
   │         │ │   DB     │ │ Provider │
   └─────────┘ └──────────┘ └──────────┘
        │            │            │
        └────────────┼────────────┘
                     ▼
           ┌──────────────────┐
           │   PostgreSQL     │
           │   Database       │
           │   (Data + Vectors)
           └──────────────────┘
```

---

## Phase 1: Backend Infrastructure

### 1.1 Database Schema Extension

**New Tables:**
```sql
-- Prompt context configuration
CREATE TABLE dqatb_prompt_contexts (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  name VARCHAR(255),
  description TEXT,
  system_prompt TEXT,
  max_tokens INTEGER DEFAULT 2000,
  temperature FLOAT DEFAULT 0.7,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vanna.AI training sessions
CREATE TABLE dqatb_vanna_training_sessions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  session_name VARCHAR(255),
  training_data TEXT, -- DDL statements
  vector_ids TEXT[], -- Array of vector IDs in LanceDB
  status VARCHAR(50), -- pending, in_progress, completed, failed
  trained_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LanceDB vector metadata
CREATE TABLE dqatb_lance_vectors (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  vector_id VARCHAR(255) UNIQUE,
  content TEXT,
  embedding_model VARCHAR(255),
  type VARCHAR(50), -- ddl, context, example
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation history for continuity
CREATE TABLE dqatb_ai_conversations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  activity_id INTEGER,
  user_id INTEGER,
  prompt TEXT,
  response TEXT,
  sql_generated VARCHAR(MAX),
  query_results JSONB,
  chart_config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation sessions
CREATE TABLE dqatb_conversation_sessions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  activity_id INTEGER,
  user_id INTEGER,
  session_key VARCHAR(255) UNIQUE,
  context_window TEXT[], -- Array of recent messages
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```

### 1.2 Environment Variables
```
# Vanna.AI Configuration
VANNA_API_KEY=your_vanna_api_key
VANNA_MODEL=claude3  # or gpt4, llama2, etc.

# LanceDB Configuration
LANCEDB_CONNECTION_STRING=postgresql://user:pass@localhost:5432/dqaidb
LANCEDB_VECTOR_SIZE=1536

# Vector Embedding Model
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### 1.3 NPM Dependencies
```json
{
  "vanna": "^0.5.0",
  "lancedb": "^0.7.0",
  "pg": "^8.11.0",
  "sentence-transformers": "^2.2.0",
  "ai": "^3.0.0",
  "langchain": "^0.1.0"
}
```

---

## Phase 2: Backend API Routes

### 2.1 Prompt Context Settings API
```
POST   /api/admin/prompt-contexts        # Create context
GET    /api/admin/prompt-contexts        # List all contexts
GET    /api/admin/prompt-contexts/:id    # Get specific context
PUT    /api/admin/prompt-contexts/:id    # Update context
DELETE /api/admin/prompt-contexts/:id    # Delete context
```

### 2.2 Vanna.AI Training API
```
POST   /api/vanna/train                  # Start training session
GET    /api/vanna/train/status/:id       # Get training status
GET    /api/vanna/training-sessions      # List all trainings
POST   /api/vanna/train/manual           # Manual DDL input
```

### 2.3 Prompt/Chat API
```
POST   /api/vanna/prompt                 # Send prompt
  Body: {
    activityId: number,
    conversationId?: string,
    prompt: string,
    contextId?: number
  }
  Response: {
    conversationId: string,
    response: string,
    sql: string,
    data: any[],
    charts: ChartConfig[],
    references: string[]
  }

GET    /api/vanna/conversations/:activityId # Get conversation history
```

### 2.4 LanceDB Vector API
```
GET    /api/lance/statistics             # Vector DB stats
POST   /api/lance/search                 # Vector similarity search
```

---

## Phase 3: Frontend UI

### 3.1 Settings Tab: "Prompt Context"
**Location:** Settings → Prompt Context

Components:
- List of existing contexts with CRUD operations
- Context editor with:
  - Name & Description
  - System Prompt (multi-line text area)
  - Token limits (slider 500-4000)
  - Temperature (slider 0-1)
  - LLM Provider selector (read-only, uses active LLM from Settings→LLM)
  - Preview/Test prompt functionality

### 3.2 Activity Dashboard Enhancement
**Location:** /activities/dashboard/{id}

Components:
```jsx
<div className="flex gap-4">
  {/* Left: Chat Interface */}
  <ChatPanel
    activity={activity}
    conversationId={conversationId}
    onPrompt={handlePrompt}
    loading={isLoading}
  />
  
  {/* Right: Results Visualization */}
  <ResultsPanel
    data={queryResults}
    charts={generatedCharts}
    onChartTypeChange={handleChartChange}
    onDataManipulation={handleDataManip}
  />
</div>
```

**Chat Features:**
- Message history with timestamps
- Typing indicators
- Error display
- SQL preview (expandable)
- Result summary

**Results Features:**
- Multiple chart types (line, bar, pie, heatmap, scatter, table)
- Interactive chart manipulation
- Data export (CSV, JSON)
- Copy prompt + results
- Pin important queries

---

## Phase 4: Implementation Details

### 4.1 Vanna.AI Integration

**Training Process:**
```typescript
// 1. Extract DDL from all tables
async function extractDDL(pool): Promise<string[]> {
  // Get CREATE TABLE statements from database
  // Store in Vanna for SQL generation training
}

// 2. Initialize Vanna.AI
const vanna = new Vanna({
  apiKey: process.env.VANNA_API_KEY,
  model: getLLMProvider(), // Use active LLM from settings
});

// 3. Train on DDL
async function trainVanna(ddlStatements: string[]) {
  for (const ddl of ddlStatements) {
    await vanna.train({
      ddl: ddl,
      context: "Data Collection Platform - Activities Schema"
    });
  }
}

// 4. Generate SQL from prompt
async function generateSQL(prompt: string): Promise<string> {
  const sql = await vanna.generateSQL(prompt);
  return sql;
}
```

### 4.2 LanceDB Vector Storage

**Strategy:**
- Store DDL as vectors for semantic search
- Store system prompts as vectors
- Store example queries + results as vectors
- Enable similarity-based retrieval for context

**Implementation:**
```typescript
import lancedb from 'lancedb';

// Connect to PostgreSQL-backed LanceDB
const db = await lancedb.connect(process.env.LANCEDB_CONNECTION_STRING);

// Create vector table
const vectorTable = await db.createTable('prompt_vectors', {
  schema: {
    id: 'varchar',
    content: 'varchar',
    embedding: 'float32[1536]', // Use your embedding model size
    type: 'varchar', // 'ddl', 'context', 'example'
    metadata: 'struct<business_id: int, created_at: timestamp>'
  }
});

// Store vector
async function storeVector(content: string, type: string) {
  const embedding = await embedText(content);
  await vectorTable.add({
    id: generateId(),
    content: content,
    embedding: embedding,
    type: type,
    metadata: { business_id, created_at: new Date() }
  });
}

// Search vectors
async function searchVectors(query: string, limit: number = 5) {
  const queryEmbedding = await embedText(query);
  const results = await vectorTable.search(queryEmbedding).limit(limit).toList();
  return results;
}
```

### 4.3 LLM Context Management

**Context Assembly:**
```typescript
async function assembleContext(
  activityId: number,
  prompt: string,
  contextId?: number
): Promise<string> {
  // 1. Get prompt context configuration
  const context = await getPromptContext(contextId);
  
  // 2. Search vector DB for similar past queries
  const similarQueries = await searchVectors(prompt, 3);
  
  // 3. Get conversation history
  const conversation = await getConversationHistory(activityId, limit: 5);
  
  // 4. Assemble full context
  const fullContext = `
    ${context.systemPrompt}
    
    ## Recent Activity
    ${conversation.map(m => `- ${m.prompt} → ${m.response}`).join('\n')}
    
    ## Similar Previous Queries
    ${similarQueries.map(q => `- ${q.content}`).join('\n')}
    
    ## User Question
    ${prompt}
  `;
  
  return fullContext;
}
```

### 4.4 SQL Execution + LLM Analysis

```typescript
async function processPrompt(
  activityId: number,
  prompt: string,
  contextId?: number
): Promise<ChatResponse> {
  // 1. Generate SQL using Vanna.AI
  const sql = await generateSQL(prompt);
  
  // 2. Execute SQL against activity data
  const queryResults = await executeSQL(sql, activityId);
  
  // 3. Assemble LLM context
  const context = await assembleContext(activityId, prompt, contextId);
  
  // 4. Get active LLM provider from settings
  const llmProvider = await getActiveLLM();
  
  // 5. Send to LLM for analysis + insights
  const analysis = await callLLM(llmProvider, {
    system: context,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: `I found this data:\n${JSON.stringify(queryResults)}` }
    ]
  });
  
  // 6. Generate appropriate charts
  const charts = await generateCharts(queryResults, analysis);
  
  // 7. Store in conversation history
  await storeConversationMessage({
    activityId,
    prompt,
    response: analysis.text,
    sql,
    queryResults,
    chartConfig: charts
  });
  
  return {
    response: analysis.text,
    sql,
    data: queryResults,
    charts,
    references: extractReferences(analysis.text)
  };
}
```

### 4.5 Chart Generation

```typescript
// Supported chart types
type ChartType = 'line' | 'bar' | 'pie' | 'heatmap' | 'scatter' | 'table';

async function generateCharts(
  data: any[],
  analysis: string
): Promise<ChartConfig[]> {
  // Analyze data structure and query to determine best visualizations
  const charts: ChartConfig[] = [];
  
  if (hasTimeSeries(data)) {
    charts.push({
      type: 'line',
      title: 'Trend Over Time',
      data: transformToTimeSeries(data),
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }
  
  if (hasCategoricalData(data)) {
    charts.push({
      type: 'bar',
      title: 'Category Comparison',
      data: transformToCategorical(data),
      options: { indexAxis: 'y', responsive: true }
    });
  }
  
  // Always include data table
  charts.push({
    type: 'table',
    title: 'Raw Data',
    data: data
  });
  
  return charts;
}
```

---

## Phase 5: Conversation Continuity

```typescript
interface ConversationSession {
  id: string;
  activityId: number;
  contextWindow: Message[];
  createdAt: Date;
  expiresAt: Date; // 24 hours from last message
}

// Load conversation context
async function getConversationContext(
  activityId: number,
  sessionId?: string
): Promise<Message[]> {
  if (!sessionId) {
    // Start new conversation
    return [];
  }
  
  const session = await getSession(sessionId);
  return session?.contextWindow || [];
}

// Append to context window
async function updateContextWindow(
  sessionId: string,
  message: Message
): Promise<void> {
  const session = await getSession(sessionId);
  session.contextWindow.push(message);
  
  // Keep last 20 messages in context
  if (session.contextWindow.length > 20) {
    session.contextWindow = session.contextWindow.slice(-20);
  }
  
  await saveSession(session);
}
```

---

## Phase 6: Error Handling & Fallbacks

```typescript
// Fallback if Vanna.AI fails
async function generateSQLFallback(prompt: string): Promise<string> {
  // Use LLM directly to generate SQL
  const response = await callLLM(getLLMProvider(), {
    system: `You are a SQL expert. Generate PostgreSQL.`,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return extractSQLFromResponse(response.text);
}

// Fallback if LanceDB unavailable
async function getContextWithoutVectors(
  activityId: number,
  prompt: string
): Promise<string> {
  // Use database queries instead of vector search
  const similarQueries = await getSimilarQueriesBySQL(prompt);
  return assembleBasicContext(similarQueries);
}
```

---

## Database Setup Script

```sql
-- Run these migrations on startup

ALTER TABLE dqatb_prompt_contexts ADD COLUMN business_id INTEGER;
ALTER TABLE dqatb_vanna_training_sessions ADD COLUMN business_id INTEGER;
ALTER TABLE dqatb_lance_vectors ADD COLUMN business_id INTEGER;
ALTER TABLE dqatb_ai_conversations ADD COLUMN business_id INTEGER;
ALTER TABLE dqatb_conversation_sessions ADD COLUMN business_id INTEGER;

CREATE INDEX idx_prompt_contexts_business ON dqatb_prompt_contexts(business_id);
CREATE INDEX idx_vanna_training_business ON dqatb_vanna_training_sessions(business_id);
CREATE INDEX idx_lance_vectors_business ON dqatb_lance_vectors(business_id);
CREATE INDEX idx_ai_conversations_activity ON dqatb_ai_conversations(activity_id);
CREATE INDEX idx_conversation_sessions_activity ON dqatb_conversation_sessions(activity_id);
```

---

## Testing Plan

### Unit Tests
- [ ] Vanna.AI SQL generation
- [ ] Vector storage and retrieval
- [ ] Context assembly
- [ ] Chart generation logic

### Integration Tests
- [ ] End-to-end prompt processing
- [ ] LLM context management
- [ ] Conversation continuity
- [ ] Error recovery

### E2E Tests
- [ ] User creates prompt context in Settings
- [ ] User trains Vanna.AI on database
- [ ] User queries activity data via chat
- [ ] Charts are generated and interactive
- [ ] Conversation history persists

---

## Deployment Considerations

- LanceDB vector table needs to be migrated if changing embedding model
- Vanna.AI training needs to happen after database schema changes
- Vector DB queries may need indexing for performance
- Monitor embedding API costs if using external service
- Set conversation session TTL (auto-cleanup)

---

## Success Metrics

✅ Users can create custom prompts contexts  
✅ Vanna.AI successfully trains on database schema  
✅ Natural language queries return accurate results  
✅ Charts automatically generated and correct  
✅ Conversation continues across page reloads  
✅ LLM insights supplement query results  
✅ Vector search improves over time  

---

**Next Step:** Start with Phase 1 & 2 (Database + API Routes)
