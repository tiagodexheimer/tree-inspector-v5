
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

async function createTable() {
    try {
        const client = await pool.connect();
        console.log('Connected to database.');

        await client.query(`
      CREATE TABLE IF NOT EXISTS especies (
        id SERIAL PRIMARY KEY,
        nome_comum VARCHAR(255) NOT NULL,
        nome_cientifico VARCHAR(255) NOT NULL,
        familia VARCHAR(255),
        origem VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('Table "especies" created successfully.');

        // Optional: Create an index for faster search
        await client.query(`
        CREATE INDEX IF NOT EXISTS idx_especies_nome_comum ON especies(nome_comum);
        CREATE INDEX IF NOT EXISTS idx_especies_nome_cientifico ON especies(nome_cientifico);
    `);
        console.log('Indexes created.');

        client.release();
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await pool.end();
    }
}

createTable();
