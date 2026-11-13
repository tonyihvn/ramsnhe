/**
 * Training Records Management Routes
 * Handles CRUD operations for Vanna and Vercel training records
 * Also manages AI Context activities for learning
 */

import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../auth-middleware';

const router = express.Router();
const tablePrefix = process.env.TABLE_PREFIX || 'dqatb_';

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
});

// Middleware to attach businessId from user
router.use(requireAuth);

// ============================================================================
// VANNA TRAINING RECORDS - CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/training-records/vanna
 * List all Vanna training records
 */
router.get('/vanna', async (req: Request, res: Response) => {
    try {
        const { businessId } = req.query;
        const query = `
            SELECT * FROM ${tablePrefix}vanna_training_records
            WHERE business_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [businessId || (req as any).businessId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching Vanna records:', err);
        res.status(500).json({ error: 'Failed to fetch Vanna training records' });
    }
});

/**
 * POST /api/training-records/vanna
 * Create new Vanna training record
 */
router.post('/vanna', async (req: Request, res: Response) => {
    try {
        const { businessId, trainingType, title, content, metadata } = req.body;
        const createdBy = (req as any).user?.email || 'system';
        
        if (!trainingType || !title || !content) {
            return res.status(400).json({ error: 'trainingType, title, and content are required' });
        }
        
        const query = `
            INSERT INTO ${tablePrefix}vanna_training_records
            (business_id, training_type, title, content, metadata, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            businessId || (req as any).businessId,
            trainingType,
            title,
            content,
            JSON.stringify(metadata || {}),
            createdBy
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating Vanna record:', err);
        res.status(500).json({ error: 'Failed to create Vanna training record' });
    }
});

/**
 * PUT /api/training-records/vanna/:id
 * Update Vanna training record
 */
router.put('/vanna/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, metadata, trainingType } = req.body;
        
        const query = `
            UPDATE ${tablePrefix}vanna_training_records
            SET title = COALESCE($1, title),
                content = COALESCE($2, content),
                training_type = COALESCE($3, training_type),
                metadata = COALESCE($4, metadata),
                updated_at = NOW()
            WHERE id = $5 AND business_id = $6
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            title,
            content,
            trainingType,
            metadata ? JSON.stringify(metadata) : null,
            id,
            (req as any).businessId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Training record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating Vanna record:', err);
        res.status(500).json({ error: 'Failed to update Vanna training record' });
    }
});

/**
 * DELETE /api/training-records/vanna/:id
 * Soft delete Vanna training record
 */
router.delete('/vanna/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const query = `
            UPDATE ${tablePrefix}vanna_training_records
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND business_id = $2
            RETURNING *
        `;
        
        const result = await pool.query(query, [id, (req as any).businessId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Training record not found' });
        }
        
        res.json({ message: 'Training record deleted', id: id });
    } catch (err) {
        console.error('Error deleting Vanna record:', err);
        res.status(500).json({ error: 'Failed to delete Vanna training record' });
    }
});

// ============================================================================
// VERCEL TRAINING RECORDS - CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/training-records/vercel
 * List all Vercel training records
 */
router.get('/vercel', async (req: Request, res: Response) => {
    try {
        const { businessId } = req.query;
        const query = `
            SELECT * FROM ${tablePrefix}vercel_training_records
            WHERE business_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [businessId || (req as any).businessId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching Vercel records:', err);
        res.status(500).json({ error: 'Failed to fetch Vercel training records' });
    }
});

/**
 * POST /api/training-records/vercel
 * Create new Vercel training record
 */
router.post('/vercel', async (req: Request, res: Response) => {
    try {
        const { businessId, trainingType, title, content, modelConfig, metadata } = req.body;
        const createdBy = (req as any).user?.email || 'system';
        
        if (!trainingType || !title || !content) {
            return res.status(400).json({ error: 'trainingType, title, and content are required' });
        }
        
        const query = `
            INSERT INTO ${tablePrefix}vercel_training_records
            (business_id, training_type, title, content, model_config, metadata, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            businessId || (req as any).businessId,
            trainingType,
            title,
            content,
            JSON.stringify(modelConfig || {}),
            JSON.stringify(metadata || {}),
            createdBy
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating Vercel record:', err);
        res.status(500).json({ error: 'Failed to create Vercel training record' });
    }
});

/**
 * PUT /api/training-records/vercel/:id
 * Update Vercel training record
 */
router.put('/vercel/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, trainingType, modelConfig, metadata } = req.body;
        
        const query = `
            UPDATE ${tablePrefix}vercel_training_records
            SET title = COALESCE($1, title),
                content = COALESCE($2, content),
                training_type = COALESCE($3, training_type),
                model_config = COALESCE($4, model_config),
                metadata = COALESCE($5, metadata),
                updated_at = NOW()
            WHERE id = $6 AND business_id = $7
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            title,
            content,
            trainingType,
            modelConfig ? JSON.stringify(modelConfig) : null,
            metadata ? JSON.stringify(metadata) : null,
            id,
            (req as any).businessId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Training record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating Vercel record:', err);
        res.status(500).json({ error: 'Failed to update Vercel training record' });
    }
});

/**
 * DELETE /api/training-records/vercel/:id
 * Soft delete Vercel training record
 */
