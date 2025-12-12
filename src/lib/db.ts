// src/lib/db.ts
import { Pool as NeonPool } from '@neondatabase/serverless'; 
// Importa o Pool padrão do 'pg', que é compatível com o Docker PostGIS
import { Pool as StandardPool } from 'pg'; 

declare global {
  // Define o tipo global para aceitar qualquer um dos Pools
  var pool: NeonPool | StandardPool | undefined;
}

let connectionString: string | undefined = process.env.POSTGRES_URL;

// Lógica de fallback para Docker local (mantida)
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

// --- Dynamic Pool Selection Logic ---
// Se a conexão for para 'localhost' ou '127.0.0.1' (como no CI/E2E), usamos o Pool padrão.
const isLocalTest = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const PoolConstructor = isLocalTest ? StandardPool : NeonPool;

// --- BLOCO DE DEBUG (Adicionado para verificar a escolha) ---
const [protocol, rest] = connectionString.split('://');
const safeRest = rest.replace(/:[^@]+@/, ':****@');
console.log(`DEBUG: Conectando a: ${protocol}://${safeRest}`);
console.log(`DEBUG: Usando Pool: ${isLocalTest ? 'Standard PG (Local/CI)' : 'Neon Serverless'}`);
// ---------------------------------

// Cria o pool (Singleton)
if (!global.pool) {
  console.log('API: Criando novo pool de conexão...');
  global.pool = new PoolConstructor({
    connectionString: connectionString,
    // O Pool padrão do 'pg' não requer SSL para localhost
  });
}

const pool: NeonPool | StandardPool = global.pool;

export default pool;