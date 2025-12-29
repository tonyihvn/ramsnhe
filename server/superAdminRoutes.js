/**
 * Super Admin and Multi-Tenancy API Routes
 * Handles business management, user approvals, landing page configuration, and feedback
 */

import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';

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
            `INSERT INTO dqai_audit_logs (business_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
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

            const user = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const result = await pool.query('SELECT * FROM dqai_businesses ORDER BY created_at DESC');
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

            const user = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { name, phone, email, address, website, settings } = req.body;
            
            const result = await pool.query(
                `INSERT INTO dqai_businesses (name, phone, email, address, website, settings)
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

            const user = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { businessId } = req.params;
            const { name, phone, email, address, website, status, settings } = req.body;

            const old = await pool.query('SELECT * FROM dqai_businesses WHERE id = $1', [businessId]);
            
            const result = await pool.query(
                `UPDATE dqai_businesses 
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

            const user = await pool.query('SELECT role, business_id FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (user.rows.length === 0) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            let query = 'SELECT id, first_name, last_name, email, role, status, business_id, created_at, last_login_at, account_type, is_demo_account FROM dqai_users WHERE 1=1';
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
            const currentUser = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            
            if (currentUser.rows.length === 0 || !isSuperAdminRole(currentUser.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const user = await pool.query('SELECT * FROM dqai_users WHERE id = $1', [userId]);
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

            const currentUser = await pool.query('SELECT role, business_id FROM dqai_users WHERE id = $1', [req.session.userId]);
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
            const exists = await pool.query('SELECT id FROM dqai_users WHERE email = $1', [email]);
            if (exists.rows.length > 0) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            // Create temporary password
            const tempPassword = Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            const result = await pool.query(
                `INSERT INTO dqai_users (first_name, last_name, email, password, role, status, business_id, account_type)
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

            const currentUser = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { userId } = req.params;
            const result = await pool.query(
                `UPDATE dqai_users 
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

            const currentUser = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { userId } = req.params;
            const result = await pool.query(
                `UPDATE dqai_users 
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

            const currentUser = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { userId } = req.params;
            const { role } = req.body;

            const old = await pool.query('SELECT * FROM dqai_users WHERE id = $1', [userId]);
            const result = await pool.query(
                'UPDATE dqai_users SET role = $1 WHERE id = $2 RETURNING *',
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
     * GET /api/landing-page-config/:businessId
     * Get landing page configuration for a business
     */
    app.get('/api/landing-page-config/:businessId', async (req, res) => {
        try {
            const { businessId } = req.params;
            let config = await pool.query(
                'SELECT * FROM dqai_landing_page_config WHERE business_id = $1',
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
                config = config.rows[0];
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

            const currentUser = await pool.query('SELECT role, business_id FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { businessId } = req.params;
            const config = req.body;

            const result = await pool.query(
                `INSERT INTO dqai_landing_page_config 
                 (business_id, hero_title, hero_subtitle, hero_image_url, hero_button_text, hero_button_link, hero_visible,
                  features_title, features_subtitle, features_data, features_visible,
                  carousel_title, carousel_items, carousel_visible,
                  cta_title, cta_subtitle, cta_button_text, cta_button_link, cta_visible,
                  demo_link, demo_label, footer_text, footer_links, logo_url, favicon_url, primary_color, secondary_color)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
                 ON CONFLICT (business_id) 
                 DO UPDATE SET 
                    hero_title = $2, hero_subtitle = $3, hero_image_url = $4, hero_button_text = $5, hero_button_link = $6, hero_visible = $7,
                    features_title = $8, features_subtitle = $9, features_data = $10, features_visible = $11,
                    carousel_title = $12, carousel_items = $13, carousel_visible = $14,
                    cta_title = $15, cta_subtitle = $16, cta_button_text = $17, cta_button_link = $18, cta_visible = $19,
                    demo_link = $20, demo_label = $21, footer_text = $22, footer_links = $23, logo_url = $24, favicon_url = $25, 
                    primary_color = $26, secondary_color = $27, updated_at = NOW()
                 RETURNING *`,
                [
                    businessId,
                    config.heroTitle, config.heroSubtitle, config.heroImageUrl, config.heroButtonText, config.heroButtonLink, config.heroVisible,
                    config.featuresTitle, config.featuresSubtitle, JSON.stringify(config.featuresData), config.featuresVisible,
                    config.carouselTitle, JSON.stringify(config.carouselItems), config.carouselVisible,
                    config.ctaTitle, config.ctaSubtitle, config.ctaButtonText, config.ctaButtonLink, config.ctaVisible,
                    config.demoLink, config.demoLabel, config.footerText, JSON.stringify(config.footerLinks), config.logoUrl, config.faviconUrl,
                    config.primaryColor, config.secondaryColor
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
                `INSERT INTO dqai_feedback_messages 
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

            const currentUser = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const result = await pool.query(
                'SELECT * FROM dqai_feedback_messages ORDER BY created_at DESC LIMIT 500'
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

            const currentUser = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { feedbackId } = req.params;
            const { status, notes } = req.body;

            const result = await pool.query(
                `UPDATE dqai_feedback_messages 
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
            const user = await pool.query('SELECT * FROM dqai_users WHERE email = $1 AND is_demo_account = true', [demoEmail]);

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

            const currentUser = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (currentUser.rows.length === 0 || (!isSuperAdminRole(currentUser.rows[0].role) && !isAdminRole(currentUser.rows[0].role))) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const stats = {};

            // Total businesses
            const businesses = await pool.query('SELECT COUNT(*) as count FROM dqai_businesses');
            stats.totalBusinesses = parseInt(businesses.rows[0].count);

            // Total users
            const users = await pool.query('SELECT COUNT(*) as count FROM dqai_users');
            stats.totalUsers = parseInt(users.rows[0].count);

            // Active users (last 30 days)
            const activeUsers = await pool.query(
                'SELECT COUNT(*) as count FROM dqai_users WHERE last_login_at > NOW() - INTERVAL \'30 days\''
            );
            stats.activeUsers = parseInt(activeUsers.rows[0].count);

            // Pending user approvals
            const pending = await pool.query(
                'SELECT COUNT(*) as count FROM dqai_user_approvals WHERE status = \'Pending\''
            );
            stats.pendingApprovals = parseInt(pending.rows[0].count);

            // New feedback (unreviewed)
            const feedback = await pool.query(
                'SELECT COUNT(*) as count FROM dqai_feedback_messages WHERE status = \'New\''
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

            const user = await pool.query('SELECT role FROM dqai_users WHERE id = $1', [req.session.userId]);
            if (user.rows.length === 0 || !isSuperAdminRole(user.rows[0].role)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const businessId = parseInt(req.params.businessId);
            
            // Verify business exists
            const business = await pool.query('SELECT id FROM dqai_businesses WHERE id = $1', [businessId]);
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
}

export { sendEmail, createAuditLog };
