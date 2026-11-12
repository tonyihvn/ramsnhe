// LanceDB Vector Service
// Handles embeddings, vector storage, and semantic search

import { v4 as uuidv4 } from 'uuid';
import { tables } from './tablePrefix.js';

// Mock vector database for now (would be replaced with actual LanceDB when library is available)
export class LanceDBService {
    constructor(pool) {
        this.pool = pool;
        this.vectorSize = parseInt(process.env.LANCEDB_VECTOR_SIZE || '384', 10);
        this.embeddingModel = process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
        this.vectors = new Map(); // In-memory vector store for demo
    }

    // Add vector to database
    async addVector(businessId, sourceType, sourceText, sourceMetadata, trainingSessionId = null) {
        try {
            const vectorId = `vec_${uuidv4()}`;
            
            // In real implementation, would call embedding service
            // For now, create a placeholder vector
            const mockVector = this.generateMockVector();
            
            // Store in database
            const res = await this.pool.query(
                `INSERT INTO ${tables.LANCE_VECTORS} 
                (business_id, vector_id, training_session_id, source_type, source_text, source_metadata, embedding_model, vector_dimensions) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING id, vector_id`,
                [
                    businessId,
                    vectorId,
                    trainingSessionId,
                    sourceType,
                    sourceText,
                    JSON.stringify(sourceMetadata || {}),
                    this.embeddingModel,
                    this.vectorSize
                ]
            );
            
            // Store in memory for quick access
            this.vectors.set(vectorId, {
                id: res.rows[0].id,
                vector: mockVector,
                sourceText,
                sourceType
            });
            
            console.log(`[Lance] ✅ Vector stored: ${vectorId}`);
            return { success: true, vectorId };
        } catch (error) {
            console.error('[Lance] Failed to add vector:', error);
            return { success: false, error: error.message };
        }
    }

    // Search similar vectors
    async searchVectors(businessId, queryText, topK = 5) {
        try {
            console.log(`[Lance] Searching vectors for: "${queryText}"`);
            
            // In real implementation, would use LanceDB vector search
            // For now, return top vectors by similarity
            const res = await this.pool.query(
                `SELECT id, vector_id, source_text, source_type, source_metadata, created_at 
                FROM ${tables.LANCE_VECTORS} 
                WHERE business_id = $1 
                LIMIT $2`,
                [businessId, topK]
            );
            
            return {
                success: true,
                results: res.rows,
                count: res.rows.length
            };
        } catch (error) {
            console.error('[Lance] Vector search failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Store conversation vectors for context
    async storeConversationContext(conversationId, userMessage, assistantResponse) {
        try {
            // Store both user and assistant messages as vectors for context retrieval
            const userVectorId = await this.addVector(
                null, // Will be filled from conversation
                'conversation',
                userMessage,
                { role: 'user', conversationId }
            );
            
            const assistantVectorId = await this.addVector(
                null,
                'conversation',
                assistantResponse,
                { role: 'assistant', conversationId }
            );
            
            return {
                success: true,
                userVectorId,
                assistantVectorId
            };
        } catch (error) {
            console.error('[Lance] Failed to store conversation context:', error);
            return { success: false, error: error.message };
        }
    }

    // Retrieve similar conversations for context window
    async retrieveContextWindow(conversationId, limit = 20) {
        try {
            const res = await this.pool.query(
                `SELECT id, message_role, message_content, created_at 
                FROM ${tables.CONVERSATION_MESSAGES} 
                WHERE conversation_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2`,
                [conversationId, limit]
            );
            
            return {
                success: true,
                messages: res.rows.reverse(), // Oldest first
                count: res.rows.length
            };
        } catch (error) {
            console.error('[Lance] Failed to retrieve context window:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate mock vector for demo purposes
    generateMockVector() {
        const vector = [];
        for (let i = 0; i < this.vectorSize; i++) {
            vector.push(Math.random());
        }
        return vector;
    }

    // Clean up old vectors
    async cleanupOldVectors(businessId, daysOld = 30) {
        try {
            const res = await this.pool.query(
                `DELETE FROM ${tables.LANCE_VECTORS} 
                WHERE business_id = $1 AND created_at < NOW() - INTERVAL '${daysOld} days'`,
                [businessId]
            );
            
            console.log(`[Lance] Cleaned up ${res.rowCount} old vectors`);
            return { success: true, deleted: res.rowCount };
        } catch (error) {
            console.error('[Lance] Cleanup failed:', error);
            return { success: false, error: error.message };
        }
    }
}

export default LanceDBService;
