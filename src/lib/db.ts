import { Pool } from 'pg';

// 1. Declare o pool na 'globalThis' para sobreviver ao hot-reload
declare global {
  var pgPool: Pool | undefined;
}

// 2. Função separada para obter a string de conexão
function getConnectionString() {
  let connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const host = process.env.DB_HOST; 
    const port = parseInt(process.env.DB_PORT || '5432', 10);
    const database = process.env.DB_DATABASE;

    if (user && password && host && port && database) {
      // Se o host for 'db' (de docker-compose), o servidor Next.js
      // (rodando localmente) deve se conectar a 'localhost'.
      const effectiveHost = (host === 'db') ? 'localhost' : host;
      connectionString = `postgresql://${user}:${password}@${effectiveHost}:${port}/${database}`;
    } else {
      throw new Error("Não foi possível construir a string de conexão. Verifique as variáveis de ambiente.");
    }
  }
  return connectionString;
}

// 3. Cria o pool (Singleton)
// Só executa esta lógica se o pool NÃO estiver no cache global
if (!globalThis.pgPool) {
  console.log('API: Pool de conexão (Singleton) não encontrado. Criando NOVO pool...');
  const connString = getConnectionString();
  console.log(`API: Conectando com: ${connString.replace(/:([^:]+)@/, ':****@')}`);
  
  globalThis.pgPool = new Pool({
    connectionString: connString,
  });
}

// 4. Exporta o pool que está no 'globalThis'
const pool: Pool = globalThis.pgPool;

export default pool;