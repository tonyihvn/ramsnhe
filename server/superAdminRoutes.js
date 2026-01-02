/**
 * Super Admin and Multi-Tenancy API Routes
 * Handles business management, user approvals, landing page configuration, and feedback
 */

import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt'
import { tables } from './tablePrefix.js';

// Email transporter configuration
function createEmailTransporter() {
    const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    };

    return nodemailer.createTransport(smtpConfig);
}

// Helper: Send email notifications
async function sendEmail(to, subject, htmlContent, textContent = '') {
    try {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            console.warn('SMTP not configured, skipping email:', subject);
            return false;
        }

        const transporter = createEmailTransporter();
        await transporter.sendMail({
            from: `${process.env.SMTP_FROM_NAME || 'OneApp'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html: htmlContent,
            text: textContent || subject
        });
        console.log(`Email sent to ${to}: ${subject}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Helper: Audit log creation
async function createAuditLog(pool, businessId, userId, action, entityType, entityId, oldValues = null, newValues = null, req = null) {
    try {
        const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const userAgent = req?.headers['user-agent'] || 'unknown';
        
        await pool.query(
            `INSERT INTO ${tables.AUDIT_LOGS} (business_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [businessId, userId, action, entityType, entityId, JSON.stringify(oldValues), JSON.stringify(newValues), ipAddress, userAgent]
        );
    } catch (error) {
        console.error('Audit log creation failed:', error);
    }
}

// Helper: Check if role is super admin (case-insensitive)
function isSuperAdminRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase();
    return normalized === 'super-admin' || normalized === 'super_admin';
}

// Helper: Check if role is admin (case-insensitive)
function isAdminRole(role) {
    if (!role) return false;
    const normalized = String(role).toLowerCase();
    return normalized === 'admin';
}

/**
 * Register super-admin routes
 */
export function registerSuperAdminRoutes(app, pool) {
    
    // ============================================
    // BUSINESS MANAGEMENT ROUTES
    // ============================================
    
    /**
     * GET /api/super-admin/businesses
     * Get all businesses (super-admin only)
     */
    app.get('/api/super-admin/businesses', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const result = await pool.query(`SELECT * FROM ${tables.BUSINESSES} ORDER BY created_at DESC`);
            res.json({ businesses: result.rows });
        } catch (error) {
            console.error('GET businesses error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/super-admin/businesses
     * Create a new business
     */
    app.post('/api/super-admin/businesses', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { name, phone, email, address, website, settings } = req.body;
            
            const result = await pool.query(
                `INSERT INTO ${tables.BUSINESSES} (name, phone, email, address, website, settings)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [name, phone, email, address, website, JSON.stringify(settings || {})]
            );

            // Create audit log
            await createAuditLog(pool, result.rows[0].id, req.session.userId, 'Created', 'Business', result.rows[0].id, null, result.rows[0], req);

            res.json({ business: result.rows[0] });
        } catch (error) {
            console.error('POST business error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/businesses/:businessId
     * Update business details
     */
    app.put('/api/super-admin/businesses/:businessId', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { businessId } = req.params;
            const { name, phone, email, address, website, status, settings } = req.body;

            const old = await pool.query(`SELECT * FROM ${tables.BUSINESSES} WHERE id = $1`, [businessId]);
            
            const result = await pool.query(
                `UPDATE ${tables.BUSINESSES} 
                 SET name = $1, phone = $2, email = $3, address = $4, website = $5, status = $6, settings = $7, updated_at = NOW()
                 WHERE id = $8
                 RETURNING *`,
                [name, phone, email, address, website, status, JSON.stringify(settings || {}), businessId]
            );

            await createAuditLog(pool, businessId, req.session.userId, 'Updated', 'Business', businessId, old.rows[0], result.rows[0], req);

            res.json({ business: result.rows[0] });
        } catch (error) {
            console.error('PUT business error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================
    // USER MANAGEMENT ROUTES
    // ============================================

    /**
     * GET /api/super-admin/users
     * Get all users across all businesses (super-admin only) or within user's business
     */
    app.get('/api/super-admin/users', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await pool.query(`SELECT role, business_id FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (user.rows.length === 0) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            let query = `SELECT id, first_name, last_name, email, role, status, business_id, created_at, last_login_at, account_type, is_demo_account FROM ${tables.USERS} WHERE 1=1`;
            const params = [];

            // Super admin sees all users, business admin sees only their business
            if (!isSuperAdminRole(user.rows[0].role)) {
                query += ' AND business_id = $1';
                params.push(user.rows[0].business_id);
            }

            query += ' ORDER BY created_at DESC LIMIT 500';
            const result = await pool.query(query, params);
            res.json({ users: result.rows });
        } catch (error) {
            console.error('GET users error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/super-admin/users/:userId
     * Get detailed user information
     */
    app.get('/api/super-admin/users/:userId', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { userId } = req.params;
            const currentUser = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            
            if (currentUser.rows.length === 0 || !isSuperAdminRole(currentUser.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const user = await pool.query(`SELECT * FROM ${tables.USERS} WHERE id = $1`, [userId]);
            if (user.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ user: user.rows[0] });
        } catch (error) {
            console.error('GET user error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/super-admin/users
     * Create a new user (admin can pre-create and send invitation)
     */
    app.post('/api/super-admin/users', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role, business_id FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !currentUser.rows[0].business_id)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { firstName, lastName, email, role, businessId, sendInvitation } = req.body;
            const assignedBusinessId = businessId || currentUser.rows[0].business_id;

            // Normalize admin role to 'Admin' (capital A) to ensure consistent permissions
            let normalizedRole = role;
            if (String(role).toLowerCase() === 'admin') {
                normalizedRole = 'Admin';
            }

            // Check if user already exists
            const exists = await pool.query(`SELECT id FROM ${tables.USERS} WHERE email = $1`, [email]);
            if (exists.rows.length > 0) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            // Create temporary password
            const tempPassword = Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            const result = await pool.query(
                `INSERT INTO ${tables.USERS} (first_name, last_name, email, password, role, status, business_id, account_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [firstName, lastName, email, hashedPassword, normalizedRole, 'Pending', assignedBusinessId, 'user']
            );

            // Send invitation email if requested
            if (sendInvitation) {
                await sendEmail(
                    email,
                    'Welcome to OneApp - Account Invitation',
                    `<p>Hello ${firstName},</p>
                     <p>Your account has been created on OneApp. Please log in with your email and set your password.</p>
                     <p><strong>Email:</strong> ${email}</p>
                     <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                     <p><a href="${process.env.FRONTEND_HOST}/login">Click here to log in</a></p>`
                );
            }

            await createAuditLog(pool, assignedBusinessId, req.session.userId, 'Created', 'User', result.rows[0].id, null, result.rows[0], req);

            res.json({ user: result.rows[0], tempPassword: sendInvitation ? null : tempPassword });
        } catch (error) {
            console.error('POST user error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/users/:userId/activate
     * Activate a user account
     */
    app.put('/api/super-admin/users/:userId/activate', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { userId } = req.params;
            const result = await pool.query(
                `UPDATE ${tables.USERS} 
                 SET status = 'Active', account_activated_at = NOW()
                 WHERE id = $1
                 RETURNING *`,
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            await sendEmail(
                result.rows[0].email,
                'Account Activated',
                `<p>Your account has been activated. You can now log in.</p>`
            );

            await createAuditLog(pool, result.rows[0].business_id, req.session.userId, 'Activated', 'User', userId, null, result.rows[0], req);

            res.json({ user: result.rows[0] });
        } catch (error) {
            console.error('PUT activate error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/users/:userId/deactivate
     * Deactivate a user account
     */
    app.put('/api/super-admin/users/:userId/deactivate', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { userId } = req.params;
            const result = await pool.query(
                `UPDATE ${tables.USERS} 
                 SET status = 'Inactive', deactivated_at = NOW()
                 WHERE id = $1
                 RETURNING *`,
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            await createAuditLog(pool, result.rows[0].business_id, req.session.userId, 'Deactivated', 'User', userId, null, result.rows[0], req);

            res.json({ user: result.rows[0] });
        } catch (error) {
            console.error('PUT deactivate error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/users/:userId/role
     * Change user role
     */
    app.put('/api/super-admin/users/:userId/role', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { userId } = req.params;
            const { role } = req.body;

            const old = await pool.query(`SELECT * FROM ${tables.USERS} WHERE id = $1`, [userId]);
            const result = await pool.query(
                `UPDATE ${tables.USERS} SET role = $1 WHERE id = $2 RETURNING *`,
                [role, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            await createAuditLog(pool, result.rows[0].business_id, req.session.userId, 'Updated', 'User', userId, old.rows[0], result.rows[0], req);

            res.json({ user: result.rows[0] });
        } catch (error) {
            console.error('PUT role error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================
    // LANDING PAGE CONFIGURATION ROUTES
    // ============================================

    /**
     * Helper: Convert snake_case to camelCase
     */
    const snakeToCamel = (str) => {
        return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    };

    /**
     * Helper: Convert database row from snake_case to camelCase
     */
    const convertRowToCamel = (row) => {
        const result = {};
        for (const [key, value] of Object.entries(row)) {
            const camelKey = snakeToCamel(key);
            result[camelKey] = value;
        }
        return result;
    };

    /**
     * GET /api/landing-page-config
     * Get universal landing page configuration (public)
     */
    app.get('/api/landing-page-config', async (req, res) => {
        try {
            // Fetch universal config using business_id = 0 (reserved for universal config)
            let config = await pool.query(
                `SELECT * FROM ${tables.LANDING_PAGE_CONFIG} WHERE business_id = $1`,
                [0]
            );

            if (config.rows.length === 0) {
                // Return default config
                config = {
                    businessId: 0,
                    heroTitle: 'Welcome to OneApp',
                    heroTitleFontSize: '48px',
                    heroTitleFontWeight: '700',
                    heroSubtitle: 'Transform your data into insights',
                    heroSubtitleFontSize: '20px',
                    heroSubtitleFontWeight: '400',
                    heroVisible: true,
                    featuresTitle: 'Our Features',
                    featuresTitleFontSize: '36px',
                    featuresTitleFontWeight: '700',
                    featuresSubtitle: '',
                    featuresSubtitleFontSize: '18px',
                    featuresSubtitleFontWeight: '400',
                    featuresData: [],
                    featuresVisible: true,
                    carouselTitle: 'What Our Users Say',
                    carouselTitleFontSize: '36px',
                    carouselTitleFontWeight: '700',
                    carouselItems: [],
                    carouselVisible: true,
                    ctaTitle: 'Ready to get started?',
                    ctaTitleFontSize: '36px',
                    ctaTitleFontWeight: '700',
                    ctaSubtitle: '',
                    ctaSubtitleFontSize: '18px',
                    ctaSubtitleFontWeight: '400',
                    ctaVisible: true,
                    primaryColor: '#2563eb',
                    secondaryColor: '#1e40af',
                    lockedOrganizationId: null
                };
            } else {
                // Convert snake_case to camelCase
                config = convertRowToCamel(config.rows[0]);
            }

            res.json({ config });
        } catch (error) {
            console.error('GET universal landing page config error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/landing-page-config
     * Update universal landing page configuration (super-admin/admin only)
     */
    app.put('/api/landing-page-config', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role, business_id FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const config = req.body;

            const result = await pool.query(
                `INSERT INTO ${tables.LANDING_PAGE_CONFIG} 
                 (business_id, hero_title, hero_subtitle, hero_image_url, hero_button_text, hero_button_link, hero_visible,
                  features_title, features_subtitle, features_data, features_visible,
                  carousel_title, carousel_items, carousel_visible,
                  cta_title, cta_subtitle, cta_button_text, cta_button_link, cta_visible,
                  demo_link, demo_label, footer_text, footer_links, logo_url, favicon_url, primary_color, secondary_color,
                  hero_title_font_size, hero_title_font_weight, hero_subtitle_font_size, hero_subtitle_font_weight,
                  features_title_font_size, features_title_font_weight, features_subtitle_font_size, features_subtitle_font_weight,
                  carousel_title_font_size, carousel_title_font_weight, cta_title_font_size, cta_title_font_weight,
                  cta_subtitle_font_size, cta_subtitle_font_weight,
                  app_name, nav_background_color, nav_text_color, pricing_items, pricing_visible, pricing_currency, custom_pages, hero_featured_images, locked_organization_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
                 $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50)
                 ON CONFLICT (business_id) 
                 DO UPDATE SET 
                    hero_title = $2, hero_subtitle = $3, hero_image_url = $4, hero_button_text = $5, hero_button_link = $6, hero_visible = $7,
                    features_title = $8, features_subtitle = $9, features_data = $10, features_visible = $11,
                    carousel_title = $12, carousel_items = $13, carousel_visible = $14,
                    cta_title = $15, cta_subtitle = $16, cta_button_text = $17, cta_button_link = $18, cta_visible = $19,
                    demo_link = $20, demo_label = $21, footer_text = $22, footer_links = $23, logo_url = $24, favicon_url = $25, 
                    primary_color = $26, secondary_color = $27,
                    hero_title_font_size = $28, hero_title_font_weight = $29, hero_subtitle_font_size = $30, hero_subtitle_font_weight = $31,
                    features_title_font_size = $32, features_title_font_weight = $33, features_subtitle_font_size = $34, features_subtitle_font_weight = $35,
                    carousel_title_font_size = $36, carousel_title_font_weight = $37, cta_title_font_size = $38, cta_title_font_weight = $39,
                          cta_subtitle_font_size = $40, cta_subtitle_font_weight = $41,
                          app_name = $42, nav_background_color = $43, nav_text_color = $44, pricing_items = $45, pricing_visible = $46, pricing_currency = $47, custom_pages = $48, hero_featured_images = $49, locked_organization_id = $50,
                          updated_at = NOW()
                 RETURNING *`,
                [
                    0, // business_id = 0 for universal
                    config.heroTitle, config.heroSubtitle, config.heroImageUrl, config.heroButtonText, config.heroButtonLink, config.heroVisible,
                    config.featuresTitle, config.featuresSubtitle, JSON.stringify(config.featuresData), config.featuresVisible,
                    config.carouselTitle, JSON.stringify(config.carouselItems), config.carouselVisible,
                    config.ctaTitle, config.ctaSubtitle, config.ctaButtonText, config.ctaButtonLink, config.ctaVisible,
                    config.demoLink, config.demoLabel, config.footerText, JSON.stringify(config.footerLinks), config.logoUrl, config.faviconUrl,
                    config.primaryColor, config.secondaryColor,
                    config.heroTitleFontSize, config.heroTitleFontWeight, config.heroSubtitleFontSize, config.heroSubtitleFontWeight,
                    config.featuresTitleFontSize, config.featuresTitleFontWeight, config.featuresSubtitleFontSize, config.featuresSubtitleFontWeight,
                    config.carouselTitleFontSize, config.carouselTitleFontWeight, config.ctaTitleFontSize, config.ctaTitleFontWeight,
                    config.ctaSubtitleFontSize, config.ctaSubtitleFontWeight,
                    config.appName || config.app_name || null,
                    config.navBackgroundColor || config.nav_background_color || null,
                    config.navTextColor || config.nav_text_color || null,
                    JSON.stringify(config.pricingItems || config.pricing_items || []), config.pricingVisible !== undefined ? config.pricingVisible : config.pricing_visible,
                    config.pricingCurrency || config.pricing_currency || null,
                    JSON.stringify(config.customPages || config.custom_pages || []), JSON.stringify(config.heroFeaturedImages || config.hero_featured_images || []), config.lockedOrganizationId || config.locked_organization_id || null
                ]
            );

            // Convert response to camelCase
            const camelConfig = convertRowToCamel(result.rows[0]);
            res.json({ config: camelConfig });
        } catch (error) {
            console.error('PUT universal landing page config error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/landing-page-config/:businessId
     * Get landing page configuration for a business
     */
    app.get('/api/landing-page-config/:businessId', async (req, res) => {
        try {
            const { businessId } = req.params;
            let config = await pool.query(
                `SELECT * FROM ${tables.LANDING_PAGE_CONFIG} WHERE business_id = $1`,
                [businessId]
            );

            if (config.rows.length === 0) {
                // Return default config
                config = {
                    businessId,
                    heroTitle: 'Welcome to OneApp',
                    heroSubtitle: 'Transform your data into insights',
                    heroVisible: true,
                    featuresTitle: 'Our Features',
                    featuresVisible: true,
                    carouselTitle: 'What Our Users Say',
                    carouselVisible: true,
                    ctaTitle: 'Ready to get started?',
                    ctaVisible: true
                };
            } else {
                config = convertRowToCamel(config.rows[0]);
            }

            res.json({ config });
        } catch (error) {
            console.error('GET landing page config error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/landing-page-config/:businessId
     * Update landing page configuration (super-admin/admin only)
     */
    app.put('/api/super-admin/landing-page-config/:businessId', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role, business_id FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { businessId } = req.params;
            const config = req.body;

            const result = await pool.query(
                `INSERT INTO ${tables.LANDING_PAGE_CONFIG} 
                 (business_id, hero_title, hero_subtitle, hero_image_url, hero_button_text, hero_button_link, hero_visible,
                  features_title, features_subtitle, features_data, features_visible,
                  carousel_title, carousel_items, carousel_visible,
                  cta_title, cta_subtitle, cta_button_text, cta_button_link, cta_visible,
                  demo_link, demo_label, footer_text, footer_links, logo_url, favicon_url, primary_color, secondary_color,
                 app_name, nav_background_color, nav_text_color, pricing_items, pricing_visible, pricing_currency, custom_pages, hero_featured_images, locked_organization_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
                 $28, $29, $30, $31, $32, $33, $34, $35, $36)
                 ON CONFLICT (business_id) 
                 DO UPDATE SET 
                    hero_title = $2, hero_subtitle = $3, hero_image_url = $4, hero_button_text = $5, hero_button_link = $6, hero_visible = $7,
                    features_title = $8, features_subtitle = $9, features_data = $10, features_visible = $11,
                    carousel_title = $12, carousel_items = $13, carousel_visible = $14,
                    cta_title = $15, cta_subtitle = $16, cta_button_text = $17, cta_button_link = $18, cta_visible = $19,
                    demo_link = $20, demo_label = $21, footer_text = $22, footer_links = $23, logo_url = $24, favicon_url = $25, 
                    primary_color = $26, secondary_color = $27,
                    app_name = $28, nav_background_color = $29, nav_text_color = $30, pricing_items = $31, pricing_visible = $32, pricing_currency = $33, custom_pages = $34, hero_featured_images = $35, locked_organization_id = $36, updated_at = NOW()
                 RETURNING *`,
                [
                    businessId,
                    config.heroTitle, config.heroSubtitle, config.heroImageUrl, config.heroButtonText, config.heroButtonLink, config.heroVisible,
                    config.featuresTitle, config.featuresSubtitle, JSON.stringify(config.featuresData), config.featuresVisible,
                    config.carouselTitle, JSON.stringify(config.carouselItems), config.carouselVisible,
                    config.ctaTitle, config.ctaSubtitle, config.ctaButtonText, config.ctaButtonLink, config.ctaVisible,
                    config.demoLink, config.demoLabel, config.footerText, JSON.stringify(config.footerLinks), config.logoUrl, config.faviconUrl,
                    config.primaryColor, config.secondaryColor,
                    config.appName || config.app_name || null,
                    config.navBackgroundColor || config.nav_background_color || null,
                    config.navTextColor || config.nav_text_color || null,
                    JSON.stringify(config.pricingItems || config.pricing_items || []), config.pricingVisible !== undefined ? config.pricingVisible : config.pricing_visible,
                    config.pricingCurrency || config.pricing_currency || null,
                    JSON.stringify(config.customPages || config.custom_pages || []), JSON.stringify(config.heroFeaturedImages || config.hero_featured_images || []), config.lockedOrganizationId || config.locked_organization_id || null
                ]
            );

            await createAuditLog(pool, businessId, req.session.userId, 'Updated', 'LandingPageConfig', businessId, null, result.rows[0], req);

            res.json({ config: result.rows[0] });
        } catch (error) {
            console.error('PUT landing page config error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================
    // FEEDBACK/CONTACT MESSAGE ROUTES
    // ============================================

    /**
     * POST /api/feedback
     * Submit feedback/contact message (public endpoint)
     */
    app.post('/api/feedback', async (req, res) => {
        try {
            const { businessId, senderName, senderEmail, senderPhone, subject, message, attachment } = req.body;

            if (!senderName || !senderEmail || !message) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const result = await pool.query(
                `INSERT INTO ${tables.FEEDBACK_MESSAGES} 
                 (business_id, sender_name, sender_email, sender_phone, subject, message, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [businessId || null, senderName, senderEmail, senderPhone, subject, message, 'New']
            );

            // Send notification email to admin
            const adminEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
            if (adminEmail) {
                await sendEmail(
                    adminEmail,
                    `New Feedback: ${subject || 'No subject'}`,
                    `<p><strong>From:</strong> ${senderName} (${senderEmail})</p>
                     <p><strong>Phone:</strong> ${senderPhone || 'Not provided'}</p>
                     <p><strong>Message:</strong></p>
                     <p>${message.replace(/\n/g, '<br>')}</p>`
                );
            }

            res.json({ message: 'Thank you for your feedback!', feedbackId: result.rows[0].id });
        } catch (error) {
            console.error('POST feedback error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/super-admin/feedback
     * Get feedback messages (admin only)
     */
    app.get('/api/super-admin/feedback', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const result = await pool.query(
                `SELECT * FROM ${tables.FEEDBACK_MESSAGES} ORDER BY created_at DESC LIMIT 500`
            );

            res.json({ messages: result.rows });
        } catch (error) {
            console.error('GET feedback error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/feedback/:feedbackId
     * Update feedback status
     */
    app.put('/api/super-admin/feedback/:feedbackId', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { feedbackId } = req.params;
            const { status, notes } = req.body;

            const result = await pool.query(
                `UPDATE ${tables.FEEDBACK_MESSAGES} 
                 SET status = $1, notes = $2, updated_at = NOW()
                 WHERE id = $3
                 RETURNING *`,
                [status, notes, feedbackId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Feedback not found' });
            }

            res.json({ message: result.rows[0] });
        } catch (error) {
            console.error('PUT feedback error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================
    // DEMO ACCOUNT ROUTES
    // ============================================

    /**
     * POST /api/auth/demo-login
     * Login with demo account (public endpoint)
     */
    app.post('/api/auth/demo-login', async (req, res) => {
        try {
            if (process.env.ALLOW_PUBLIC_DEMO_LINK !== 'true') {
                return res.status(403).json({ error: 'Demo access is disabled' });
            }

            const demoEmail = process.env.DEMO_ACCOUNT_EMAIL || 'demo@demo.com';
            const user = await pool.query(`SELECT * FROM ${tables.USERS} WHERE email = $1 AND is_demo_account = true`, [demoEmail]);

            if (user.rows.length === 0) {
                return res.status(404).json({ error: 'Demo account not available' });
            }

            req.session.userId = user.rows[0].id;
            req.session.businessId = user.rows[0].business_id || null;

            const safeUser = {
                id: user.rows[0].id,
                firstName: user.rows[0].first_name,
                lastName: user.rows[0].last_name,
                email: user.rows[0].email,
                role: user.rows[0].role,
                isDemoAccount: true,
                businessId: user.rows[0].business_id
            };

            res.json({ user: safeUser });
        } catch (error) {
            console.error('Demo login error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================
    // SUPER ADMIN DASHBOARD STATS
    // ============================================

    /**
     * GET /api/super-admin/stats
     * Get dashboard statistics
     */
    app.get('/api/super-admin/stats', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const stats = {};

            // Total businesses
            const businesses = await pool.query(`SELECT COUNT(*) as count FROM ${tables.BUSINESSES}`);
            stats.totalBusinesses = parseInt(businesses.rows[0].count);

            // Total users
            const users = await pool.query(`SELECT COUNT(*) as count FROM ${tables.USERS}`);
            stats.totalUsers = parseInt(users.rows[0].count);

            // Active users (last 30 days)
            const activeUsers = await pool.query(
                `SELECT COUNT(*) as count FROM ${tables.USERS} WHERE last_login_at > NOW() - INTERVAL \'30 days\'`
            );
            stats.activeUsers = parseInt(activeUsers.rows[0].count);

            // Pending user approvals
            const pending = await pool.query(
                `SELECT COUNT(*) as count FROM ${tables.USER_APPROVALS} WHERE status = \'Pending\'`
            );
            stats.pendingApprovals = parseInt(pending.rows[0].count);

            // New feedback (unreviewed)
            const feedback = await pool.query(
                `SELECT COUNT(*) as count FROM ${tables.FEEDBACK_MESSAGES} WHERE status = \'New\'`
            );
            stats.newFeedback = parseInt(feedback.rows[0].count);

            res.json(stats);
        } catch (error) {
            console.error('GET stats error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/super-admin/set-business-context/:businessId
     * Set the business context for the current super-admin session
     */
    app.post('/api/super-admin/set-business-context/:businessId', async (req, res) => {
        try {
            if (!req.session?.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const businessId = parseInt(req.params.businessId);
            
            // Verify business exists
            const business = await pool.query(`SELECT id FROM ${tables.BUSINESSES} WHERE id = $1`, [businessId]);
            if (business.rows.length === 0) {
                return res.status(404).json({ error: 'Business not found' });
            }

            // Set the business context in the session
            req.session.businessId = businessId;
            res.json({ success: true, businessId });
        } catch (error) {
            console.error('POST set-business-context error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ======================================
    // Plan Management Routes (Super Admin Only)
    // ======================================

    /**
     * GET /api/super-admin/plans
     * Retrieve all plans
     */
    app.get('/api/super-admin/plans', async (req, res) => {
        try {
            const userId = req.session?.userId;
            const user = await pool.query(
                `SELECT role FROM ${tables.USERS} WHERE id = $1`,
                [userId]
            );

            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const result = await pool.query(
                `SELECT id, name, description, max_programs_per_business, max_activities_per_program, 
                        max_users, features, price_monthly, status, created_at, updated_at
                 FROM ${tables.PLANS}
                 ORDER BY created_at DESC`
            );

            res.json(result.rows);
        } catch (error) {
            console.error('GET /api/super-admin/plans error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/super-admin/plans
     * Create a new plan
     */
    app.post('/api/super-admin/plans', async (req, res) => {
        try {
            const userId = req.session?.userId;
            const user = await pool.query(
                `SELECT role FROM ${tables.USERS} WHERE id = $1`,
                [userId]
            );

            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const {
                name,
                description,
                max_programs_per_business,
                max_activities_per_program,
                max_users,
                features,
                price_monthly,
                status
            } = req.body;

            const result = await pool.query(
                `INSERT INTO ${tables.PLANS} 
                 (name, description, max_programs_per_business, max_activities_per_program, max_users, 
                  features, price_monthly, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                 RETURNING id, name, description, max_programs_per_business, max_activities_per_program, 
                          max_users, features, price_monthly, status, created_at`,
                [
                    name,
                    description,
                    max_programs_per_business,
                    max_activities_per_program,
                    max_users,
                    JSON.stringify(features || {}),
                    price_monthly,
                    status || 'Active'
                ]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('POST /api/super-admin/plans error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/plans/:planId
     * Update an existing plan
     */
    app.put('/api/super-admin/plans/:planId', async (req, res) => {
        try {
            const userId = req.session?.userId;
            const user = await pool.query(
                `SELECT role FROM ${tables.USERS} WHERE id = $1`,
                [userId]
            );

            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const planId = parseInt(req.params.planId);
            const {
                name,
                description,
                max_programs_per_business,
                max_activities_per_program,
                max_users,
                features,
                price_monthly,
                status
            } = req.body;

            const result = await pool.query(
                `UPDATE ${tables.PLANS}
                 SET name = $1, description = $2, max_programs_per_business = $3, 
                     max_activities_per_program = $4, max_users = $5, features = $6, 
                     price_monthly = $7, status = $8, updated_at = NOW()
                 WHERE id = $9
                 RETURNING id, name, description, max_programs_per_business, max_activities_per_program, 
                          max_users, features, price_monthly, status, created_at, updated_at`,
                [
                    name,
                    description,
                    max_programs_per_business,
                    max_activities_per_program,
                    max_users,
                    JSON.stringify(features || {}),
                    price_monthly,
                    status,
                    planId
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('PUT /api/super-admin/plans/:planId error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/super-admin/plans/:planId
     * Delete a plan
     */
    app.delete('/api/super-admin/plans/:planId', async (req, res) => {
        try {
            const userId = req.session?.userId;
            const user = await pool.query(
                `SELECT role FROM ${tables.USERS} WHERE id = $1`,
                [userId]
            );

            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const planId = parseInt(req.params.planId);

            // Check if plan is in use
            const inUse = await pool.query(
                `SELECT COUNT(*) FROM ${tables.PLAN_ASSIGNMENTS} WHERE plan_id = $1 AND status = 'Active'`,
                [planId]
            );

            if (parseInt(inUse.rows[0].count) > 0) {
                return res.status(400).json({ error: 'Cannot delete plan in use. Reassign or deactivate businesses first.' });
            }

            await pool.query(
                `DELETE FROM ${tables.PLANS} WHERE id = $1`,
                [planId]
            );

            res.json({ success: true, message: 'Plan deleted' });
        } catch (error) {
            console.error('DELETE /api/super-admin/plans/:planId error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/super-admin/plan-assignments
     * Get all plan assignments with business and plan details
     */
    app.get('/api/super-admin/plan-assignments', async (req, res) => {
        try {
            const userId = req.session?.userId;
            const user = await pool.query(
                `SELECT role FROM ${tables.USERS} WHERE id = $1`,
                [userId]
            );

            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const result = await pool.query(
                `SELECT 
                    pa.id,
                    pa.business_id,
                    b.name as business_name,
                    pa.plan_id,
                    p.name as plan_name,
                    p.max_programs_per_business,
                    p.max_activities_per_program,
                    p.max_users,
                    pa.assigned_at,
                    pa.expires_at,
                    pa.status,
                    u.firstName as assigned_by_name
                 FROM ${tables.PLAN_ASSIGNMENTS} pa
                 JOIN ${tables.BUSINESSES} b ON pa.business_id = b.id
                 JOIN ${tables.PLANS} p ON pa.plan_id = p.id
                 LEFT JOIN ${tables.USERS} u ON pa.assigned_by = u.id
                 ORDER BY pa.created_at DESC`
            );

            res.json(result.rows);
        } catch (error) {
            console.error('GET /api/super-admin/plan-assignments error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/super-admin/plan-assignments
     * Assign a plan to a business
     */
    app.post('/api/super-admin/plan-assignments', async (req, res) => {
        try {
            const userId = req.session?.userId;
            const user = await pool.query(
                `SELECT role FROM ${tables.USERS} WHERE id = $1`,
                [userId]
            );

            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { business_id, plan_id, expires_at } = req.body;

            // Verify business exists
            const businessCheck = await pool.query(
                `SELECT id FROM ${tables.BUSINESSES} WHERE id = $1`,
                [business_id]
            );
            if (businessCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Business not found' });
            }

            // Verify plan exists
            const planCheck = await pool.query(
                `SELECT id FROM ${tables.PLANS} WHERE id = $1`,
                [plan_id]
            );
            if (planCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            // Deactivate any existing active plans for this business
            await pool.query(
                `UPDATE ${tables.PLAN_ASSIGNMENTS}
                 SET status = 'Cancelled', updated_at = NOW()
                 WHERE business_id = $1 AND status = 'Active'`,
                [business_id]
            );

            // Create new assignment
            const result = await pool.query(
                `INSERT INTO ${tables.PLAN_ASSIGNMENTS}
                 (business_id, plan_id, assigned_by, expires_at, status, created_at)
                 VALUES ($1, $2, $3, $4, 'Active', NOW())
                 RETURNING id, business_id, plan_id, assigned_at, expires_at, status`,
                [business_id, plan_id, userId, expires_at || null]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('POST /api/super-admin/plan-assignments error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/super-admin/plan-assignments/:assignmentId
     * Update a plan assignment
     */
    app.put('/api/super-admin/plan-assignments/:assignmentId', async (req, res) => {
        try {
            const userId = req.session?.userId;
            const user = await pool.query(
                `SELECT role FROM ${tables.USERS} WHERE id = $1`,
                [userId]
            );

            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const assignmentId = parseInt(req.params.assignmentId);
            const { plan_id, expires_at, status } = req.body;

            const result = await pool.query(
                `UPDATE ${tables.PLAN_ASSIGNMENTS}
                 SET plan_id = $1, expires_at = $2, status = $3, updated_at = NOW()
                 WHERE id = $4
                 RETURNING id, business_id, plan_id, assigned_at, expires_at, status`,
                [plan_id, expires_at || null, status, assignmentId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('PUT /api/super-admin/plan-assignments/:assignmentId error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/super-admin/business/:businessId/plan
     * Get current active plan for a business
     */
    app.get('/api/super-admin/business/:businessId/plan', async (req, res) => {
        try {
            const businessId = parseInt(req.params.businessId);

            const result = await pool.query(
                `SELECT 
                    pa.id,
                    pa.business_id,
                    pa.plan_id,
                    p.name,
                    p.max_programs_per_business,
                    p.max_activities_per_program,
                    p.max_users,
                    p.features,
                    pa.expires_at,
                    pa.status
                 FROM ${tables.PLAN_ASSIGNMENTS} pa
                 JOIN ${tables.PLANS} p ON pa.plan_id = p.id
                 WHERE pa.business_id = $1 AND pa.status = 'Active'
                 ORDER BY pa.assigned_at DESC
                 LIMIT 1`,
                [businessId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No active plan found for business' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('GET /api/super-admin/business/:businessId/plan error:', error);
            res.status(500).json({ error: error.message });
        }
    });
}

export { sendEmail, createAuditLog };

