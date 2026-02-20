import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
    const connectionString = process.env.POSTGRES_URL;

    if (!connectionString) {
        console.error("ERRO: POSTGRES_URL não está configurada.");
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    const schemaPath = path.join(process.cwd(), 'src', 'scripts', 'notificacoes_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const client = await pool.connect();
    try {
        console.log("[MIGRATION] Aplicando schema de notificações...");
        await client.query(schemaSql);
        console.log("[MIGRATION] Schema de notificações aplicado com sucesso.");
    } catch (error) {
        console.error("[MIGRATION] Falha ao aplicar schema:", error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error("Erro fatal durante a migração:", err.message);
    process.exit(1);
});
