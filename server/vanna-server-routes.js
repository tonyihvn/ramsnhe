/**
 * Vanna Server Control Routes
 * Provides API endpoints for starting, stopping, and managing the Vanna server
 */

import express from 'express';
import {
  startVannaServer,
  stopVannaServer,
  restartVannaServer,
  getVannaServerStatus
} from './vanna-server-manager.js';

export const createVannaServerRoutes = (pool) => {
  const router = express.Router();

  // Middleware: Check authentication
  const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Check if user is admin
    if (!req.session.role || !['admin', 'super-admin', 'super_admin'].includes(req.session.role.toLowerCase())) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  };

  /**
   * GET /api/vanna-server/status
   * Get the current status of the Vanna server
   */
  router.get('/status', requireAuth, (req, res) => {
    try {
      const status = getVannaServerStatus();
      res.json({
        ok: true,
        data: status
      });
    } catch (err) {
      console.error('[Vanna Server Routes] Error getting status:', err);
      res.status(500).json({
        error: 'Failed to get server status',
        message: err.message
      });
    }
  });

  /**
   * POST /api/vanna-server/start
   * Start the Vanna server
   */
  router.post('/start', requireAuth, async (req, res) => {
    try {
      console.log('[Vanna Server Routes] Starting server...');
      
      // Try to get database config from settings (if available)
      let dbConfig = null;
      try {
        const businessId = req.session?.businessId;
        if (businessId && pool) {
          const settingsRes = await pool.query(
            'SELECT value FROM dqatb_settings WHERE key = $1 AND business_id = $2 LIMIT 1',
            ['database_config', businessId]
          ).catch(() => null);
          
          if (settingsRes?.rows?.[0]?.value) {
            dbConfig = settingsRes.rows[0].value;
            console.log('[Vanna Server Routes] Using database config from settings');
          }
        }
      } catch (err) {
        console.warn('[Vanna Server Routes] Could not fetch database config from settings:', err.message);
      }

      const result = await startVannaServer(dbConfig);
      res.json({
        ok: result.status === 'running' || result.status === 'already_running',
        status: result.status,
        message: result.message,
        port: result.port,
        startTime: result.startTime
      });
    } catch (err) {
      console.error('[Vanna Server Routes] Error starting server:', err);
      res.status(500).json({
        ok: false,
        error: 'Failed to start server',
        message: err.message
      });
    }
  });

  /**
   * POST /api/vanna-server/stop
   * Stop the Vanna server
   */
  router.post('/stop', requireAuth, async (req, res) => {
    try {
      console.log('[Vanna Server Routes] Stopping server...');
      const result = await stopVannaServer();
      res.json({
        ok: true,
        status: result.status,
        message: result.message,
        port: result.port
      });
    } catch (err) {
      console.error('[Vanna Server Routes] Error stopping server:', err);
      res.status(500).json({
        ok: false,
        error: 'Failed to stop server',
        message: err.message
      });
    }
  });

  /**
   * POST /api/vanna-server/restart
   * Restart the Vanna server
   */
  router.post('/restart', requireAuth, async (req, res) => {
    try {
      console.log('[Vanna Server Routes] Restarting server...');
      
      // Try to get database config from settings
      let dbConfig = null;
      try {
        const businessId = req.session?.businessId;
        if (businessId && pool) {
          const settingsRes = await pool.query(
            'SELECT value FROM dqatb_settings WHERE key = $1 AND business_id = $2 LIMIT 1',
            ['database_config', businessId]
          ).catch(() => null);
          
          if (settingsRes?.rows?.[0]?.value) {
            dbConfig = settingsRes.rows[0].value;
          }
        }
      } catch (err) {
        console.warn('[Vanna Server Routes] Could not fetch database config:', err.message);
      }

      const result = await restartVannaServer(dbConfig);
      res.json({
        ok: result.status === 'running',
        status: result.status,
        message: result.message,
        port: result.port,
        startTime: result.startTime
      });
    } catch (err) {
      console.error('[Vanna Server Routes] Error restarting server:', err);
      res.status(500).json({
        ok: false,
        error: 'Failed to restart server',
        message: err.message
      });
    }
  });

  /**
   * GET /api/vanna-server/health
   * Health check endpoint (no auth required, for monitoring)
   */
  router.get('/health', (req, res) => {
    try {
      const status = getVannaServerStatus();
      
      // Try to check if the server is actually running
      if (status.status === 'running') {
        res.json({
          ok: true,
          status: 'healthy',
          data: status
        });
      } else {
        res.status(503).json({
          ok: false,
          status: status.status,
          message: 'Vanna server is not running',
          data: status
        });
      }
    } catch (err) {
      res.status(500).json({
        ok: false,
        status: 'error',
        message: err.message
      });
    }
  });

  return router;
};

export default createVannaServerRoutes;
