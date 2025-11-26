// Arquivo: setup-test-db-robust.js
// Este script usa apenas módulos Node.js e pg, garantindo alta compatibilidade.
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSetup() {
  // A string de conexão é lida da variável de ambiente POSTGRES_URL.
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
      console.error("ERRO FATAL: POSTGRES_URL não está configurada.");
      process.exit(1);
  }

  const pool = new Pool({ connectionString });
  let client;

  try {
    // 1. Lendo o conteúdo do seu arquivo de schema
    const schemaPath = path.join(process.cwd(), 'src', 'scripts', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    client = await pool.connect();
    console.log(`--- INICIANDO SETUP DO BANCO DE TESTES em: ${client.database} ---`);
    
    // 2. Transação para limpar e aplicar o schema de forma atômica
    await client.query('BEGIN');
    
    // Limpa o schema public (Dropa todas as tabelas)
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    // Concede permissões (necessário após dropar o schema)
    await client.query('GRANT ALL ON SCHEMA public TO public; GRANT ALL ON SCHEMA public TO CURRENT_USER;');

    // Roda todo o script de criação de tabelas (seu schema.sql)
    await client.query(schemaSql);

    await client.query('COMMIT');
    
    console.log("--- SUCESSO: O schema (tabela 'users' incluída) foi aplicado. ---");
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error("--- FALHA: Erro ao executar SQL no banco de testes ---", error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runSetup().catch(() => process.exit(1));