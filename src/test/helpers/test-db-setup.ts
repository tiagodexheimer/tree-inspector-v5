import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

/**
 * Lê o arquivo schema.sql e executa no banco para garantir um estado limpo.
 */
export const resetTestDatabase = async () => {
  const schemaPath = path.join(process.cwd(), 'src', 'scripts', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    // 1. Limpa o schema public (Dropa todas as tabelas)
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    // 2. Restaura as permissões padrão
    // CORREÇÃO: Usamos CURRENT_USER em vez de 'postgres' ou 'test_user'
    // Isso funciona independentemente de qual usuário está configurado no Docker
    await client.query('GRANT ALL ON SCHEMA public TO public; GRANT ALL ON SCHEMA public TO CURRENT_USER;');

    // 3. Roda o script de criação de tabelas
    await client.query(schemaSql);
  } finally {
    client.release();
  }
};

/**
 * Fecha a conexão do pool (usado no afterAll)
 */
export const closeTestDatabase = async () => {
  if (pool) {
      await pool.end();
  }
};