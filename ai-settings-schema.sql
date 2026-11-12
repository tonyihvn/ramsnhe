-- AI Settings Tables SQL Migration
-- Execute this SQL to create all necessary tables for AI Assistant functionality

-- AI Settings table
CREATE TABLE IF NOT EXISTS dqai_ai_settings (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL UNIQUE REFERENCES dqai_businesses(id) ON DELETE CASCADE,
  
  -- Vanna DDL Training settings
  vanna_api_url VARCHAR(500),
  vanna_api_key TEXT,
  vanna_model VARCHAR(50) DEFAULT 'gpt-4',
  auto_train_ddl BOOLEAN DEFAULT TRUE,
  training_interval INTEGER DEFAULT 24,
  
  -- LanceDB Vector Store settings
  lancedb_url VARCHAR(500),
  lancedb_database VARCHAR(255),
  lancedb_collection_name VARCHAR(255) DEFAULT 'activities_embeddings',
  lancedb_vector_dimension INTEGER DEFAULT 1536,
  
  -- VectorDB settings
  vectordb_provider VARCHAR(50) DEFAULT 'lancedb',
  vectordb_host VARCHAR(255),
  vectordb_port INTEGER DEFAULT 8000,
  vectordb_api_key TEXT,
  vectordb_namespace VARCHAR(100) DEFAULT 'default',
  
  -- Embedding Model settings
  embedding_model VARCHAR(50) DEFAULT 'openai',
  embedding_model_name VARCHAR(255) DEFAULT 'text-embedding-3-small',
  embedding_dimension INTEGER DEFAULT 1536,
  embedding_api_key TEXT,
  embedding_endpoint VARCHAR(500),
  
  -- LLM Model settings
  llm_provider VARCHAR(50) DEFAULT 'openai',
  llm_model VARCHAR(100) DEFAULT 'gpt-4',
  llm_temperature NUMERIC(3,2) DEFAULT 0.7,
  llm_max_tokens INTEGER DEFAULT 2000,
  llm_api_key TEXT,
  
  -- AI Assistant feature toggles
  enable_ai_assistant BOOLEAN DEFAULT TRUE,
  enable_chart_generation BOOLEAN DEFAULT TRUE,
  enable_insights BOOLEAN DEFAULT TRUE,
  conversation_context INTEGER DEFAULT 5,
  response_tone_style VARCHAR(50) DEFAULT 'professional',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_business_id ON dqai_ai_settings(business_id);

-- Vanna Training Sessions table
CREATE TABLE IF NOT EXISTS dqai_vanna_training_sessions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES dqai_businesses(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES dqai_activities(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  database_type VARCHAR(50) DEFAULT 'postgresql',
  ddl_sql TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  trained_on_tables JSONB,
  vector_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vanna_training_sessions_business_id ON dqai_vanna_training_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_vanna_training_sessions_activity_id ON dqai_vanna_training_sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_vanna_training_sessions_status ON dqai_vanna_training_sessions(status);

-- Vanna Queries table
CREATE TABLE IF NOT EXISTS dqai_vanna_queries (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES dqai_businesses(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES dqai_activities(id) ON DELETE CASCADE,
  prompt TEXT,
  generated_sql TEXT,
  query_result JSONB,
  status VARCHAR(50) DEFAULT 'generated',
  execution_time_ms INTEGER,
  row_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vanna_queries_business_id ON dqai_vanna_queries(business_id);
CREATE INDEX IF NOT EXISTS idx_vanna_queries_activity_id ON dqai_vanna_queries(activity_id);
CREATE INDEX IF NOT EXISTS idx_vanna_queries_status ON dqai_vanna_queries(status);

-- Vanna Analyses table
CREATE TABLE IF NOT EXISTS dqai_vanna_analyses (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES dqai_businesses(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES dqai_activities(id) ON DELETE CASCADE,
  prompt TEXT,
  query_result JSONB,
  analysis_response TEXT,
  model_used VARCHAR(100),
  chart_config JSONB,
  response_tone VARCHAR(50),
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vanna_analyses_business_id ON dqai_vanna_analyses(business_id);
CREATE INDEX IF NOT EXISTS idx_vanna_analyses_activity_id ON dqai_vanna_analyses(activity_id);
CREATE INDEX IF NOT EXISTS idx_vanna_analyses_created_at ON dqai_vanna_analyses(created_at);

-- AI Conversation History table
CREATE TABLE IF NOT EXISTS dqai_ai_conversations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES dqai_businesses(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES dqai_activities(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES dqai_users(id) ON DELETE CASCADE,
  conversation_messages JSONB,
  total_messages INTEGER DEFAULT 0,
  last_interaction TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_business_id ON dqai_ai_conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_activity_id ON dqai_ai_conversations(activity_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON dqai_ai_conversations(user_id);
