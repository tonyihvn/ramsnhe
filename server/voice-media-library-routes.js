/**
 * Voice Media Library Routes
 * Manage, download, and delete voice recordings
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const tablePrefix = process.env.TABLE_PREFIX || 'dqatb_';

router.use(requireAuth);

const getBusinessId = (req) => req.user?.business_id;

/**
 * Get media library (paginated list of recordings)
 * GET /api/voice-capture/media-library?page=1&limit=20&sort=created_at&order=DESC
 */
router.get('/media-library', async (req, res) => {
    try {
        const businessId = getBusinessId(req);
        const { page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
        const offset = (page - 1) * limit;

        // Validate sort column
        const allowedSorts = ['created_at', 'file_size_bytes', 'duration_seconds', 'file_name'];
        const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM ${tablePrefix}voice_media_library 
             WHERE business_id = $1`,
            [businessId]
        );
        const total = parseInt(countResult.rows[0].total);

        // Get paginated results
        const result = await pool.query(
            `SELECT vml.id, vml.file_name, vml.file_size_bytes, vml.duration_seconds,
                    vml.created_at, vr.form_id, vr.activity_id, vr.transcription_text
             FROM ${tablePrefix}voice_media_library vml
             LEFT JOIN ${tablePrefix}voice_recordings vr ON vml.recording_id = vr.id
             WHERE vml.business_id = $1
             ORDER BY vml.${sortColumn} ${sortOrder}
             LIMIT $2 OFFSET $3`,
            [businessId, limit, offset]
        );

        res.json({
            success: true,
            recordings: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching media library:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get recording details
 * GET /api/voice-capture/recordings/:recordingId
 */
router.get('/recordings/:recordingId', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const businessId = getBusinessId(req);

        const result = await pool.query(
            `SELECT id, form_id, activity_id, recording_file_path, 
                    transcription_text, extracted_data, confidence_scores,
                    duration_seconds, file_size_bytes, status, created_at, created_by
             FROM ${tablePrefix}voice_recordings
             WHERE id = $1 AND business_id = $2`,
            [recordingId, businessId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        res.json({
            success: true,
            recording: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching recording:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Download recording audio file
 * GET /api/voice-capture/recordings/:recordingId/download
 */
router.get('/recordings/:recordingId/download', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const businessId = getBusinessId(req);

        const result = await pool.query(
            `SELECT recording_file_path, file_name FROM ${tablePrefix}voice_recordings
             WHERE id = $1 AND business_id = $2`,
            [recordingId, businessId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        const filePath = result.rows[0].recording_file_path;
        const fileName = result.rows[0].file_name || `recording_${recordingId}.webm`;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Audio file not found' });
        }

        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading recording:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete recording (soft delete + file removal)
 * DELETE /api/voice-capture/recordings/:recordingId
 */
router.delete('/recordings/:recordingId', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const businessId = getBusinessId(req);
        const userId = req.user?.id;

        // Get recording details
        const recordingResult = await pool.query(
            `SELECT recording_file_path FROM ${tablePrefix}voice_recordings
             WHERE id = $1 AND business_id = $2`,
            [recordingId, businessId]
        );

        if (recordingResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        const filePath = recordingResult.rows[0].recording_file_path;

        // Delete file from disk
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Mark as deleted in database (soft delete)
        await pool.query(
            `UPDATE ${tablePrefix}voice_recordings
             SET status = 'deleted', updated_at = NOW()
             WHERE id = $1`,
            [recordingId]
        );

        // Log deletion
        await pool.query(
            `INSERT INTO ${tablePrefix}voice_capture_audit 
             (business_id, recording_id, action, user_id)
             VALUES ($1, $2, 'DELETE', $3)`,
            [businessId, recordingId, userId]
        );

        res.json({ success: true, message: 'Recording deleted successfully' });
    } catch (error) {
        console.error('Error deleting recording:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get transcription for a recording
 * GET /api/voice-capture/recordings/:recordingId/transcription
 */
router.get('/recordings/:recordingId/transcription', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const businessId = getBusinessId(req);

        const result = await pool.query(
            `SELECT transcription_text, status FROM ${tablePrefix}voice_recordings
             WHERE id = $1 AND business_id = $2`,
            [recordingId, businessId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        if (!result.rows[0].transcription_text) {
            return res.status(400).json({
                success: false,
                error: 'Transcription not available',
                status: result.rows[0].status
            });
        }

        res.json({
            success: true,
            transcription_text: result.rows[0].transcription_text
        });
    } catch (error) {
        console.error('Error fetching transcription:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get extracted data for a recording
 * GET /api/voice-capture/recordings/:recordingId/extracted-data
 */
router.get('/recordings/:recordingId/extracted-data', async (req, res) => {
    try {
        const { recordingId } = req.params;
        const businessId = getBusinessId(req);

        const result = await pool.query(
            `SELECT extracted_data, confidence_scores, status FROM ${tablePrefix}voice_recordings
             WHERE id = $1 AND business_id = $2`,
            [recordingId, businessId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recording not found' });
        }

        if (result.rows[0].status !== 'extracted' && result.rows[0].status !== 'applied') {
            return res.status(400).json({
                success: false,
                error: 'Data extraction not complete',
                status: result.rows[0].status
            });
        }

        res.json({
            success: true,
            extracted_data: result.rows[0].extracted_data || {},
            confidence_scores: result.rows[0].confidence_scores || {}
        });
    } catch (error) {
        console.error('Error fetching extracted data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get statistics for media library
 * GET /api/voice-capture/media-library/stats
 */
router.get('/media-library/stats', async (req, res) => {
    try {
        const businessId = getBusinessId(req);

        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_recordings,
                SUM(CAST(file_size_bytes AS BIGINT)) as total_storage_bytes,
                SUM(duration_seconds) as total_duration_seconds,
                AVG(duration_seconds) as avg_duration_seconds,
                MIN(created_at) as oldest_recording,
                MAX(created_at) as newest_recording
             FROM ${tablePrefix}voice_recordings
             WHERE business_id = $1 AND status != 'deleted'`,
            [businessId]
        );

        const stats = result.rows[0];

        res.json({
            success: true,
            stats: {
                total_recordings: parseInt(stats.total_recordings) || 0,
                total_storage_mb: Math.round((parseInt(stats.total_storage_bytes || 0) / 1024 / 1024) * 100) / 100,
                total_duration_hours: Math.round((parseInt(stats.total_duration_seconds || 0) / 3600) * 100) / 100,
                avg_duration_seconds: Math.round(parseInt(stats.avg_duration_seconds || 0)),
                oldest_recording: stats.oldest_recording,
                newest_recording: stats.newest_recording
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
