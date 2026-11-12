import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runMigrations() {
    const pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🚀 Starting database migrations...');
        
        const migrationDir = __dirname;
        const files = fs.readdirSync(migrationDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const filePath = path.join(migrationDir, file);
            const sql = fs.readFileSync(filePath, 'utf-8');
            
            console.log(`\n📋 Running migration: ${file}`);
            
            try {
                await pool.query(sql);
                console.log(`✅ Successfully executed: ${file}`);
            } catch (error) {
                console.error(`❌ Error executing ${file}:`, error.message);
                if (!error.message.includes('already exists')) {
                    throw error;
                }
            }
        }

        console.log('\n✅ All migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

export { runMigrations };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations();
}
