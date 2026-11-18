/**
 * Voice Capture Routes
 * Handles: Recording metadata, transcription, LLM extraction, media library
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const tablePrefix = process.env.TABLE_PREFIX || 'dqatb_';

// Middleware: Check authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Middleware: Extract business_id from authenticated user
router.use(requireAuth);

const getBusinessId = (req) => req.user?.business_id || req.body?.business_id;

// Helper: Get pool from app locals
const getPool = (req) => req.app.locals.pool;

const ensureVoiceGuidelinesTable = async (req) => {
    await getPool(req).query(`
        CREATE TABLE IF NOT EXISTS ${tablePrefix}form_voice_guidelines (
            id SERIAL PRIMARY KEY,
            business_id INTEGER,
            form_id INTEGER NOT NULL,
            is_enabled BOOLEAN DEFAULT FALSE,
            ai_guide_text TEXT,
            interviewer_guide_text TEXT,
            extraction_prompt_override TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (business_id, form_id)
        )
    `);
};

// ============================================================================
// SPEECH-TO-TEXT SERVICE CONFIGURATION
// ============================================================================

/**
 * Get all speech-to-text service configurations
 * GET /api/voice-capture/speech-services
 */
router.get('/speech-services', async (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const result = await getPool(req).query(
            `SELECT id, provider, is_active, configuration, priority_order, 
                    last_tested_at, test_status 
             FROM ${tablePrefix}speech_to_text_configs 
             WHERE business_id = $1 
             ORDER BY priority_order ASC`,
            [businessId]
        );

        res.json({
            success: true,
            services: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching speech services:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get active speech-to-text services
 * GET /api/voice-capture/speech-services/active
 */
router.get('/speech-services/active', async (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const result = await getPool(req).query(
            `SELECT id, provider, configuration, priority_order 
             FROM ${tablePrefix}speech_to_text_configs 
             WHERE business_id = $1 AND is_active = true 
             ORDER BY priority_order ASC`,
            [businessId]
        );

        res.json({
            success: true,
            services: result.rows
        });
    } catch (error) {
        console.error('Error fetching active speech services:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Configure a speech-to-text service
 * POST /api/voice-capture/speech-services/configure
 */
router.post('/speech-services/configure', async (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const { provider, is_active, configuration, priority_order } = req.body;

        if (!provider) {
            return res.status(400).json({ success: false, error: 'Provider required' });
        }

        const result = await getPool(req).query(
            `INSERT INTO ${tablePrefix}speech_to_text_configs 
             (business_id, provider, is_active, configuration, priority_order)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (business_id, provider) DO UPDATE SET
             is_active = EXCLUDED.is_active,
             configuration = EXCLUDED.configuration,
             priority_order = EXCLUDED.priority_order,
             updated_at = NOW()
             RETURNING id, provider, is_active, configuration`,
            [businessId, provider, is_active, JSON.stringify(configuration), priority_order || 1]
        );

        res.json({
            success: true,
            message: 'Speech service configured successfully',
            service: result.rows[0]
        });
    } catch (error) {
        console.error('Error configuring speech service:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Test speech-to-text service connection
 * POST /api/voice-capture/speech-services/:id/test
 */
router.post('/speech-services/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = getBusinessId(req);

        const serviceResult = await getPool(req).query(
            `SELECT provider, configuration 
             FROM ${tablePrefix}speech_to_text_configs 
             WHERE id = $1 AND business_id = $2`,
            [id, businessId]
        );

        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }

        const { provider, configuration } = serviceResult.rows[0];

        // Test based on provider type
        let testResult = { success: false, message: '' };

        switch (provider) {
            case 'openai-whisper':
                testResult = await testOpenAIWhisper(configuration);
                break;
            case 'google-cloud-speech':
                testResult = await testGoogleCloudSpeech(configuration);
                break;
            case 'azure-speech':
                testResult = await testAzureSpeech(configuration);
                break;
            case 'local-whisper':
                testResult = { success: true, message: 'Local Whisper is available' };
                break;
            case 'browser-webapi':
                testResult = { success: true, message: 'Browser Web Speech API is available' };
                break;
            default:
                testResult = { success: false, message: 'Unknown provider' };
        }

        // Update test status
        await getPool(req).query(
            `UPDATE ${tablePrefix}speech_to_text_configs 
             SET test_status = $1, test_error = $2, last_tested_at = NOW()
             WHERE id = $3`,
            [testResult.success ? 'success' : 'failed', testResult.message, id]
        );

        res.json({ success: testResult.success, message: testResult.message });
    } catch (error) {
        console.error('Error testing speech service:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete speech-to-text service
 * DELETE /api/voice-capture/speech-services/:id
 */
router.delete('/speech-services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = getBusinessId(req);

        await getPool(req).query(
            `DELETE FROM ${tablePrefix}speech_to_text_configs 
             WHERE id = $1 AND business_id = $2`,
            [id, businessId]
        );

        res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting speech service:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FORM VOICE GUIDELINES
// ============================================================================

/**
 * Get form voice guidelines
 * GET /api/voice-capture/form/:formId/guidelines
 */
router.get('/form/:formId/guidelines', async (req, res) => {
    try {
        await ensureVoiceGuidelinesTable(req);
        const { formId } = req.params;
        const businessId = getBusinessId(req);

        const result = await getPool(req).query(
            `SELECT id, is_enabled, ai_guide_text, interviewer_guide_text, 
                    extraction_prompt_override
             FROM ${tablePrefix}form_voice_guidelines 
             WHERE form_id = $1 AND business_id = $2`,
            [formId, businessId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                guidelines: {
                    is_enabled: false,
                    ai_guide_text: '',
                    interviewer_guide_text: '',
                    extraction_prompt_override: null
                }
            });
        }

        res.json({ success: true, guidelines: result.rows[0] });
    } catch (error) {
        console.error('Error fetching voice guidelines:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Save/update form voice guidelines
 * POST /api/voice-capture/form/:formId/guidelines
 */
router.post('/form/:formId/guidelines', async (req, res) => {
    try {
        await ensureVoiceGuidelinesTable(req);
        const { formId } = req.params;
        const businessId = getBusinessId(req);
        const userId = req.user?.id;
        const { is_enabled, ai_guide_text, interviewer_guide_text, extraction_prompt_override } = req.body;

        const result = await getPool(req).query(
            `INSERT INTO ${tablePrefix}form_voice_guidelines 
             (business_id, form_id, is_enabled, ai_guide_text, interviewer_guide_text, 
              extraction_prompt_override, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (business_id, form_id) DO UPDATE SET
             is_enabled = EXCLUDED.is_enabled,
             ai_guide_text = EXCLUDED.ai_guide_text,
             interviewer_guide_text = EXCLUDED.interviewer_guide_text,
             extraction_prompt_override = EXCLUDED.extraction_prompt_override,
             updated_at = NOW()
             RETURNING id, is_enabled, ai_guide_text, interviewer_guide_text`,
            [
                businessId,
                formId,
                is_enabled,
                ai_guide_text,
                interviewer_guide_text,
                extraction_prompt_override,
                userId
            ]
        );

        res.json({
            success: true,
            message: 'Voice guidelines saved successfully',
            guidelines: result.rows[0]
        });
    } catch (error) {
        console.error('Error saving voice guidelines:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// VOICE RECORDING MANAGEMENT
// ============================================================================

/**
 * Create voice recording metadata
 * POST /api/voice-capture/recordings
 */
router.post('/recordings', async (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const userId = req.user?.id;
        const { activity_id, form_id, duration_seconds, file_size_bytes } = req.body;

        if (!activity_id || !form_id) {
            return res.status(400).json({
                success: false,
                error: 'activity_id and form_id required'
            });
        }

        // Create recording directory path
        const recordingDir = path.join(
            __dirname,
            '..',
            'uploads',
            'voice',
            String(businessId),
            String(form_id),
            String(activity_id)
        );

        // Create directory if it doesn't exist
        if (!fs.existsSync(recordingDir)) {
            fs.mkdirSync(recordingDir, { recursive: true });
        }

        const fileName = `recording_${Date.now()}.webm`;
        const filePath = path.join(recordingDir, fileName);

        const result = await getPool(req).query(
            `INSERT INTO ${tablePrefix}voice_recordings 
             (business_id, form_id, activity_id, recording_file_path, 
              duration_seconds, file_size_bytes, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, 'recording', $7)
             RETURNING id, recording_file_path`,
            [businessId, form_id, activity_id, filePath, duration_seconds, file_size_bytes, userId]
        );

        res.json({
            success: true,
            recording_id: result.rows[0].id,
            file_path: filePath,
            message: 'Recording metadata created'
        });
    } catch (error) {
        console.error('Error creating recording:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Save audio file
 * POST /api/voice-capture/recordings/:recordingId/save-audio
 */
router.post('/recordings/:recordingId/save-audio', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const businessId = getBusinessId(req);

        if (!req.files || !req.files.audio) {
            return res.status(400).json({ success: false, error: 'No audio file provided' });
        }

        const audioFile = req.files.audio;
        const filePath = `uploads/voice/${businessId}/recording_${recordingId}.webm`;

        await audioFile.mv(filePath);

        // Update recording with file info
        const stats = fs.statSync(filePath);
        await getPool(req).query(
            `UPDATE ${tablePrefix}voice_recordings 
             SET status = 'ready_for_transcription', file_size_bytes = $1
             WHERE id = $2 AND business_id = $3`,
            [stats.size, recordingId, businessId]
        );

        res.json({
            success: true,
            message: 'Audio file saved successfully',
            file_size: stats.size
        });
    } catch (error) {
        console.error('Error saving audio file:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get voice recordings for activity
 * GET /api/voice-capture/activity/:activityId/recordings
 */
router.get('/activity/:activityId/recordings', async (req, res) => {
    try {
        const { activityId } = req.params;
        const businessId = getBusinessId(req);

        const result = await getPool(req).query(
            `SELECT id, form_id, status, duration_seconds, transcription_text,
                    extracted_data, confidence_scores, created_at
             FROM ${tablePrefix}voice_recordings 
             WHERE activity_id = $1 AND business_id = $2
             ORDER BY created_at DESC`,
            [activityId, businessId]
        );

        res.json({
            success: true,
            recordings: result.rows
        });
    } catch (error) {
        console.error('Error fetching recordings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TRANSCRIPTION INTEGRATION
// ============================================================================

/**
 * Transcribe audio file
 * POST /api/voice-capture/transcribe
 * Supports multiple speech-to-text services
 */
router.post('/transcribe', async (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const { recording_id, service_id } = req.body;

        if (!recording_id) {
            return res.status(400).json({ success: false, error: 'recording_id required' });
        }

        // Get recording info
        const recordingResult = await getPool(req).query(
            `SELECT id, recording_file_path, status FROM ${tablePrefix}voice_recordings 
             WHERE id = $1 AND business_id = $2`,
            [recording_id, businessId]
        );

        if (recordingResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        const recording = recordingResult.rows[0];
        const filePath = recording.recording_file_path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Audio file not found' });
        }

        // Get service configuration
        let serviceConfig = null;
        if (service_id) {
            const serviceResult = await getPool(req).query(
                `SELECT provider, configuration FROM ${tablePrefix}speech_to_text_configs 
                 WHERE id = $1 AND business_id = $2`,
                [service_id, businessId]
            );
            if (serviceResult.rows.length > 0) {
                serviceConfig = serviceResult.rows[0];
            }
        } else {
            // Get first active service
            const serviceResult = await getPool(req).query(
                `SELECT provider, configuration FROM ${tablePrefix}speech_to_text_configs 
                 WHERE business_id = $1 AND is_active = true
                 ORDER BY priority_order ASC LIMIT 1`,
                [businessId]
            );
            if (serviceResult.rows.length > 0) {
                serviceConfig = serviceResult.rows[0];
            }
        }

        if (!serviceConfig) {
            return res.status(400).json({
                success: false,
                error: 'No speech-to-text service configured'
            });
        }

        // Transcribe based on provider
        let transcription = '';
        let provider = serviceConfig.provider;

        switch (provider) {
            case 'openai-whisper':
                transcription = await transcribeWithOpenAI(filePath, serviceConfig.configuration);
                break;
            case 'google-cloud-speech':
                transcription = await transcribeWithGoogleCloud(filePath, serviceConfig.configuration);
                break;
            case 'azure-speech':
                transcription = await transcribeWithAzure(filePath, serviceConfig.configuration);
                break;
            case 'local-whisper':
                transcription = await transcribeWithLocalWhisper(filePath);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Provider not supported' });
        }

        // Update recording with transcription
        await getPool(req).query(
            `UPDATE ${tablePrefix}voice_recordings 
             SET transcription_text = $1, transcription_service = $2, status = 'transcribed'
             WHERE id = $3`,
            [transcription, provider, recording_id]
        );

        res.json({
            success: true,
            recording_id,
            transcription_text: transcription,
            provider
        });
    } catch (error) {
        console.error('Error transcribing audio:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Extract and map data from transcription using LLM
 * POST /api/voice-capture/extract-and-map
 */
router.post('/extract-and-map', async (req, res) => {
    try {
        const businessId = getBusinessId(req);
        let { recording_id, form_id, form_fields, ai_context_id } = req.body;

        if (!recording_id || !form_id) {
            return res.status(400).json({
                success: false,
                error: 'recording_id and form_id required'
            });
        }

        if (!Array.isArray(form_fields) || form_fields.length === 0) {
            const activityResult = await getPool(req).query(
                `SELECT form_definition FROM ${tablePrefix}activities WHERE id = $1`,
                [form_id]
            );
            if (activityResult.rows.length > 0) {
                let formDefinition = activityResult.rows[0].form_definition;
                if (typeof formDefinition === 'string') {
                    try { formDefinition = JSON.parse(formDefinition); } catch (e) { formDefinition = null; }
                }
                form_fields = [];
                for (const page of formDefinition?.pages || []) {
                    for (const section of page.sections || []) {
                        for (const question of section.questions || []) {
                            form_fields.push({
                                id: question.id,
                                name: question.fieldName || question.field_name || question.id,
                                label: question.questionText || question.question_text || question.label || question.id,
                                type: question.answerType || question.answer_type || 'text',
                                options: question.options || [],
                                required: question.required === true
                            });
                        }
                    }
                }
            }
        }

        // Get recording and transcription
        const recordingResult = await getPool(req).query(
            `SELECT transcription_text FROM ${tablePrefix}voice_recordings 
             WHERE id = $1 AND business_id = $2`,
            [recording_id, businessId]
        );

        if (recordingResult.rows.length === 0 || !recordingResult.rows[0].transcription_text) {
            return res.status(400).json({
                success: false,
                error: 'Transcription not available'
            });
        }

        const transcriptionText = recordingResult.rows[0].transcription_text;

        // Get form voice guidelines
        const guidelinesResult = await getPool(req).query(
            `SELECT ai_guide_text, extraction_prompt_override 
             FROM ${tablePrefix}form_voice_guidelines 
             WHERE form_id = $1 AND business_id = $2`,
            [form_id, businessId]
        );

        const guidelines = guidelinesResult.rows.length > 0 ? guidelinesResult.rows[0] : {};

        // Get AI context if provided
        let aiContext = '';
        if (ai_context_id) {
            const contextResult = await getPool(req).query(
                `SELECT context_text FROM ${tablePrefix}prompt_contexts 
                 WHERE id = $1 AND business_id = $2`,
                [ai_context_id, businessId]
            );
            if (contextResult.rows.length > 0) {
                aiContext = contextResult.rows[0].context_text;
            }
        }

        // Build LLM prompt for extraction
        const extractionPrompt = buildExtractionPrompt(
            transcriptionText,
            form_fields,
            aiContext,
            guidelines,
            ai_context_id
        );

        // Call LLM to extract data
        const llmSettings = await getLLMSettings(businessId);
        if (!llmSettings) {
            return res.status(400).json({
                success: false,
                error: 'No LLM configured'
            });
        }

        const extractedData = await callLLMForExtraction(llmSettings, extractionPrompt);

        // Update recording with extracted data
        await getPool(req).query(
            `UPDATE ${tablePrefix}voice_recordings 
             SET extracted_data = $1, confidence_scores = $2, status = 'extracted'
             WHERE id = $3`,
            [
                JSON.stringify(extractedData.extracted_data || {}),
                JSON.stringify(extractedData.confidence_scores || {}),
                recording_id
            ]
        );

        res.json({
            success: true,
            recording_id,
            extracted_data: extractedData.extracted_data || {},
            confidence_scores: extractedData.confidence_scores || {},
            notes: extractedData.notes || ''
        });
    } catch (error) {
        console.error('Error extracting data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
