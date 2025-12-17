
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

async function seedSpecies() {
    try {
        const client = await pool.connect();
        console.log('Connected to database.');

        // 1. Read Excel
        const filePath = path.join(__dirname, '..', '..', 'Species.xlsx');
        console.log(`Reading file: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet); // Array of objects

        console.log(`Found ${data.length} entries.`);

        // 2. Insert Loop
        let count = 0;
        for (const item of data) {
            const nomeComum = item['nome_comum'];
            const nomeCientifico = item['nome_cientifico'];

            if (nomeComum && nomeCientifico) {
                // Upsert (Insert or Update if exists could be better, but simple insert for now)
                // Checking duplicates first might be safer or using ON CONFLICT if constraints existed
                // For now, simple INSERT
                await client.query(`
                INSERT INTO especies (nome_comum, nome_cientifico)
                VALUES ($1, $2)
             `, [nomeComum, nomeCientifico]);
                count++;
            }
        }

        console.log(`Seeded ${count} species successfully.`);
        client.release();
    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        await pool.end();
    }
}

seedSpecies();
