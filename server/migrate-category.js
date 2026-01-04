import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nrdb',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

const TABLE_PREFIX = process.env.TABLE_PREFIX || 'nherams_';
const INDICATORS_TABLE = `${TABLE_PREFIX}indicators`;

async function migrate() {
    try {
        console.log(`Adding category column to ${INDICATORS_TABLE}...`);
        await pool.query(`ALTER TABLE ${INDICATORS_TABLE} ADD COLUMN IF NOT EXISTS category TEXT`);
        console.log('✅ Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
