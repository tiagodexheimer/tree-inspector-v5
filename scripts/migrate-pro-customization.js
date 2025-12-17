
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL;

const pool = new Pool({
    connectionString: connectionString,
});

async function migrate() {
    console.log('Iniciando migração para Personalização Pro...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('Adicionando coluna uses_custom_schema em organizations...');
        await client.query(`
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS uses_custom_schema BOOLEAN DEFAULT FALSE;
        `);

        console.log('Verificando colunas em demandas_status...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demandas_status' AND column_name = 'is_custom') THEN
                    ALTER TABLE demandas_status ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demandas_status' AND column_name = 'is_default_global') THEN
                    ALTER TABLE demandas_status ADD COLUMN is_default_global BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
            END $$;
        `);

        console.log('Verificando colunas em demandas_tipos...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demandas_tipos' AND column_name = 'is_custom') THEN
                    ALTER TABLE demandas_tipos ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demandas_tipos' AND column_name = 'is_default_global') THEN
                    ALTER TABLE demandas_tipos ADD COLUMN is_default_global BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
            END $$;
        `);

        await client.query('COMMIT');
        console.log('Migração concluída com sucesso!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Erro na migração:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
