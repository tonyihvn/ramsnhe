-- Voice Capture Feature - Database Migration
-- Created for recording, transcribing, and auto-filling form data from interviews

-- Table 1: Store all voice recordings with transcription and extracted data
CREATE TABLE IF NOT EXISTS dqatb_voice_recordings (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    form_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    recording_file_path VARCHAR(500) NOT NULL,
    transcription_text TEXT,
    transcription_service VARCHAR(50),
    extracted_data JSONB,
    confidence_scores JSONB,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    status VARCHAR(50) DEFAULT 'recording',
    error_message TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (form_id) REFERENCES dqatb_forms(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES dqatb_activities(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES dqatb_users(id) ON DELETE SET NULL
);

CREATE INDEX idx_voice_business_activity ON dqatb_voice_recordings(business_id, activity_id);
CREATE INDEX idx_voice_form ON dqatb_voice_recordings(form_id);
CREATE INDEX idx_voice_created_at ON dqatb_voice_recordings(created_at DESC);
CREATE INDEX idx_voice_status ON dqatb_voice_recordings(status);

-- Table 2: Configure which speech-to-text services are active
CREATE TABLE IF NOT EXISTS dqatb_speech_to_text_configs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    configuration JSONB,
    priority_order INTEGER DEFAULT 1,
    last_tested_at TIMESTAMP,
    test_status VARCHAR(50),
    test_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, provider),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_speech_business_provider ON dqatb_speech_to_text_configs(business_id, provider);
CREATE INDEX idx_speech_active ON dqatb_speech_to_text_configs(business_id, is_active) WHERE is_active = true;

-- Table 3: Store form-specific voice capture guidelines
CREATE TABLE IF NOT EXISTS dqatb_form_voice_guidelines (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    form_id INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    ai_guide_text TEXT,
    interviewer_guide_text TEXT,
    extraction_prompt_override TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, form_id),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (form_id) REFERENCES dqatb_forms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES dqatb_users(id) ON DELETE SET NULL
);

CREATE INDEX idx_form_voice_guidelines ON dqatb_form_voice_guidelines(business_id, form_id);

-- Table 4: Media library for managing all recordings
CREATE TABLE IF NOT EXISTS dqatb_voice_media_library (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    recording_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    transcription_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES dqatb_voice_recordings(id) ON DELETE CASCADE
);

CREATE INDEX idx_media_business ON dqatb_voice_media_library(business_id);
CREATE INDEX idx_media_recording ON dqatb_voice_media_library(recording_id);
CREATE INDEX idx_media_created_at ON dqatb_voice_media_library(created_at DESC);

-- Table 5: Audit log for voice capture operations
CREATE TABLE IF NOT EXISTS dqatb_voice_capture_audit (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    recording_id INTEGER,
    action VARCHAR(50),
    details JSONB,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES dqatb_voice_recordings(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES dqatb_users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_business_action ON dqatb_voice_capture_audit(business_id, action);
CREATE INDEX idx_audit_recording ON dqatb_voice_capture_audit(recording_id);
CREATE INDEX idx_audit_created_at ON dqatb_voice_capture_audit(created_at DESC);

-- Table 6: Speech service usage statistics
CREATE TABLE IF NOT EXISTS dqatb_voice_usage_stats (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    provider VARCHAR(50),
    date DATE,
    total_recordings INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 4) DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, provider, date),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_business_provider ON dqatb_voice_usage_stats(business_id, provider);
CREATE INDEX idx_usage_date ON dqatb_voice_usage_stats(date DESC);
