
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!connectionString) {
        console.error('DATABASE_URL or POSTGRES_URL not found in environment.');
        process.exit(1);
    }

    console.log(`Connecting to database...`);

    const pool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('Connected!');

        console.log("Running migration: ADD COLUMN anexos JSONB...");
        await client.query(`
      ALTER TABLE demandas 
      ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb;
    `);

        console.log("Migration successful!");
        client.release();
    } catch (err) {
        console.error("Error running migration:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
