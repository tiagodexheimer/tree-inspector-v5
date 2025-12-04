// src/lib/db.ts
import { Pool } from '@neondatabase/serverless'; // Use o driver do Neon

declare global {
  var pool: Pool | undefined;
}

let connectionString: string | undefined = process.env.POSTGRES_URL;

// Lógica de fallback para Docker local (mantida caso queira rodar sem internet)
if (!connectionString) {
  console.log('API: POSTGRES_URL não encontrada. Verificando variáveis locais...');
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_DATABASE;

  if (user && password && host && port && database) {
    const buildHost = (host === 'db' && process.env.NODE_ENV === 'production') ? 'localhost' : host;
    connectionString = `postgresql://${user}:${password}@${buildHost}:${port}/${database}`;
  }
}

if (!connectionString) {
  throw new Error("Não foi possível conectar ao banco de dados. Configure POSTGRES_URL.");
}

// --- BLOCO DE DEBUG TEMPORÁRIO ---
const [protocol, rest] = connectionString.split('://');
const safeRest = rest.replace(/:[^@]+@/, ':****@');
console.log(`DEBUG: Conectando a: ${protocol}://${safeRest}`);
// ---------------------------------

// Cria o pool (Singleton)
if (!global.pool) {
  console.log('API: Criando novo pool de conexão...');
  global.pool = new Pool({
    connectionString: connectionString,
    // O driver do Neon geralmente gerencia SSL automaticamente com a string connection,
    // mas em alguns casos locais pode ser necessário ajustes.
  });
}

const pool: Pool = global.pool;

export default pool;