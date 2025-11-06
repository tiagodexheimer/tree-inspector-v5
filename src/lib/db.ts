// src/lib/db.ts
import { Pool } from 'pg';

let pool: Pool;

// Vercel e Neon recomendam usar a variável POSTGRES_URL.
// Usaremos a sua (com pooler) que é a DATABASE_URL ou POSTGRES_URL.
const connectionString = process.env.POSTGRES_URL;

if (connectionString) {
  // --- Modo de Produção (Vercel/Neon) ---
  // A string de conexão já inclui sslmode=require
  console.log('API conectando ao banco de dados de produção (via URL)...');
  pool = new Pool({
    connectionString: connectionString,
  });

} else {
  // --- Modo de Desenvolvimento (local/docker-compose) ---
  // Usa as variáveis de ambiente locais (do seu docker-compose.yml)
  console.log('API conectando ao banco de dados de desenvolvimento (local)...');
  pool = new Pool({
    user: process.env.DB_USER,       // "meuusuario"
    host: process.env.DB_HOST,       // "db" ou "localhost"
    database: process.env.DB_DATABASE, // "meubanco_gis"
    password: process.env.DB_PASSWORD, // "minhasenhasecreta"
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });
}

// O teste de conexão continua o mesmo
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao banco de dados:', err.stack);
    }
    console.log('API conectada ao banco de dados PostgreSQL com PostGIS!');
    
    // Verifica a versão do PostGIS
    client?.query('SELECT postgis_version()', (err, result) => {
        release(); // Libera o client de volta para o pool
        if (err) {
            return console.error('Erro ao verificar PostGIS:', err.stack);
        }
        console.log('Versão do PostGIS:', result?.rows[0]);
    });
});

// Exporta o pool configurado
export default pool;