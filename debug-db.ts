
import pool from './src/lib/db';

async function run() {
    try {
        console.log("Checking DB for Type: Avaliação, Org: 1");

        // 1. Check Types
        const types = await pool.query(`
            SELECT id, nome, organization_id, is_custom 
            FROM demandas_tipos 
            WHERE nome = 'Avaliação' AND (organization_id = 1 OR organization_id IS NULL)
        `);
        console.log("Types found:", types.rows);

        // 2. Check Links
        for (const t of types.rows) {
            const link = await pool.query(`
                SELECT * FROM demandas_tipos_formularios WHERE id_tipo_demanda = $1
            `, [t.id]);
            console.log(`Link for Type ${t.id}:`, link.rows);

            if (link.rows.length > 0) {
                const formId = link.rows[0].id_formulario;
                const form = await pool.query(`SELECT id, nome, definicao_campos FROM formularios WHERE id = $1`, [formId]);
                console.log(`Form Definition for Form ${formId}:`, form.rows[0]?.definicao_campos ? "EXISTS" : "NULL/EMPTY");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
