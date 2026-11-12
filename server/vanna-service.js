// Vanna.AI Integration Service
// Handles SQL generation, training, and vector storage

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { tables } from './tablePrefix.js';

export class VannaService {
    constructor(pool) {
        this.pool = pool;
        this.vannaApiUrl = process.env.VANNA_API_URL || 'http://localhost:8000';
        this.vannaApiKey = process.env.VANNA_API_KEY || '';
    }

    // Train Vanna with DDL (database schema)
    async trainVannaOnDDL(businessId, sessionName, ddlSql) {
        try {
            console.log(`[Vanna] Training on DDL for business ${businessId}`);
            
            // Create training session record
            const sessionRes = await this.pool.query(
                `INSERT INTO ${tables.VANNA_TRAINING_SESSIONS} 
                (business_id, session_name, database_type, ddl_sql, status) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING id, created_at`,
                [businessId, sessionName, 'postgresql', ddlSql, 'in_progress']
            );
            
            const sessionId = sessionRes.rows[0].id;
            
            try {
                // Call Vanna API to train on DDL
                const trainResponse = await axios.post(
                    `${this.vannaApiUrl}/api/v1/train/ddl`,
                    { ddl: ddlSql },
                    { 
                        headers: { 
                            'Authorization': `Bearer ${this.vannaApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
                
                // Extract trained tables from DDL
                const trainedTables = this.extractTableNames(ddlSql);
                
                // Mark as completed
                await this.pool.query(
                    `UPDATE ${tables.VANNA_TRAINING_SESSIONS} 
                    SET status = $1, trained_on_tables = $2, vector_count = $3, completed_at = NOW() 
                    WHERE id = $4`,
                    ['completed', JSON.stringify(trainedTables), trainedTables.length, sessionId]
                );
                
                console.log(`[Vanna] ✅ Training completed for session ${sessionId}`);
                return { success: true, sessionId, trainedTables };
            } catch (error) {
                // Update status to failed
                await this.pool.query(
                    `UPDATE ${tables.VANNA_TRAINING_SESSIONS} 
                    SET status = $1, error_message = $2, completed_at = NOW() 
                    WHERE id = $3`,
                    ['failed', error.message, sessionId]
                );
                
                throw error;
            }
        } catch (error) {
            console.error('[Vanna] Training failed:', error);
            throw error;
        }
    }

    // Generate SQL from natural language query
    async generateSQL(businessId, query, context = '') {
        try {
            console.log(`[Vanna] Generating SQL for query: "${query}"`);
            
            const sqlResponse = await axios.post(
                `${this.vannaApiUrl}/api/v1/generate/sql`,
                { 
                    question: query,
                    context: context
                },
                { 
                    headers: { 
                        'Authorization': `Bearer ${this.vannaApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );
            
            const generatedSql = sqlResponse.data.sql;
            console.log(`[Vanna] Generated SQL: ${generatedSql}`);
            
            return {
                success: true,
                sql: generatedSql,
                confidence: sqlResponse.data.confidence || 0.8
            };
        } catch (error) {
            console.error('[Vanna] SQL generation failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Execute SQL and get results
    async executeSQL(businessId, sql) {
        try {
            console.log(`[Vanna] Executing SQL query`);
            
            const result = await this.pool.query(sql);
            
            return {
                success: true,
                data: result.rows,
                rowCount: result.rows.length
            };
        } catch (error) {
            console.error('[Vanna] SQL execution failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Extract table names from DDL
    extractTableNames(ddlSql) {
        const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?/gi;
        const tables = [];
        let match;
        
        while ((match = tableRegex.exec(ddlSql)) !== null) {
            tables.push(match[1]);
        }
        
        return tables;
    }

    // Get active prompt context
    async getActivePromptContext(businessId) {
        try {
            const res = await this.pool.query(
                `SELECT * FROM ${tables.PROMPT_CONTEXTS} 
                WHERE business_id = $1 AND is_active = true 
                LIMIT 1`,
                [businessId]
            );
            
            return res.rows[0] || null;
        } catch (error) {
            console.error('[Vanna] Failed to fetch prompt context:', error);
            return null;
        }
    }

    // Log AI activity
    async logActivity(businessId, userId, conversationId, actionType, details, status, errorMessage = null) {
        try {
            await this.pool.query(
                `INSERT INTO ${tables.AI_ACTIVITY_LOGS} 
                (business_id, user_id, conversation_id, action_type, action_details, status, error_message, processing_time_ms) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    businessId,
                    userId,
                    conversationId,
                    actionType,
                    JSON.stringify(details),
                    status,
                    errorMessage,
                    details.processing_time_ms || 0
                ]
            );
        } catch (error) {
            console.error('[Vanna] Failed to log activity:', error);
        }
    }
}

export default VannaService;
