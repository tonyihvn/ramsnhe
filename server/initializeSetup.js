/**
 * Server Startup Initialization Module
 * Automatically sets up all multi-tenancy features on server start
 */

import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize all startup tasks
 */
export async function initializeStartup(pool) {
    try {
        console.log('[STARTUP] Beginning initialization sequence...');

        // Step 1: Run migration if tables don't exist
        await runMigration(pool);

        // Step 2: Create default business
        await createDefaultBusiness(pool);

        // Step 3: Create super admin user
        await createSuperAdminUser(pool);

        // Step 4: Create demo account
        await createDemoAccount(pool);

        // Step 5: Create default landing page config
        await createDefaultLandingPageConfig(pool);

        // Step 6: Initialize audit logging
        await initializeAuditLogging(pool);

        // Step 7: Setup default settings
        await initializeSettings(pool);

        console.log('[STARTUP] ✅ All initialization tasks completed successfully!');
        return true;
    } catch (error) {
        console.error('[STARTUP] ❌ Initialization failed:', error.message);
        throw error;
    }
}

/**
 * Run database migration
 */
async function runMigration(pool) {
    try {
        console.log('[STARTUP] Checking database migration status...');

        // Check if new multi-tenancy tables exist
        const result = await pool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'dqai_businesses'
            )`
        );

        if (!result.rows[0].exists) {
            console.log('[STARTUP] Running database migration...');

            // Read and execute migration file
            const migrationPath = path.join(__dirname, 'migration_multi_tenancy.sql');
            if (!fs.existsSync(migrationPath)) {
                console.warn('[STARTUP] ⚠️  Migration file not found at', migrationPath);
                console.warn('[STARTUP] Skipping migration - manual migration required');
                return;
            }

            const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
            
            // Execute migration statements
            const statements = migrationSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const statement of statements) {
                try {
                    await pool.query(statement);
                } catch (error) {
                    // Ignore "already exists" errors and other non-critical errors
                    if (!error.message.includes('already exists')) {
                        // Still log the error but don't fail
                        // console.warn('[STARTUP] Migration statement warning:', error.message);
                    }
                }
            }

            console.log('[STARTUP] ✅ Database migration completed');
        } else {
            console.log('[STARTUP] ✅ Database already migrated');
            
            // Ensure all required columns exist even if tables already exist
            try {
                await pool.query(`ALTER TABLE dqai_businesses ADD COLUMN IF NOT EXISTS email TEXT`);
                await pool.query(`ALTER TABLE dqai_businesses ADD COLUMN IF NOT EXISTS address TEXT`);
                await pool.query(`ALTER TABLE dqai_businesses ADD COLUMN IF NOT EXISTS website TEXT`);
                await pool.query(`ALTER TABLE dqai_businesses ADD COLUMN IF NOT EXISTS logo_url TEXT`);
                await pool.query(`ALTER TABLE dqai_businesses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active'`);
                await pool.query(`ALTER TABLE dqai_businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
            } catch (e) {
                // Ignore column already exists errors
            }
        }
    } catch (error) {
        console.error('[STARTUP] Migration error:', error);
        throw error;
    }
}

/**
 * Create default business
 */
async function createDefaultBusiness(pool) {
    try {
        console.log('[STARTUP] Setting up default business...');

        const businessName = process.env.DEFAULT_BUSINESS_NAME || 'Default Organization';
        
        // Ensure email column exists (in case migration wasn't fully applied)
        try {
            await pool.query(`ALTER TABLE dqai_businesses ADD COLUMN IF NOT EXISTS email TEXT`);
        } catch (e) {
            // Column might already exist, ignore
        }
        
        // Check if default business exists
        const result = await pool.query(
            'SELECT id FROM dqai_businesses WHERE name = $1',
            [businessName]
        );

        if (result.rows.length === 0) {
            // Create default business
            await pool.query(
                `INSERT INTO dqai_businesses 
                (name, phone, email, status, created_at) 
                VALUES ($1, $2, $3, $4, NOW())`,
                [
                    businessName,
                    process.env.DEFAULT_BUSINESS_PHONE || '+1-800-000-0000',
                    process.env.DEFAULT_BUSINESS_EMAIL || 'info@defaultorg.com',
                    'Active'
                ]
            );
            console.log('[STARTUP] ✅ Created default business:', businessName);
        } else {
            console.log('[STARTUP] ✅ Default business already exists');
        }
    } catch (error) {
        console.error('[STARTUP] Default business creation error:', error);
        throw error;
    }
}

/**
 * Create super admin user
 */
async function createSuperAdminUser(pool) {
    try {
        console.log('[STARTUP] Setting up super admin user...');

        const superEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@demo.com';
        const superPassword = process.env.SUPER_ADMIN_PASSWORD || 'AdminPassword123!';

        // Check if super admin exists
        const result = await pool.query(
            'SELECT id FROM dqai_users WHERE email = $1',
            [superEmail]
        );

        if (result.rows.length === 0) {
            // Hash password
            const hashedPassword = await bcrypt.hash(superPassword, 10);

            // Get default business ID
            const businessResult = await pool.query(
                'SELECT id FROM dqai_businesses ORDER BY id LIMIT 1'
            );
            const businessId = businessResult.rows[0]?.id || null;

            // Create super admin
            await pool.query(
                `INSERT INTO dqai_users 
                (first_name, last_name, email, password, role, status, business_id, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                    'Super',
                    'Admin',
                    superEmail,
                    hashedPassword,
                    'super-admin',
                    'Active',
                    businessId
                ]
            );

            console.log('[STARTUP] ✅ Created super admin user:', superEmail);
            console.log('[STARTUP]    Password:', superPassword);
            console.log('[STARTUP]    ⚠️  Change this password in production!');
        } else {
            console.log('[STARTUP] ✅ Super admin user already exists');
        }
    } catch (error) {
        console.error('[STARTUP] Super admin creation error:', error);
        throw error;
    }
}

