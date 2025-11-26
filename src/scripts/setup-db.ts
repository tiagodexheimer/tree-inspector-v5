// scripts/setup-db.ts
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Esta função limpa e recria todas as tabelas usando o schema.sql
async function setupDatabase() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("ERRO: POSTGRES_URL não está configurada. Não é possível conectar.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  // Caminho do seu arquivo de schema
  const schemaPath = path.join(process.cwd(), 'src', 'scripts', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log("[SETUP] Limpando e recriando o schema do banco de testes...");
    
    // Limpa o schema public (Dropa todas as tabelas)
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    // Roda o script de criação de tabelas (incluindo 'users')
    await client.query(schemaSql);
    
    console.log("[SETUP] Banco de testes inicializado com sucesso (tabela 'users' criada).");
  } catch (error) {
    console.error("[SETUP] Falha na inicialização do schema:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase().catch(err => {
    console.error("Erro fatal durante o setup:", err.message);
    process.exit(1);
});