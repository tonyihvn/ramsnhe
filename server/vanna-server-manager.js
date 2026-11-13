/**
 * Vanna AI Server Manager
 * Manages the lifecycle of the Vanna AI server running on port 8888
 * Automatically connects to the database configured in Settings→Database
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let vannaServerProcess = null;
let vannaServerStatus = 'stopped'; // 'stopped', 'starting', 'running', 'error'
let serverStartTime = null;

const VANNA_PORT = process.env.VANNA_PORT || 8888;
const VANNA_APP_PATH = path.join(__dirname, '..', 'vanna_server', 'app.py');
const VANNA_HOST = process.env.VANNA_HOST || '127.0.0.1';

/**
 * Start the Vanna server
 * @param {object} dbConfig - Database configuration
 * @returns {Promise<{status: string, message: string}>}
 */
export async function startVannaServer(dbConfig = null) {
  return new Promise((resolve) => {
    if (vannaServerStatus === 'running') {
      return resolve({
        status: 'already_running',
        message: 'Vanna server is already running',
        port: VANNA_PORT
      });
    }

    if (vannaServerStatus === 'starting') {
      return resolve({
        status: 'starting',
        message: 'Vanna server is starting...',
        port: VANNA_PORT
      });
    }

    vannaServerStatus = 'starting';
    serverStartTime = new Date();

    // Check if Python and app.py exist
    if (!fs.existsSync(VANNA_APP_PATH)) {
      vannaServerStatus = 'error';
      return resolve({
        status: 'error',
        message: `Vanna app.py not found at ${VANNA_APP_PATH}`,
        port: VANNA_PORT
      });
    }

    try {
      // Set environment variables for the Vanna server
      const env = {
        ...process.env,
        VANNA_PORT: String(VANNA_PORT),
        VANNA_HOST: VANNA_HOST,
        PYTHONUNBUFFERED: '1' // Ensure logs are output immediately
      };

      // If database config provided, pass it as environment variables
      if (dbConfig) {
        env.DB_HOST = dbConfig.host || 'localhost';
        env.DB_PORT = String(dbConfig.port || 5432);
        env.DB_NAME = dbConfig.database || 'ramsnhe';
        env.DB_USER = dbConfig.user || 'postgres';
        env.DB_PASSWORD = dbConfig.password || '';
        env.DATABASE_TYPE = dbConfig.type || 'postgres';
      }

      console.log(`[Vanna Server] Starting Vanna server on ${VANNA_HOST}:${VANNA_PORT}...`);
      
      // Determine which Python executable to use
      let pythonCmd = 'python';
      try {
        // First try to get Python from PATH by executing a simple command
        exec('python --version', (error, stdout, stderr) => {
          if (error) {
            // If python fails, log it but continue (spawn will handle the error)
            console.log(`[Vanna Server] python not found, will try python3`);
          }
        });
      } catch (e) {
        console.log(`[Vanna Server] Attempting with python3...`);
        pythonCmd = 'python3';
      }
      
      console.log(`[Vanna Server] Using Python from: ${pythonCmd}`);

      // Use python command directly (should work if Python is in PATH)
      
      // Spawn the Vanna server process
      vannaServerProcess = spawn(pythonCmd, [VANNA_APP_PATH], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      let startupTimeout = setTimeout(() => {
        vannaServerStatus = 'running';
        console.log(`[Vanna Server] Server started successfully on ${VANNA_HOST}:${VANNA_PORT}`);
        resolve({
          status: 'running',
          message: `Vanna server started successfully on ${VANNA_HOST}:${VANNA_PORT}`,
          port: VANNA_PORT,
          startTime: serverStartTime
        });
      }, 2000);

      // Log stdout
      vannaServerProcess.stdout.on('data', (data) => {
        const log = data.toString().trim();
        if (log) {
          console.log(`[Vanna Server STDOUT] ${log}`);
          if (log.includes('running') || log.includes('Starting')) {
            clearTimeout(startupTimeout);
            if (vannaServerStatus !== 'running') {
              vannaServerStatus = 'running';
              resolve({
                status: 'running',
                message: `Vanna server started on ${VANNA_HOST}:${VANNA_PORT}`,
                port: VANNA_PORT,
                startTime: serverStartTime
              });
            }
          }
        }
      });

      // Log stderr
      vannaServerProcess.stderr.on('data', (data) => {
        const log = data.toString().trim();
        if (log) {
          console.error(`[Vanna Server ERROR] ${log}`);
        }
      });

      // Handle process exit
      vannaServerProcess.on('exit', (code, signal) => {
        console.log(`[Vanna Server] Process exited with code ${code} and signal ${signal}`);
        vannaServerStatus = 'stopped';
        vannaServerProcess = null;
        clearTimeout(startupTimeout);
      });

      // Handle process error
      vannaServerProcess.on('error', (err) => {
        console.error(`[Vanna Server] Process error: ${err.message}`);
        vannaServerStatus = 'error';
        clearTimeout(startupTimeout);
        
        // If python3 failed, try python
        if (pythonCmd === 'python3' && err.code === 'ENOENT') {
          console.log(`[Vanna Server] python3 not found, retrying with python...`);
          pythonCmd = 'python';
          startVannaServer(dbConfig).then(resolve);
        } else {
          resolve({
            status: 'error',
            message: `Failed to start Vanna server: ${err.message}`,
            port: VANNA_PORT
          });
        }
      });

    } catch (err) {
      vannaServerStatus = 'error';
      console.error(`[Vanna Server] Error starting server:`, err);
      resolve({
        status: 'error',
        message: `Failed to start Vanna server: ${err.message}`,
        port: VANNA_PORT
      });
    }
  });
}

/**
 * Stop the Vanna server
 * @returns {Promise<{status: string, message: string}>}
 */
export async function stopVannaServer() {
  return new Promise((resolve) => {
    if (vannaServerStatus === 'stopped' || !vannaServerProcess) {
      vannaServerStatus = 'stopped';
      return resolve({
        status: 'already_stopped',
        message: 'Vanna server is already stopped',
        port: VANNA_PORT
      });
    }

    console.log('[Vanna Server] Stopping Vanna server...');
    
    // Try to kill the process gracefully
    try {
      if (vannaServerProcess) {
        // Kill the process group (all child processes)
        process.kill(-vannaServerProcess.pid, 'SIGTERM');
        
        // Set a timeout to force kill if SIGTERM doesn't work
        const killTimeout = setTimeout(() => {
          console.log('[Vanna Server] Force killing process...');
          try {
            process.kill(-vannaServerProcess.pid, 'SIGKILL');
          } catch (e) {
            console.error('[Vanna Server] Failed to force kill:', e.message);
          }
        }, 3000);

        vannaServerProcess.on('exit', () => {
          clearTimeout(killTimeout);
        });
      }
    } catch (err) {
      console.error('[Vanna Server] Error stopping server:', err.message);
    }

    vannaServerStatus = 'stopped';
    vannaServerProcess = null;

    setTimeout(() => {
      resolve({
        status: 'stopped',
        message: 'Vanna server stopped successfully',
        port: VANNA_PORT
      });
    }, 1000);
  });
}

/**
 * Restart the Vanna server
 * @param {object} dbConfig - Database configuration
 * @returns {Promise<{status: string, message: string}>}
 */
export async function restartVannaServer(dbConfig = null) {
  console.log('[Vanna Server] Restarting Vanna server...');
  await stopVannaServer();
  
  // Wait a bit before starting again
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return startVannaServer(dbConfig);
}

/**
 * Get the current status of the Vanna server
 * @returns {{status: string, message: string, port: number, uptime?: string}}
 */
export function getVannaServerStatus() {
  const uptime = serverStartTime 
    ? Math.round((Date.now() - serverStartTime.getTime()) / 1000)
    : null;

  return {
    status: vannaServerStatus,
    message: `Server status: ${vannaServerStatus}`,
    port: VANNA_PORT,
    host: VANNA_HOST,
    uptime: uptime ? `${uptime}s` : null,
    processId: vannaServerProcess?.pid || null
  };
}

/**
 * Auto-start the Vanna server on application startup
 * (Called from server initialization)
 */
export async function initializeVannaServer() {
  console.log('[Vanna Server] Initializing Vanna server manager...');
  
  // Check if the server should auto-start
  const autoStart = process.env.VANNA_AUTO_START !== 'false';
  
  if (autoStart) {
    console.log('[Vanna Server] Auto-starting Vanna server...');
    // Note: Database config will be fetched and passed by the API layer when available
    const result = await startVannaServer();
    console.log('[Vanna Server] Init result:', result);
  } else {
    console.log('[Vanna Server] Auto-start disabled (VANNA_AUTO_START=false)');
  }
}

/**
 * Gracefully shutdown the Vanna server when the app closes
 */
export async function shutdownVannaServer() {
  console.log('[Vanna Server] Shutting down Vanna server...');
  await stopVannaServer();
}
