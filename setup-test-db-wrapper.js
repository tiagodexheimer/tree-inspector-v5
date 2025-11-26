// Arquivo: setup-test-db-fixed.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSetup() {
  // A string de conexão é fornecida como variável de ambiente no comando de execução.
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
      console.error("ERRO FATAL: POSTGRES_URL não está configurada. Não é possível conectar.");
      process.exit(1);
  }

  // 1. Cria um pool de conexão diretamente com a string de teste
  const pool = new Pool({ connectionString });
  
  // 2. Localiza e lê o seu arquivo src/scripts/schema.sql
  const schemaPath = path.join(process.cwd(), 'src', 'scripts', 'schema.sql');
  // Se o caminho acima falhar, tente o caminho abaixo:
  // const schemaPath = path.resolve(__dirname, 'src', 'scripts', 'schema.sql'); 
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log(`--- INICIANDO SETUP DO BANCO DE TESTES em: ${connectionString} ---`);
    
    // Limpa o schema public (Dropa todas as tabelas para garantir limpeza)
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    // Concede permissões necessárias
    await client.query('GRANT ALL ON SCHEMA public TO public; GRANT ALL ON SCHEMA public TO CURRENT_USER;');

    // Roda o script de criação de tabelas
    await client.query(schemaSql);
    
    console.log("--- SUCESSO: O schema (tabela 'users' incluída) foi aplicado. ---");
  } catch (error) {
    console.error("--- FALHA: Erro ao executar SQL no banco de testes. Verifique o Docker. ---", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runSetup().catch(err => {
    console.error("ERRO FATAL: Falha no processo de inicialização.", err.message);
    process.exit(1);
});