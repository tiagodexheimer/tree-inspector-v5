// test-connection.js
const { Pool } = require('@neondatabase/serverless');
// Precisamos desta biblioteca para ler o .env.local fora do Next.js
require('dotenv').config({ path: './.env.local' }); 

async function testConnection() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("ERRO: POSTGRES_URL não está definida no .env.local. Por favor, verifique o arquivo.");
    return;
  }

  // Loga a URL (sem a senha, por segurança)
  const safeConnectionString = connectionString.replace(/:[^@]+@/, ':****@');
  console.log(`Tentando conectar a: ${safeConnectionString}`);

  const pool = new Pool({
    connectionString: connectionString,
  });

  try {
    const client = await pool.connect();
    // Se chegar aqui, a conexão foi bem-sucedida!
    const result = await client.query('SELECT 1 as success');
    console.log("✅ CONEXÃO BEM-SUCEDIDA!");
    console.log("Resultado do Teste:", result.rows);
    client.release();
  } catch (err) {
    console.error("❌ ERRO DE CONEXÃO. A senha está incorreta, expirou ou há um problema de rede/host.");
    console.error("Detalhes do Erro:", err.message);
  } finally {
    // Encerra o pool
    await pool.end(); 
  }
}

testConnection();