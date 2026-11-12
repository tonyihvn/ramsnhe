// Vanna.AI API Routes
// Handles all Vanna.AI, LanceDB, and AI conversation endpoints

import express from 'express';
import { VannaService } from './vanna-service.js';
import { LanceDBService } from './lancedb-service.js';
import { LLMContextService } from './llm-context-service.js';
import { tables } from './tablePrefix.js';
import { v4 as uuidv4 } from 'uuid';

export function registerVannaRoutes(app, pool) {
    const vannaService = new VannaService(pool);
    const lanceService = new LanceDBService(pool);
    const llmService = new LLMContextService(pool);

    // Middleware to check if user is admin
    const requireAdmin = (req, res, next) => {
        const role = req.session?.role;
        if (!role || (role !== 'admin' && role !== 'super-admin' && role !== 'super_admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    };

    // ============ Prompt Context CRUD ============
    
    // Get all prompt contexts for business
    app.get('/api/vanna/prompt-contexts', async (req, res) => {
        try {
            const businessId = req.session?.business_id;
            if (!businessId) return res.status(401).json({ error: 'Business ID not found' });

            const result = await pool.query(
                `SELECT id, name, description, context_text, is_active, created_at, created_by 
                FROM ${tables.PROMPT_CONTEXTS} 
                WHERE business_id = $1 
                ORDER BY created_at DESC`,
                [businessId]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('[API] Get prompt contexts error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Create prompt context
    app.post('/api/vanna/prompt-contexts', requireAdmin, async (req, res) => {
        try {
            const businessId = req.session?.business_id;
            const userId = req.session?.user_id;
            const { name, description, contextText } = req.body;

            if (!name || !contextText) {
                return res.status(400).json({ error: 'Name and context text are required' });
            }

            const result = await pool.query(
                `INSERT INTO ${tables.PROMPT_CONTEXTS} 
                (business_id, name, description, context_text, is_active, created_by) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING id, name, description, context_text, is_active, created_at`,
                [businessId, name, description, contextText, true, userId]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('[API] Create prompt context error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Update prompt context
    app.put('/api/vanna/prompt-contexts/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const businessId = req.session?.business_id;
            const { name, description, contextText, isActive } = req.body;

            const result = await pool.query(
                `UPDATE ${tables.PROMPT_CONTEXTS} 
                SET name = $1, description = $2, context_text = $3, is_active = $4, updated_at = NOW() 
                WHERE id = $5 AND business_id = $6 
                RETURNING id, name, description, context_text, is_active, updated_at`,
                [name, description, contextText, isActive, id, businessId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Prompt context not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('[API] Update prompt context error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Delete prompt context
    app.delete('/api/vanna/prompt-contexts/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const businessId = req.session?.business_id;

            const result = await pool.query(
                `DELETE FROM ${tables.PROMPT_CONTEXTS} 
                WHERE id = $1 AND business_id = $2 
                RETURNING id`,
                [id, businessId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Prompt context not found' });
            }

            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            console.error('[API] Delete prompt context error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============ Vanna Training ============

    // Train Vanna on DDL
    app.post('/api/vanna/train', requireAdmin, async (req, res) => {
        try {
            const businessId = req.session?.business_id;
            const { sessionName, ddlSql } = req.body;

            if (!sessionName || !ddlSql) {
                return res.status(400).json({ error: 'Session name and DDL SQL are required' });
            }

            const result = await vannaService.trainVannaOnDDL(businessId, sessionName, ddlSql);
            
            res.status(201).json(result);
        } catch (error) {
            console.error('[API] Train Vanna error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Get training sessions
    app.get('/api/vanna/training-sessions', async (req, res) => {
        try {
            const businessId = req.session?.business_id;

            const result = await pool.query(
                `SELECT id, session_name, database_type, status, vector_count, created_at, completed_at, error_message 
                FROM ${tables.VANNA_TRAINING_SESSIONS} 
                WHERE business_id = $1 
                ORDER BY created_at DESC`,
                [businessId]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('[API] Get training sessions error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============ AI Conversations ============

    // Create or get conversation session
    app.post('/api/vanna/conversations', async (req, res) => {
        try {
            const businessId = req.session?.business_id;
            const userId = req.session?.user_id;
            const { activityId } = req.body;

            const sessionKey = `session_${uuidv4()}`;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const result = await pool.query(
                `INSERT INTO ${tables.AI_CONVERSATIONS} 
                (business_id, session_key, activity_id, user_id, status, expires_at) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING id, session_key, activity_id, user_id, status, created_at`,
                [businessId, sessionKey, activityId, userId, 'active', expiresAt]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('[API] Create conversation error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Send message in conversation
    app.post('/api/vanna/conversations/:conversationId/messages', async (req, res) => {
        try {
            const businessId = req.session?.business_id;
            const userId = req.session?.user_id;
            const { conversationId } = req.params;
            const { message, promptContextId } = req.body;

            if (!message) {
                return res.status(400).json({ error: 'Message is required' });
            }

            // Store user message
            const userMsgRes = await pool.query(
                `INSERT INTO ${tables.CONVERSATION_MESSAGES} 
                (conversation_id, message_role, message_content) 
                VALUES ($1, $2, $3) 
                RETURNING id, created_at`,
                [conversationId, 'user', message]
            );

            const startTime = Date.now();

            try {
                // Generate SQL from user message
                let generatedSql = null;
                let sqlResults = null;
                let chartData = null;
                let chartType = null;

                const promptContext = promptContextId 
                    ? await vannaService.getActivePromptContext(businessId)
                    : null;

                // Try to generate SQL
                const sqlGenResult = await vannaService.generateSQL(businessId, message, promptContext?.context_text || '');
                
                if (sqlGenResult.success) {
                    generatedSql = sqlGenResult.sql;
                    
                    // Execute the generated SQL
                    const execResult = await vannaService.executeSQL(businessId, generatedSql);
                    if (execResult.success) {
                        sqlResults = execResult.data;
                    }
                }

                // Get conversation history for context
                const contextRes = await lanceService.retrieveContextWindow(conversationId, 10);
                const conversationHistory = contextRes.results || [];

                // Assemble context and generate insights
                const fullContext = await llmService.assemblePromptContext(
                    businessId,
                    promptContextId,
                    sqlResults || [],
                    conversationHistory
                );

                // Call LLM for insights
                const llmResult = await llmService.callLLM(
                    businessId,
                    message,
                    fullContext,
                    'You are a data analysis assistant. Provide clear insights from the data.'
                );

                let assistantContent = llmResult.response;
                let analysisData = null;

                if (llmResult.success) {
                    analysisData = {
                        insights: llmResult.response,
                        dataPoints: sqlResults?.length || 0,
                        sql: generatedSql
                    };
                }

                // Prepare response for simple chart (if data available)
                if (sqlResults && sqlResults.length > 0) {
                    // Try to detect numeric columns for charting
                    const firstRow = sqlResults[0];
                    const numericCols = Object.keys(firstRow).filter(k => typeof firstRow[k] === 'number');
                    
                    if (numericCols.length > 0) {
                        chartType = 'bar'; // Default chart type
                        chartData = {
                            labels: sqlResults.map((r, i) => `Item ${i + 1}`),
                            datasets: numericCols.map(col => ({
                                label: col,
                                data: sqlResults.map(r => r[col])
                            }))
                        };
                    }
                }

                // Store assistant message with analysis
                const assistantMsgRes = await pool.query(
                    `INSERT INTO ${tables.CONVERSATION_MESSAGES} 
                    (conversation_id, message_role, message_content, vanna_sql_generated, llm_analysis, chart_data, chart_type) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7) 
                    RETURNING id, message_role, message_content, chart_data, chart_type, created_at`,
                    [
                        conversationId,
                        'assistant',
                        assistantContent,
                        generatedSql,
                        JSON.stringify(analysisData),
                        JSON.stringify(chartData),
                        chartType
                    ]
                );

                // Log activity
                const processingTime = Date.now() - startTime;
                await vannaService.logActivity(
                    businessId,
                    userId,
                    conversationId,
                    'vanna_query',
                    { message, sqlGenerated: !!generatedSql, processing_time_ms: processingTime },
                    'success'
                );

                res.status(201).json({
                    userMessage: userMsgRes.rows[0],
                    assistantMessage: assistantMsgRes.rows[0],
                    processingTime
                });
            } catch (error) {
                console.error('[API] Error processing message:', error);
                
                // Store error message
                const errorMsgRes = await pool.query(
                    `INSERT INTO ${tables.CONVERSATION_MESSAGES} 
                    (conversation_id, message_role, message_content) 
                    VALUES ($1, $2, $3) 
                    RETURNING id, created_at`,
                    [conversationId, 'assistant', `Error: ${error.message}`]
                );

                res.status(201).json({
                    userMessage: userMsgRes.rows[0],
                    assistantMessage: errorMsgRes.rows[0],
                    error: error.message
                });
            }
        } catch (error) {
            console.error('[API] Send message error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Get conversation messages
    app.get('/api/vanna/conversations/:conversationId/messages', async (req, res) => {
        try {
            const { conversationId } = req.params;

            const result = await pool.query(
                `SELECT id, message_role, message_content, vanna_sql_generated, llm_analysis, chart_data, chart_type, created_at 
                FROM ${tables.CONVERSATION_MESSAGES} 
                WHERE conversation_id = $1 
                ORDER BY created_at ASC`,
                [conversationId]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('[API] Get conversation messages error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============ LLM Settings ============

    // Get LLM settings
    app.get('/api/vanna/llm-settings', async (req, res) => {
        try {
            const businessId = req.session?.business_id;

            const result = await pool.query(
                `SELECT id, provider, model_name, temperature, max_tokens, is_active 
                FROM ${tables.LLM_SETTINGS} 
                WHERE business_id = $1`,
                [businessId]
            );

            res.json(result.rows[0] || null);
        } catch (error) {
            console.error('[API] Get LLM settings error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Save LLM settings
    app.post('/api/vanna/llm-settings', requireAdmin, async (req, res) => {
        try {
            const businessId = req.session?.business_id;
            const { provider, apiKey, modelName, temperature, maxTokens } = req.body;

            const result = await llmService.saveLLMSettings(
                businessId,
                provider,
                apiKey,
                modelName,
                null,
                temperature,
                maxTokens
            );

            if (result.success) {
                res.status(201).json({ message: 'LLM settings saved successfully' });
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (error) {
            console.error('[API] Save LLM settings error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    console.log('✅ Vanna.AI routes registered');
}

export default registerVannaRoutes;
