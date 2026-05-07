import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '../.env.local') });

async function run() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  console.log('--- Checking URL Formats ---');

  const res = await pool.query("SELECT anexos FROM demandas WHERE anexos IS NOT NULL AND anexos != '[]' LIMIT 3");
  console.log('DEMANDAS ANEXOS:', JSON.stringify(res.rows, null, 2));
  
  const res2 = await pool.query("SELECT fotos FROM notificacoes WHERE fotos IS NOT NULL AND fotos != '[]' LIMIT 3");
  console.log('NOTIFICACOES FOTOS:', JSON.stringify(res2.rows, null, 2));

  const res3 = await pool.query("SELECT respostas FROM vistorias_realizadas WHERE respostas IS NOT NULL LIMIT 3");
  console.log('VISTORIAS RESPOSTAS:', JSON.stringify(res3.rows, null, 2));

  await pool.end();
}
run();