/**
 * Create demo account
 */
async function createDemoAccount(pool) {
    try {
        console.log('[STARTUP] Setting up demo account...');

        const demoEmail = process.env.DEMO_ACCOUNT_EMAIL || 'demo@demo.com';
        const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || 'Demo123!';

        // Ensure is_demo_account column exists
        try {
            await pool.query(`ALTER TABLE dqai_users ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN DEFAULT FALSE`);
        } catch (e) {
            // Column might already exist, ignore
        }

        // Check if demo account exists
        const result = await pool.query(
            'SELECT id FROM dqai_users WHERE email = $1 AND is_demo_account = true',
            [demoEmail]
        );

        if (result.rows.length === 0) {
            // Hash password
            const hashedPassword = await bcrypt.hash(demoPassword, 10);

            // Get default business ID
            const businessResult = await pool.query(
                'SELECT id FROM dqai_businesses ORDER BY id LIMIT 1'
            );
            const businessId = businessResult.rows[0]?.id || null;

            // Create demo account
            await pool.query(
                `INSERT INTO dqai_users 
                (first_name, last_name, email, password, role, status, business_id, is_demo_account, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                [
                    'Demo',
                    'User',
                    demoEmail,
                    hashedPassword,
                    'Form Builder',
                    'Active',
                    businessId,
                    true
                ]
            );

            console.log('[STARTUP] ✅ Created demo account:', demoEmail);
            console.log('[STARTUP]    Password:', demoPassword);
        } else {
            console.log('[STARTUP] ✅ Demo account already exists');
        }
    } catch (error) {
        console.error('[STARTUP] Demo account creation error:', error);
        throw error;
    }
}

/**
 * Create default landing page configuration
 */
async function createDefaultLandingPageConfig(pool) {
    try {
        console.log('[STARTUP] Setting up default landing page configuration...');

        // Ensure landing_page_config table exists
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dqai_landing_page_config (
                    id SERIAL PRIMARY KEY,
                    business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE CASCADE,
                    hero_title TEXT DEFAULT 'Welcome to Our Platform',
                    hero_subtitle TEXT DEFAULT 'Transform your data into insights',
                    hero_image_url TEXT,
                    hero_button_text TEXT DEFAULT 'Get Started',
                    hero_button_link TEXT,
                    hero_visible BOOLEAN DEFAULT TRUE,
                    features_title TEXT DEFAULT 'Key Features',
                    features_subtitle TEXT,
                    features_visible BOOLEAN DEFAULT TRUE,
                    carousel_title TEXT DEFAULT 'What Our Users Say',
                    carousel_visible BOOLEAN DEFAULT TRUE,
                    cta_title TEXT DEFAULT 'Ready to get started?',
                    cta_subtitle TEXT,
                    cta_button_text TEXT DEFAULT 'Start Free Trial',
                    cta_button_link TEXT,
                    cta_visible BOOLEAN DEFAULT TRUE,
                    demo_link TEXT,
                    demo_label TEXT DEFAULT 'Try Demo',
                    primary_color TEXT DEFAULT '#2563eb',
                    secondary_color TEXT DEFAULT '#64748b',
                    logo_url TEXT,
                    favicon_url TEXT,
                    footer_text TEXT,
                    company_name TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
        } catch (e) {
            // Table might already exist, ignore
        }

        // Get default business ID
        const businessResult = await pool.query(
            'SELECT id FROM dqai_businesses ORDER BY id LIMIT 1'
        );
        const businessId = businessResult.rows[0]?.id || 1;

        // Check if config exists
        const result = await pool.query(
            'SELECT id FROM dqai_landing_page_config WHERE business_id = $1',
            [businessId]
        );

        if (result.rows.length === 0) {
            // Create default config
            const defaultConfig = {
                heroTitle: 'Welcome to OneApp',
                heroSubtitle: 'A comprehensive data quality management solution',
                heroImage: 'https://via.placeholder.com/1200x600?text=OneApp',
                heroButtonText: 'Get Started',
                heroButtonLink: '/#/login',
                heroVisible: true,

                featuresTitle: 'Key Features',
                featuresSubtitle: 'Everything you need for data quality',
                featuresVisible: true,

                carouselTitle: 'What Our Users Say',
                carouselVisible: true,

                ctaTitle: 'Ready to get started?',
                ctaSubtitle: 'Join thousands of organizations improving their data quality',
                ctaButtonText: 'Start Free Trial',
                ctaButtonLink: '/#/login',
                ctaVisible: true,

                demoLink: '/#/login?demo=true',
                demoLabel: 'Try Demo',

                primaryColor: '#2563eb',
                secondaryColor: '#64748b',

                logoUrl: 'https://via.placeholder.com/200x50?text=OneApp+Logo',
                faviconUrl: 'https://via.placeholder.com/32x32?text=Logo',

                footerText: '© 2025 OneApp. All rights reserved.',
                companyName: 'OneApp',
            };

            await pool.query(
                `INSERT INTO dqai_landing_page_config 
                (business_id, hero_title, hero_subtitle, hero_image_url, hero_button_text, hero_button_link, hero_visible,
                 features_title, features_subtitle, features_visible,
                 carousel_title, carousel_visible,
                 cta_title, cta_subtitle, cta_button_text, cta_button_link, cta_visible,
                 demo_link, demo_label,
                 primary_color, secondary_color,
                 logo_url, favicon_url,
                 footer_text, company_name, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())`,
                [
                    businessId,
                    defaultConfig.heroTitle,
                    defaultConfig.heroSubtitle,
                    defaultConfig.heroImage,
                    defaultConfig.heroButtonText,
                    defaultConfig.heroButtonLink,
                    defaultConfig.heroVisible,
                    defaultConfig.featuresTitle,
                    defaultConfig.featuresSubtitle,
                    defaultConfig.featuresVisible,
                    defaultConfig.carouselTitle,
                    defaultConfig.carouselVisible,
                    defaultConfig.ctaTitle,
                    defaultConfig.ctaSubtitle,
                    defaultConfig.ctaButtonText,
                    defaultConfig.ctaButtonLink,
                    defaultConfig.ctaVisible,
                    defaultConfig.demoLink,
                    defaultConfig.demoLabel,
                    defaultConfig.primaryColor,
                    defaultConfig.secondaryColor,
                    defaultConfig.logoUrl,
                    defaultConfig.faviconUrl,
                    defaultConfig.footerText,
                    defaultConfig.companyName
                ]
            );

            console.log('[STARTUP] ✅ Created default landing page configuration');
        } else {
            console.log('[STARTUP] ✅ Landing page configuration already exists');
        }
    } catch (error) {
        console.error('[STARTUP] Landing page config creation error:', error);
        throw error;
    }
}

/**
 * Initialize audit logging infrastructure
 */
async function initializeAuditLogging(pool) {
    try {
        console.log('[STARTUP] Initializing audit logging...');

        // Ensure audit log table exists
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dqai_audit_logs (
                    id SERIAL PRIMARY KEY,
                    business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL,
                    user_id INTEGER REFERENCES dqai_users(id) ON DELETE SET NULL,
                    action TEXT NOT NULL,
                    entity_type TEXT,
                    entity_id INTEGER,
                    old_values JSONB,
                    new_values JSONB,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
        } catch (e) {
            // Table might already exist, ignore
        }

        // Ensure feedback messages table exists
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dqai_feedback_messages (
                    id SERIAL PRIMARY KEY,
                    business_id INTEGER REFERENCES dqai_businesses(id) ON DELETE SET NULL,
                    sender_name TEXT,
                    sender_email TEXT,
                    sender_phone TEXT,
                    subject TEXT,
                    message TEXT,
                    status TEXT DEFAULT 'New',
                    priority TEXT DEFAULT 'Normal',
                    assigned_to INTEGER REFERENCES dqai_users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
        } catch (e) {
            // Table might already exist, ignore
        }

        // Verify audit log table exists
        const result = await pool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'dqai_audit_logs'
            )`
        );

        if (result.rows[0].exists) {
            console.log('[STARTUP] ✅ Audit logging initialized');

            // Create index on created_at if not exists
            try {
                await pool.query(
                    `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
                    ON dqai_audit_logs(created_at DESC)`
                );
            } catch (e) {
                // Ignore if index already exists
            }
        } else {
            console.warn('[STARTUP] ⚠️  Audit logs table not found');
        }
    } catch (error) {
        console.error('[STARTUP] Audit logging initialization error:', error);
        // Don't throw - this is non-critical
    }
}

/**
 * Initialize system settings
 */
async function initializeSettings(pool) {
    try {
        console.log('[STARTUP] Initializing system settings...');

        // Check if settings table exists
        const tableCheck = await pool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'dqai_settings'
            )`
        );

        if (!tableCheck.rows[0].exists) {
            console.log('[STARTUP] ⚠️  Settings table not found');
            return;
        }

        // Initialize default settings if they don't exist
        const defaultSettings = {
            'app.name': 'OneApp',
            'app.version': '2.0.0',
            'app.multi_tenancy_enabled': true,
            'email.enabled': process.env.SMTP_HOST ? true : false,
            'email.from': process.env.SMTP_FROM_EMAIL || 'noreply@oneapp.com',
            'feature.demo_login_enabled': process.env.ALLOW_PUBLIC_DEMO_LINK === 'true',
            'feature.landing_page_enabled': process.env.LANDING_PAGE_ENABLED !== 'false',
            'feature.audit_logging_enabled': true,
            'security.require_password_change_days': 90,
            'security.session_timeout_minutes': 30,
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            try {
                const existing = await pool.query(
                    'SELECT value FROM dqai_settings WHERE key = $1',
                    [key]
                );

                if (existing.rows.length === 0) {
                    await pool.query(
                        'INSERT INTO dqai_settings (key, value) VALUES ($1, $2)',
                        [key, JSON.stringify(value)]
                    );
                }
            } catch (e) {
                console.warn(`[STARTUP] Could not set ${key}:`, e.message);
            }
        }

        console.log('[STARTUP] ✅ System settings initialized');
    } catch (error) {
        console.error('[STARTUP] Settings initialization error:', error);
        // Don't throw - this is non-critical
    }
}

/**
 * Log startup information
 */
export function logStartupInfo() {
    console.log('\n' + '='.repeat(60));
    console.log('OneApp Multi-Tenancy Initialization Summary');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'oneapp'}`);
    console.log(`Server Port: ${process.env.PORT || 5000}`);
    console.log(`Frontend Port: ${process.env.FRONTEND_PORT || 5173}`);
    console.log('='.repeat(60));
    console.log('Initialization Modules:');
    console.log('  ✓ Database Migration');
    console.log('  ✓ Default Business Setup');
    console.log('  ✓ Super Admin User Creation');
    console.log('  ✓ Demo Account Setup');
    console.log('  ✓ Landing Page Configuration');
    console.log('  ✓ Audit Logging');
    console.log('  ✓ System Settings');
    console.log('='.repeat(60));
    console.log('Features Enabled:');
    console.log(`  ✓ Multi-Tenancy: Enabled`);
    console.log(`  ✓ Email/SMTP: ${process.env.SMTP_HOST ? 'Enabled' : 'Disabled'}`);
    console.log(`  ✓ Demo Login: ${process.env.ALLOW_PUBLIC_DEMO_LINK === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`  ✓ Landing Page: ${process.env.LANDING_PAGE_ENABLED !== 'false' ? 'Enabled' : 'Disabled'}`);
    console.log('='.repeat(60));
    console.log('Access Points:');
    console.log(`  • Web App: http://localhost:${process.env.FRONTEND_PORT || 5173}`);
    console.log(`  • API Server: http://localhost:${process.env.PORT || 5000}`);
    console.log(`  • Super Admin: http://localhost:${process.env.FRONTEND_PORT || 5173}/#/super-admin`);
    console.log(`  • Landing Page: http://localhost:${process.env.FRONTEND_PORT || 5173}/`);
    console.log('='.repeat(60) + '\n');
}
