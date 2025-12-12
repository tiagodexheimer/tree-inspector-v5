import pool from "@/lib/db";

// Interface para dados que podem ser criados ou atualizados
export interface StatusData {
    nome: string;
    cor: string;
}

// DTO completo de criação (usado em create)
export interface CreateStatusDTO extends StatusData {
    organization_id: number | null; // NULL para Status Padrão Global
    is_custom: boolean; // TRUE para Status customizado (Pro/Premium)
}

// DTO para atualização (não deve permitir mudar organization_id ou is_custom)
export interface UpdateStatusDTO {
    nome?: string;
    cor?: string;
}

// Interface de Persistência (como é armazenado no DB)
export interface StatusPersistence {
    id: number;
    nome: string;
    cor: string;
    organization_id: number | null;
    is_custom: boolean;
    is_default_global: boolean; // Necessário para a lógica de Seeding e checagem
}

export const StatusRepository = {
    // --- LEITURA MULTI-TENANT ---

    // Retorna Status Globais (NULL) e Customizados (ID=X AND is_custom=TRUE)
    async findGlobalAndCustom(organizationId: number): Promise<StatusPersistence[]> {
        try {
            const query = `
                SELECT id, nome, cor, organization_id, is_custom, is_default_global
                FROM demandas_status 
                WHERE organization_id IS NULL 
                OR (organization_id = $1 AND is_custom = TRUE)
                ORDER BY nome
            `;
            const result = await pool.query(query, [organizationId]);
            return result.rows as StatusPersistence[];
        } catch (error) {
            console.error("Erro no StatusRepository.findGlobalAndCustom:", error);
            throw new Error("Falha ao buscar status Pro/Premium.");
        }
    },

    // Retorna Status Globais (NULL) e Padrão da Org (ID=X AND is_custom=FALSE)
    async findGlobalAndDefault(organizationId: number): Promise<StatusPersistence[]> {
        try {
            const query = `
                SELECT id, nome, cor, organization_id, is_custom, is_default_global
                FROM demandas_status 
                WHERE organization_id IS NULL 
                OR (organization_id = $1 AND is_custom = FALSE)
                ORDER BY nome
            `;
            const result = await pool.query(query, [organizationId]);
            return result.rows as StatusPersistence[];
        } catch (error) {
            console.error("Erro no StatusRepository.findGlobalAndDefault:", error);
            throw new Error("Falha ao buscar status Padrão.");
        }
    },

    // Busca um status com o nome dado, que seja GLOBAL (NULL) ou pertença à ORG
    async findByName(nome: string, organizationId?: number): Promise<StatusPersistence | null> {
        try {
            const query = `
                SELECT id, nome, cor, organization_id, is_custom, is_default_global
                FROM demandas_status 
                WHERE nome = $1 AND (organization_id IS NULL OR organization_id = $2)
            `;
            const result = await pool.query(query, [nome, organizationId]);
            return (result.rows[0] as StatusPersistence) || null;
        } catch (error) {
            console.error("Erro no StatusRepository.findByName:", error);
            throw new Error("Falha ao verificar existência do status.");
        }
    },

    // findById agora inclui as novas colunas
    async findById(id: number): Promise<StatusPersistence | null> {
        try {
            const query = `
                SELECT id, nome, cor, organization_id, is_custom, is_default_global
                FROM demandas_status 
                WHERE id = $1
            `;
            const result = await pool.query(query, [id]);
            return (result.rows[0] as StatusPersistence) || null;
        } catch (error) {
            console.error("Erro no StatusRepository.findById:", error);
            throw new Error("Falha ao buscar status por ID.");
        }
    },

    async countUsageById(id: number): Promise<number> {
        // Mantido como antes
        try {
            const result = await pool.query(
                "SELECT COUNT(*) FROM demandas WHERE id_status = $1",
                [id]
            );
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            console.error("Erro no StatusRepository.countUsageById:", error);
            throw new Error("Falha ao verificar uso do status.");
        }
    },

    // --- ESCRITA MULTI-TENANT ---

    // create agora recebe organization_id, is_custom e is_default_global
    async create(data: CreateStatusDTO): Promise<StatusPersistence> {
        try {
            const query = `
                INSERT INTO demandas_status (nome, cor, organization_id, is_custom) 
                VALUES ($1, $2, $3, $4) 
                RETURNING id, nome, cor, organization_id, is_custom
            `;
            // NOTE: is_default_global não é inserido aqui, pois Status Customizados não são Globais
            const result = await pool.query(query, [
                data.nome,
                data.cor,
                data.organization_id, 
                data.is_custom,
            ]);
            return result.rows[0] as StatusPersistence;
        } catch (error) {
            console.error("Erro no StatusRepository.create:", error);
            throw new Error("Falha ao criar status.");
        }
    },

    // [CORRIGIDO] update: Agora permite edição APENAS se o Status pertencer à organização.
    // O service deve garantir que o usuário Pro/Premium só edite Status customizados
    // (ou que o service o impeça de editar Status Globais/Padrão).
    async update(id: number, organizationId: number, data: UpdateStatusDTO): Promise<StatusPersistence | null> {
        try {
            const fields: string[] = [];
            const values: (string | number)[] = [];
            let paramIndex = 1;

            if (data.nome) {
                fields.push(`nome = $${paramIndex++}`);
                values.push(data.nome);
            }
            if (data.cor) {
                fields.push(`cor = $${paramIndex++}`);
                values.push(data.cor);
            }

            if (fields.length === 0) {
                return this.findById(id); 
            }

            // Garante que APENAS status customizados E pertencentes à organização possam ser editados
            // Status Globais (organization_id IS NULL) NÃO podem ser atualizados via update()
            const query = `
                UPDATE demandas_status 
                SET ${fields.join(", ")} 
                WHERE id = $${paramIndex++} 
                AND organization_id = $${paramIndex++}
                RETURNING id, nome, cor, organization_id, is_custom, is_default_global
            `;
            values.push(id, organizationId);
            
            const result = await pool.query(query, values);
            return (result.rows[0] as StatusPersistence) || null;
        } catch (error) {
            console.error("Erro no StatusRepository.update:", error);
            throw new Error("Falha ao atualizar status.");
        }
    },

    // [CORRIGIDO] delete: Agora permite deleção APENAS se o Status pertencer à organização.
    async delete(id: number, organizationId: number): Promise<boolean> {
        try {
            // A deleção só é permitida se o status pertencer à organização (ou seja, é customizado por ela)
            const result = await pool.query(
                "DELETE FROM demandas_status WHERE id = $1 AND organization_id = $2 RETURNING id",
                [id, organizationId]
            );
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            console.error("Erro no StatusRepository.delete:", error);
            throw new Error("Falha ao deletar status.");
        }
    }
};