-- Multi-Tenancy and Super User Management System Migration
-- This migration adds comprehensive multi-tenancy support with business_id scoping
-- and super-admin capabilities for managing multiple businesses and users

-- ======================================
-- 1. Create businesses table (already defined in initDb but ensuring it's here)
-- ======================================
CREATE TABLE IF NOT EXISTS dqai_businesses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Active', -- Active, Inactive, Suspended
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ======================================
-- 2. Add business_id to all primary tables
-- ======================================
ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_programs ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_facilities ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_activities ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_activity_reports ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_questions ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_answers ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_uploaded_docs ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_datasets ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_dataset_content ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_report_templates ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;
ALTER TABLE dqai_settings ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL;

-- ======================================
-- 3. Create landing page configuration table
-- ======================================
CREATE TABLE IF NOT EXISTS dqai_landing_page_config (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE CASCADE,
    -- Hero Section
    hero_title TEXT DEFAULT 'Welcome to Our Platform',
    hero_subtitle TEXT DEFAULT 'Transform your data into insights',
    hero_image_url TEXT,
    hero_button_text TEXT DEFAULT 'Get Started',
    hero_button_link TEXT,
    hero_visible BOOLEAN DEFAULT TRUE,
    
    -- Features Section
    features_title TEXT DEFAULT 'Our Features',
    features_subtitle TEXT,
    features_data JSONB DEFAULT '[]'::jsonb, -- Array of {icon, title, description}
    features_visible BOOLEAN DEFAULT TRUE,
    
    -- Carousel/Testimonials Section
    carousel_title TEXT DEFAULT 'What Our Users Say',
    carousel_items JSONB DEFAULT '[]'::jsonb, -- Array of {image, text, author}
    carousel_visible BOOLEAN DEFAULT TRUE,
    
    -- CTA Section
    cta_title TEXT DEFAULT 'Ready to get started?',
    cta_subtitle TEXT DEFAULT 'Join thousands of organizations using our platform',
    cta_button_text TEXT DEFAULT 'Start Free Trial',
    cta_button_link TEXT,
    cta_visible BOOLEAN DEFAULT TRUE,
    
    -- Demo Link
    demo_link TEXT,
    demo_label TEXT DEFAULT 'Try Demo',
    
    -- Footer
    footer_text TEXT,
    footer_links JSONB DEFAULT '[]'::jsonb,
    
    -- General
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#1e40af',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id)
);

-- ======================================
-- 4. Create feedback/contact messages table
-- ======================================
CREATE TABLE IF NOT EXISTS dqai_feedback_messages (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    attachment_url TEXT,
    status TEXT DEFAULT 'New', -- New, Reviewed, Resolved, Spam
    priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
    assigned_to INTEGER REFERENCES dqai_users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ======================================
-- 5. Create user account requests/approvals table
-- ======================================
CREATE TABLE IF NOT EXISTS dqai_user_approvals (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES dqai_users(id) ON DELETE CASCADE,
    requested_role TEXT,
    request_reason TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    approved_by INTEGER REFERENCES dqai_users(id) ON DELETE SET NULL,
    approval_notes TEXT,
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- ======================================
-- 6. Enhance users table for super-admin and demo accounts
-- ======================================
ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN DEFAULT FALSE;
ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user'; -- user, demo, system
ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMP;
ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;
ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- ======================================
-- 7. Create audit log table for super-admin activities
-- ======================================
CREATE TABLE IF NOT EXISTS dqai_audit_logs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES dqai_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- Created, Updated, Deleted, Activated, Deactivated, etc
    entity_type TEXT NOT NULL, -- User, Business, Activity, etc
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ======================================
-- 8. Create indexes for performance
-- ======================================
CREATE INDEX IF NOT EXISTS idx_users_business_id ON dqai_users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON dqai_users(email);
CREATE INDEX IF NOT EXISTS idx_programs_business_id ON dqai_programs(business_id);
CREATE INDEX IF NOT EXISTS idx_facilities_business_id ON dqai_facilities(business_id);
CREATE INDEX IF NOT EXISTS idx_activities_business_id ON dqai_activities(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_reports_business_id ON dqai_activity_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_answers_business_id ON dqai_answers(business_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_config_business_id ON dqai_landing_page_config(business_id);
CREATE INDEX IF NOT EXISTS idx_feedback_business_id ON dqai_feedback_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON dqai_feedback_messages(status);
CREATE INDEX IF NOT EXISTS idx_user_approvals_business_id ON dqai_user_approvals(business_id);
CREATE INDEX IF NOT EXISTS idx_user_approvals_status ON dqai_user_approvals(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON dqai_audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON dqai_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON dqai_audit_logs(created_at);
