// Initialize startup configuration and database setup
// This handles multi-tenancy features and other startup configuration

import { tables } from './tablePrefix.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize startup - runs migrations and sets up multi-tenancy features
 * @param {Pool} pool - PostgreSQL connection pool
 */
export async function initializeStartup(pool) {
  try {
    console.log('[startup] Initializing startup configuration...');
    
    // Run any pending migrations
    await runMigrations(pool);
    
    // Ensure multi-tenancy tables and structures exist
    await setupMultiTenancy(pool);
    
    console.log('[startup] Startup initialization complete');
  } catch (error) {
    console.error('[startup] Error during initialization:', error);
    throw error;
  }
}

/**
 * Run database migrations from the migrations directory
 * @param {Pool} pool - PostgreSQL connection pool
 */
async function runMigrations(pool) {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('[migrations] No migrations directory found - skipping migrations');
      return;
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`[migrations] Running migration: ${file}`);
      
      // Split by semicolon and run each statement
      const statements = sql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await pool.query(statement);
          } catch (error) {
            // Some migrations may fail if already applied - log but don't fail
            console.warn(`[migrations] Statement in ${file} failed (may be already applied):`, error.message);
          }
        }
      }
    }
    
    console.log('[migrations] All migrations completed');
  } catch (error) {
    console.error('[migrations] Error running migrations:', error);
    throw error;
  }
}

/**
 * Setup multi-tenancy features and tables
 * @param {Pool} pool - PostgreSQL connection pool
 */
async function setupMultiTenancy(pool) {
  try {
    // Ensure multi-tenancy tables exist
    // These are typically created by migrations, but we ensure they exist here
    
    // BUSINESSES table (primary tenant)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tables.BUSINESSES} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // PLANS table (SaaS plans)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tables.PLANS} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        features JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // PLAN_ASSIGNMENTS table (link plans to businesses)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tables.PLAN_ASSIGNMENTS} (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES ${tables.BUSINESSES}(id) ON DELETE CASCADE,
        plan_id INTEGER NOT NULL REFERENCES ${tables.PLANS}(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business_id, plan_id)
      )
    `);
    
    console.log('[startup] Multi-tenancy features setup complete');
  } catch (error) {
    console.error('[startup] Error setting up multi-tenancy:', error);
    throw error;
  }
}

/**
 * Log startup information
 */
export function logStartupInfo() {
  console.log('[startup] ✓ Database initialization successful');
  console.log('[startup] ✓ Server is ready to accept connections');
  const env = process.env.NODE_ENV || 'development';
  console.log(`[startup] Running in ${env} mode`);
}