router.delete('/vercel/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const query = `
            UPDATE ${tablePrefix}vercel_training_records
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND business_id = $2
            RETURNING *
        `;
        
        const result = await pool.query(query, [id, (req as any).businessId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Training record not found' });
        }
        
        res.json({ message: 'Training record deleted', id: id });
    } catch (err) {
        console.error('Error deleting Vercel record:', err);
        res.status(500).json({ error: 'Failed to delete Vercel training record' });
    }
});

// ============================================================================
// AI CONTEXT ACTIVITIES - CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/training-records/ai-context
 * List all AI Context activities
 */
router.get('/ai-context', async (req: Request, res: Response) => {
    try {
        const { businessId } = req.query;
        const query = `
            SELECT * FROM ${tablePrefix}ai_context_activities
            WHERE business_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [businessId || (req as any).businessId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching AI Context activities:', err);
        res.status(500).json({ error: 'Failed to fetch AI Context activities' });
    }
});

/**
 * POST /api/training-records/ai-context
 * Create new AI Context activity
 */
router.post('/ai-context', async (req: Request, res: Response) => {
    try {
        const { businessId, activityType, question, response, feedbackScore, feedbackText, contextTags } = req.body;
        const createdBy = (req as any).user?.email || 'system';
        
        if (!question || !response) {
            return res.status(400).json({ error: 'question and response are required' });
        }
        
        const query = `
            INSERT INTO ${tablePrefix}ai_context_activities
            (business_id, activity_type, question, response, feedback_score, feedback_text, context_tags, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            businessId || (req as any).businessId,
            activityType || 'QUESTION_RESPONSE',
            question,
            response,
            feedbackScore || null,
            feedbackText || null,
            contextTags ? JSON.stringify(contextTags) : null,
            createdBy
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating AI Context activity:', err);
        res.status(500).json({ error: 'Failed to create AI Context activity' });
    }
});

/**
 * PUT /api/training-records/ai-context/:id
 * Update AI Context activity
 */
router.put('/ai-context/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { question, response, feedbackScore, feedbackText, contextTags, activityType } = req.body;
        
        const query = `
            UPDATE ${tablePrefix}ai_context_activities
            SET question = COALESCE($1, question),
                response = COALESCE($2, response),
                activity_type = COALESCE($3, activity_type),
                feedback_score = COALESCE($4, feedback_score),
                feedback_text = COALESCE($5, feedback_text),
                context_tags = COALESCE($6, context_tags),
                updated_at = NOW()
            WHERE id = $7 AND business_id = $8
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            question,
            response,
            activityType,
            feedbackScore,
            feedbackText,
            contextTags ? JSON.stringify(contextTags) : null,
            id,
            (req as any).businessId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating AI Context activity:', err);
        res.status(500).json({ error: 'Failed to update AI Context activity' });
    }
});

/**
 * DELETE /api/training-records/ai-context/:id
 * Soft delete AI Context activity
 */
router.delete('/ai-context/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const query = `
            UPDATE ${tablePrefix}ai_context_activities
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND business_id = $2
            RETURNING *
        `;
        
        const result = await pool.query(query, [id, (req as any).businessId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        res.json({ message: 'Activity deleted', id: id });
    } catch (err) {
        console.error('Error deleting AI Context activity:', err);
        res.status(500).json({ error: 'Failed to delete AI Context activity' });
    }
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * POST /api/training-records/vanna/retrain
 * Trigger retraining with selected records
 */
router.post('/vanna/retrain', async (req: Request, res: Response) => {
    try {
        const { businessId, recordIds } = req.body;
        const createdBy = (req as any).user?.email || 'system';
        
        if (!recordIds || !Array.isArray(recordIds)) {
            return res.status(400).json({ error: 'recordIds array is required' });
        }
        
        // Fetch records
        const query = `
            SELECT * FROM ${tablePrefix}vanna_training_records
            WHERE id = ANY($1) AND business_id = $2 AND is_active = true
        `;
        const result = await pool.query(query, [recordIds, businessId || (req as any).businessId]);
        
        // Log training history
        const historyQuery = `
            INSERT INTO ${tablePrefix}provider_training_history
            (business_id, provider_type, action, record_ids, status, started_at, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW())
            RETURNING *
        `;
        
        const historyResult = await pool.query(historyQuery, [
            businessId || (req as any).businessId,
            'vanna',
            'RETRAIN',
            JSON.stringify(recordIds),
            'success',
            createdBy
        ]);
        
        res.json({
            message: 'Retraining initiated',
            recordsUsed: result.rows.length,
            trainingHistory: historyResult.rows[0]
        });
    } catch (err) {
        console.error('Error retraining:', err);
        res.status(500).json({ error: 'Failed to initiate retraining' });
    }
});

/**
 * GET /api/training-records/history
 * Get training history for all providers
 */
router.get('/history', async (req: Request, res: Response) => {
    try {
        const { businessId } = req.query;
        const query = `
            SELECT * FROM ${tablePrefix}provider_training_history
            WHERE business_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `;
        const result = await pool.query(query, [businessId || (req as any).businessId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching training history:', err);
        res.status(500).json({ error: 'Failed to fetch training history' });
    }
});

export default router;
