// src/lib/db.ts
import { Pool } from 'pg';

declare global {
  var pool: Pool | undefined;
}

// --- CORREÇÃO (Linha 7) ---
// Removemos a declaração 'let pool: Pool;' daqui.
// pool será definido com 'const' abaixo.
let connectionString: string | undefined;

// 1. Tenta pegar a URL de produção primeiro (ex: Vercel, Neon)
connectionString = process.env.POSTGRES_URL;

// 2. Se não existir, tenta construir a partir das variáveis de dev (docker-compose)
if (!connectionString) {
  console.log('API: POSTGRES_URL não encontrada. Tentando construir com variáveis locais...');
  
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_DATABASE;

  // Verifica se as variáveis locais existem
  if (user && password && host && port && database) {
    // Para o 'npm run build', o host deve ser 'localhost', não 'db'
    // pois o build não está rodando dentro do Docker.
    const buildHost = (host === 'db' && process.env.NODE_ENV === 'production') ? 'localhost' : host;
    
    connectionString = `postgresql://${user}:${password}@${buildHost}:${port}/${database}`;
    console.log('API: String de conexão local construída com sucesso.');
  } else {
    console.log('API: Variáveis de banco de dados locais (DB_USER, etc.) também não foram encontradas.');
  }
} else {
  console.log('API: Conectado via POSTGRES_URL.');
}

// 3. Agora, verifica se TEMOS uma string de conexão (de qualquer fonte)
if (!connectionString) {
  // Se ainda não temos uma string, o build deve falhar.
  throw new Error("Não foi possível conectar ao banco de dados. Configure POSTGRES_URL (para produção) ou as variáveis DB_ (para desenvolvimento).");
}

// 4. Cria o pool (Singleton)
if (!global.pool) {
  console.log('API: Criando novo pool de conexão...');
  global.pool = new Pool({
    connectionString: connectionString,
  });
}

// --- CORREÇÃO (Linha 54) ---
// Declaramos 'pool' com 'const' e atribuímos o valor de uma vez.
const pool: Pool = global.pool;

// Exporta o pool configurado
export default pool;