-- Migration: Create training records tables for Vanna and Vercel
-- This creates tables to track all training activities for both providers

-- Vanna Training Records
CREATE TABLE IF NOT EXISTS dqatb_vanna_training_records (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    training_type VARCHAR(50) NOT NULL, -- 'DDL', 'DOCUMENTATION', 'QUESTION_ANSWER'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_vanna_training_business ON dqatb_vanna_training_records(business_id);
CREATE INDEX IF NOT EXISTS idx_vanna_training_type ON dqatb_vanna_training_records(training_type);
CREATE INDEX IF NOT EXISTS idx_vanna_training_created ON dqatb_vanna_training_records(created_at DESC);

-- Vercel Training Records
CREATE TABLE IF NOT EXISTS dqatb_vercel_training_records (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    training_type VARCHAR(50) NOT NULL, -- 'PROMPT_CONTEXT', 'EXAMPLE_QUERY', 'SYSTEM_MESSAGE'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    model_config JSONB, -- Provider, model, temperature settings for this training
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_vercel_training_business ON dqatb_vercel_training_records(business_id);
CREATE INDEX IF NOT EXISTS idx_vercel_training_type ON dqatb_vercel_training_records(training_type);
CREATE INDEX IF NOT EXISTS idx_vercel_training_created ON dqatb_vercel_training_records(created_at DESC);

-- AI Context Activities (for learning)
CREATE TABLE IF NOT EXISTS dqatb_ai_context_activities (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    activity_type VARCHAR(100) NOT NULL, -- 'QUESTION_RESPONSE', 'FEEDBACK', 'CORRECTION'
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    feedback_score INTEGER, -- 1-5 for quality feedback
    feedback_text TEXT,
    context_tags VARCHAR(255)[], -- Tags for categorizing this activity
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_ai_context_business ON dqatb_ai_context_activities(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_type ON dqatb_ai_context_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_ai_context_created ON dqatb_ai_context_activities(created_at DESC);

-- Database Credentials (encrypted for use by AI providers)
CREATE TABLE IF NOT EXISTS dqatb_database_credentials (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL UNIQUE,
    db_host VARCHAR(255),
    db_port INTEGER,
    db_name VARCHAR(255),
    db_user VARCHAR(255),
    -- Note: Password should be stored encrypted in production
    -- For now, stored as is; recommend using a secrets management system
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_db_credentials_business ON dqatb_database_credentials(business_id);

-- Track retraining history
CREATE TABLE IF NOT EXISTS dqatb_provider_training_history (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'vanna', 'vercel'
    action VARCHAR(100) NOT NULL, -- 'RETRAIN', 'TRAIN', 'TEST'
    record_ids INTEGER[], -- IDs of records used for this training
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
    result JSONB, -- Result details
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_history_business ON dqatb_provider_training_history(business_id);
CREATE INDEX IF NOT EXISTS idx_training_history_provider ON dqatb_provider_training_history(provider_type);
CREATE INDEX IF NOT EXISTS idx_training_history_status ON dqatb_provider_training_history(status);
