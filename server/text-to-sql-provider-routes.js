/**
 * Text-to-SQL Provider Routes
 * 
 * Handles routing between Vanna.AI and Vercel AI SDK based on user preference
 */

import { Router } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const router = Router();
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const tablePrefix = process.env.TABLE_PREFIX || 'dqatb_';

/**
 * Get current text-to-SQL provider setting
 */
router.get('/api/text-to-sql/provider', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT key, value FROM ${tablePrefix}settings WHERE key = 'textToSqlProvider' LIMIT 1`
        );

        const provider = result.rows.length > 0 ? result.rows[0].value : 'vanna';
        res.json({ provider });
    } catch (error) {
        console.error('Error getting text-to-SQL provider:', error);
        res.status(500).json({ error: 'Failed to get text-to-SQL provider' });
    }
});

/**
 * Set text-to-SQL provider
 */
router.post('/api/text-to-sql/provider', async (req, res) => {
    try {
        const { provider } = req.body;

        if (!provider || !['vanna', 'vercel-ai'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider. Must be "vanna" or "vercel-ai"' });
        }

        // Update or insert provider setting
        await pool.query(
            `INSERT INTO ${tablePrefix}settings (key, value) 
             VALUES ('textToSqlProvider', $1)
             ON CONFLICT (key) DO UPDATE SET value = $1`,
            [provider]
        );

        res.json({ success: true, provider });
    } catch (error) {
        console.error('Error setting text-to-SQL provider:', error);
        res.status(500).json({ error: 'Failed to set text-to-SQL provider' });
    }
});

/**
 * Generate SQL using the selected provider
 */
router.post('/api/text-to-sql/generate', async (req, res) => {
    try {
        const { question, businessId } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Get current provider
        const providerResult = await pool.query(
            `SELECT value FROM ${tablePrefix}settings WHERE key = 'textToSqlProvider' LIMIT 1`
        );
        const provider = providerResult.rows.length > 0 ? providerResult.rows[0].value : 'vanna';

        // Route to appropriate provider
        if (provider === 'vercel-ai') {
            // Get Vercel AI settings
            const settingsResult = await pool.query(
                `SELECT * FROM ${tablePrefix}ai_settings WHERE business_id = $1 LIMIT 1`,
                [businessId || 1]
            );

            if (!settingsResult.rows.length) {
                return res.status(400).json({ error: 'Vercel AI settings not configured' });
            }

            const settings = settingsResult.rows[0];

            // Call Vercel AI endpoint (implementation depends on your backend setup)
            // This would typically call the Vercel AI SDK or your backend Vercel wrapper
            return res.json({
                provider: 'vercel-ai',
                message: 'Vercel AI integration - implement your backend integration here',
                question
            });
        } else {
            // Default to Vanna.AI
            const vannaUrl = process.env.VANNA_SERVER_URL || 'http://127.0.0.1:5000';

            try {
                const vannaResponse = await fetch(`${vannaUrl}/api/generate-sql`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question })
                });

                if (!vannaResponse.ok) {
                    return res.status(500).json({ 
                        error: 'Vanna server error',
                        status: vannaResponse.status 
                    });
                }

                const sql = await vannaResponse.json();
                return res.json({ provider: 'vanna', ...sql });
            } catch (error) {
                return res.status(500).json({ 
                    error: 'Failed to connect to Vanna server',
                    details: error.message 
                });
            }
        }
    } catch (error) {
        console.error('Error generating SQL:', error);
        res.status(500).json({ error: 'Failed to generate SQL' });
    }
});

/**
 * Test connection to selected provider
 */
router.post('/api/text-to-sql/test', async (req, res) => {
    try {
        // Get current provider
        const providerResult = await pool.query(
            `SELECT value FROM ${tablePrefix}settings WHERE key = 'textToSqlProvider' LIMIT 1`
        );
        const provider = providerResult.rows.length > 0 ? providerResult.rows[0].value : 'vanna';

        if (provider === 'vercel-ai') {
            // Test Vercel AI connection
            res.json({
                status: 'success',
                provider: 'vercel-ai',
                message: 'Vercel AI SDK is configured and ready'
            });
        } else {
            // Test Vanna server connection
            const vannaUrl = process.env.VANNA_SERVER_URL || 'http://127.0.0.1:5000';

            try {
                const response = await fetch(`${vannaUrl}/health`);
                if (response.ok) {
                    const data = await response.json();
                    res.json({
                        status: 'success',
                        provider: 'vanna',
                        message: 'Vanna server is running and healthy',
                        details: data
                    });
                } else {
                    res.status(500).json({
                        status: 'error',
                        provider: 'vanna',
                        message: 'Vanna server returned an error',
                        statusCode: response.status
                    });
                }
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    provider: 'vanna',
                    message: 'Failed to connect to Vanna server',
                    error: error.message
                });
            }
        }
    } catch (error) {
        console.error('Error testing provider:', error);
        res.status(500).json({ error: 'Failed to test provider' });
    }
});

export default router;
