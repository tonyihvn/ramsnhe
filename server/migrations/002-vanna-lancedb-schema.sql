-- Vanna.AI + LanceDB Integration Schema
-- Creates tables for prompt contexts, training sessions, vectors, and conversations

-- 1. Prompt Contexts Table
-- Stores admin-configured prompt contexts for RAG/Vanna.AI
CREATE TABLE IF NOT EXISTS dqatb_prompt_contexts (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    context_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prompt_contexts_business_id ON dqatb_prompt_contexts(business_id);
CREATE INDEX IF NOT EXISTS idx_prompt_contexts_is_active ON dqatb_prompt_contexts(is_active);

-- 2. Vanna Training Sessions Table
-- Tracks Vanna.AI training sessions and DDL imports
CREATE TABLE IF NOT EXISTS dqatb_vanna_training_sessions (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    session_name VARCHAR(255) NOT NULL,
    database_type VARCHAR(50), -- 'postgresql', 'mysql', 'mongodb', etc.
    ddl_sql TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    error_message TEXT,
    trained_on_tables TEXT, -- JSON array of table names
    vector_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vanna_training_sessions_business_id ON dqatb_vanna_training_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_vanna_training_sessions_status ON dqatb_vanna_training_sessions(status);

-- 3. Lance Vectors Table
-- Stores vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS dqatb_lance_vectors (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    vector_id VARCHAR(255) UNIQUE,
    training_session_id INTEGER,
    source_type VARCHAR(50), -- 'ddl', 'documentation', 'sample_query', 'conversation'
    source_text TEXT NOT NULL,
    source_metadata JSONB, -- Additional metadata about source
    embedding_model VARCHAR(100), -- e.g., 'sentence-transformers/all-MiniLM-L6-v2'
    vector_dimensions INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (training_session_id) REFERENCES dqatb_vanna_training_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lance_vectors_business_id ON dqatb_lance_vectors(business_id);
CREATE INDEX IF NOT EXISTS idx_lance_vectors_training_session_id ON dqatb_lance_vectors(training_session_id);
CREATE INDEX IF NOT EXISTS idx_lance_vectors_source_type ON dqatb_lance_vectors(source_type);

-- 4. AI Conversations Table
-- Stores chat conversations in activity dashboards
CREATE TABLE IF NOT EXISTS dqatb_ai_conversations (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    session_key VARCHAR(255) NOT NULL, -- Unique session identifier
    activity_id INTEGER,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived'
    conversation_metadata JSONB, -- Additional metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- 24-hour expiration for cleanup
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES dqatb_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_business_id ON dqatb_ai_conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_key ON dqatb_ai_conversations(session_key);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_activity_id ON dqatb_ai_conversations(activity_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON dqatb_ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status ON dqatb_ai_conversations(status);

-- 5. Conversation Messages Table
-- Stores individual messages in conversations
CREATE TABLE IF NOT EXISTS dqatb_conversation_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    message_role VARCHAR(20), -- 'user', 'assistant'
    message_content TEXT NOT NULL,
    vanna_sql_generated VARCHAR(1000),
    vanna_sql_context JSONB, -- Context used by Vanna for SQL generation
    llm_analysis JSONB, -- LLM analysis/insights
    chart_data JSONB, -- Generated chart data
    chart_type VARCHAR(50), -- 'line', 'bar', 'scatter', 'pie', 'histogram', 'box'
    visualization_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES dqatb_ai_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON dqatb_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_message_role ON dqatb_conversation_messages(message_role);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_chart_type ON dqatb_conversation_messages(chart_type);

-- 6. LLM Settings Table (if not exists)
-- Stores LLM provider configuration per business
CREATE TABLE IF NOT EXISTS dqatb_llm_settings (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL UNIQUE,
    provider VARCHAR(100), -- 'openai', 'anthropic', 'cohere', 'local', etc.
    api_key VARCHAR(1000),
    model_name VARCHAR(255), -- e.g., 'gpt-4', 'claude-3-sonnet', etc.
    api_endpoint VARCHAR(500),
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_llm_settings_business_id ON dqatb_llm_settings(business_id);

-- 7. AI Activity Logs Table
-- For monitoring and debugging AI interactions
CREATE TABLE IF NOT EXISTS dqatb_ai_activity_logs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    user_id INTEGER,
    conversation_id INTEGER,
    action_type VARCHAR(50), -- 'vanna_training', 'vanna_query', 'vector_search', 'llm_call'
    action_details JSONB,
    status VARCHAR(50), -- 'success', 'failure'
    error_message TEXT,
    processing_time_ms INTEGER,
    tokens_used JSONB, -- {input_tokens, output_tokens}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES dqatb_users(id) ON DELETE SET NULL,
    FOREIGN KEY (conversation_id) REFERENCES dqatb_ai_conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_business_id ON dqatb_ai_activity_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_action_type ON dqatb_ai_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_created_at ON dqatb_ai_activity_logs(created_at);
