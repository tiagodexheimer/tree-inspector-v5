
import pool from "@/lib/db";
import { StatusRepository } from "@/repositories/status-repository";
import { DemandasTiposRepository } from "@/repositories/demandas-tipos-repository";

export const CustomizationService = {
    /**
     * Ativa a personalização para uma Organização (Fork Strategy).
     * 1. Copia todos os Status e Tipos Padrão (Globais) para a organização.
     * 2. Marca a organização como `uses_custom_schema = TRUE`.
     */
    async activateCustomSchema(organizationId: number) {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // 1. Verificar se já está ativado
            const orgRes = await client.query(
                "SELECT uses_custom_schema FROM organizations WHERE id = $1",
                [organizationId]
            );
            if (orgRes.rows[0]?.uses_custom_schema) {
                throw new Error("A personalização já está ativa para esta organização.");
            }

            // 2. Copiar STATUS Globais
            // Buscamos os globais "puros" (organization_id IS NULL)
            // Note: O repositório findGlobalAndDefault retornaria os da org se já existissem, 
            // mas aqui queremos garantir a cópia dos defaults do sistema.
            const globalStatus = await client.query(
                "SELECT nome, cor FROM demandas_status WHERE organization_id IS NULL"
            );

            for (const status of globalStatus.rows) {
                await client.query(
                    `INSERT INTO demandas_status (nome, cor, organization_id, is_custom, is_default_global)
           VALUES ($1, $2, $3, TRUE, FALSE)
           ON CONFLICT (organization_id, nome) DO NOTHING`,
                    [status.nome, status.cor, organizationId]
                );
            }

            // 3. Copiar TIPOS DE DEMANDA Globais
            // O mesmo princípio: buscamos os defaults do sistema
            // Precisamos também lidar com o vínculo de formulários (se houver um formulário global padrão)
            const globalTypes = await client.query(`
        SELECT dt.nome, dtf.id_formulario
        FROM demandas_tipos dt
        LEFT JOIN demandas_tipos_formularios dtf ON dt.id = dtf.id_tipo_demanda
        WHERE dt.organization_id IS NULL
      `);

            for (const tipo of globalTypes.rows) {
                const insertRes = await client.query(
                    `INSERT INTO demandas_tipos (nome, organization_id, is_custom, is_default_global)
           VALUES ($1, $2, TRUE, FALSE)
           ON CONFLICT (organization_id, nome) DO NOTHING
           RETURNING id`,
                    [tipo.nome, organizationId]
                );

                // Se inseriu (não existia), recria o vínculo com o formulário
                if (insertRes.rows.length > 0 && tipo.id_formulario) {
                    await client.query(
                        `INSERT INTO demandas_tipos_formularios (id_tipo_demanda, id_formulario) VALUES ($1, $2)`,
                        [insertRes.rows[0].id, tipo.id_formulario]
                    );
                }
            }

            // 4. Ativar Flag na Organização
            await client.query(
                "UPDATE organizations SET uses_custom_schema = TRUE WHERE id = $1",
                [organizationId]
            );

            await client.query("COMMIT");
            return { success: true };

        } catch (error) {
            await client.query("ROLLBACK");
            console.error("Erro ao ativar personalização:", error);
            throw new Error("Falha ao ativar personalização.");
        } finally {
            client.release();
        }
    },

    /**
     * Retorna o status da customização (ativo ou não)
     */
    async getCustomizationStatus(organizationId: number) {
        const res = await pool.query(
            "SELECT uses_custom_schema FROM organizations WHERE id = $1",
            [organizationId]
        );
        return {
            usesCustomSchema: res.rows[0]?.uses_custom_schema || false
        };
    }
};
