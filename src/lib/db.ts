// src/lib/db.ts
import { Pool } from 'pg';

// Initialize the pool immediately
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    // Add other configurations if necessary (ex: SSL)
});

// Optional connection test (will run once when the module is first loaded)
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao banco de dados:', err.stack);
    }
    console.log('API conectada ao banco de dados PostgreSQL com PostGIS!');
    client?.query('SELECT postgis_version()', (err, result) => {
        release(); // Release the client back to the pool
        if (err) {
            return console.error('Erro ao verificar PostGIS:', err.stack);
        }
        console.log('Versão do PostGIS:', result?.rows[0]);
    });
});

// Export the already initialized pool
export default pool;