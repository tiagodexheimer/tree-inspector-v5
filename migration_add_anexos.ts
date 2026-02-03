
import { config } from 'dotenv';
// Load environment variables strictly before importing db
config({ path: '.env.local' });
config();

import pool from './src/lib/db';

async function run() {
    console.log('--- Starting Migration ---');
    try {
        // Check if we have connection string
        if (!process.env.POSTGRES_URL) {
            console.warn("WARN: POSTGRES_URL not found in env. Please provide it or ensure .env.local exists.");
        }

        console.log('Executing: ALTER TABLE demandas ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT \'[]\'::jsonb');
        await pool.query("ALTER TABLE demandas ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb");
        console.log("✅ Success: Column 'anexos' added/verified.");
    } catch (e) {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    } finally {
        // Force close pool
        try { await pool.end(); } catch { }
        process.exit(0);
    }
}

run();
