// src/services/organization-service.ts
import pool from "@/lib/db";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/config/organization-defaults";

// Função auxiliar para Slug (Mantida)
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^\w\s-]/g, '') 
    .replace(/[\s_-]+/g, '-') 
    .replace(/^-+|-+$/g, ''); 
}

export class OrganizationService {
    
    // Método auxiliar de slug (Mantido)
    async createUniqueSlug(baseSlug: string, client: any, count: number = 0): Promise<string> {
        const testSlug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
        const checkQuery = 'SELECT slug FROM organizations WHERE slug = $1 LIMIT 1';
        const result = await client.query(checkQuery, [testSlug]);
        if (result.rowCount === 0) return testSlug;
        return this.createUniqueSlug(baseSlug, client, count + 1);
    }

    // Método de criação (Mantido)
    async createOrganizationForUser(userId: string, userName: string, planType: 'free' | 'pro' = 'free') {
        // ... (seu código existente de createOrganizationForUser) ...
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            const orgName = `Ambiente de ${userName}`;
            const baseSlug = createSlug(orgName);
            const orgSlug = await this.createUniqueSlug(baseSlug, client); 

            // 1. Criar a Organização
            const orgQuery = `
                INSERT INTO organizations (name, slug, plan_type, owner_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `;
            const orgRes = await client.query(orgQuery, [orgName, orgSlug, planType, userId]);
            const orgId = orgRes.rows[0].id;

            // 2. Vincular o Usuário como Membro/Dono
            await client.query(`
                INSERT INTO organization_members (organization_id, user_id, role)
                VALUES ($1, $2, 'owner')
            `, [orgId, userId]);

            // 3. Inserir Status Padrão
            for (const status of DEFAULT_ORGANIZATION_SETTINGS.statuses) {
                await client.query(`
                    INSERT INTO demandas_status (organization_id, nome, cor)
                    VALUES ($1, $2, $3)
                `, [orgId, status.nome, status.cor]);
            }

            // 4. Inserir Tipos de Demanda Padrão
            for (const tipo of DEFAULT_ORGANIZATION_SETTINGS.types) {
                await client.query(`
                    INSERT INTO demandas_tipos (organization_id, nome)
                    VALUES ($1, $2)
                `, [orgId, tipo]);
            }

            // 5. Inserir Configurações Padrão (Rota)
            await client.query(`
                INSERT INTO configuracoes (organization_id, chave, valor)
                VALUES ($1, $2, $3)
            `, [orgId, DEFAULT_ORGANIZATION_SETTINGS.config.chave, JSON.stringify(DEFAULT_ORGANIZATION_SETTINGS.config.valor)]);

            await client.query('COMMIT');
            return { organizationId: orgId, name: orgName };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Erro ao criar organização padrão:", error); 
            throw new Error("Falha ao configurar o ambiente do usuário."); 
        } finally {
            client.release();
        }
    }

    // [NOVO MÉTODO] Atualizar Organização
    async updateOrganization(organizationId: number, data: { name: string }) {
        if (!data.name || data.name.trim().length < 3) {
            throw new Error("O nome da organização deve ter pelo menos 3 caracteres.");
        }

        const query = `
            UPDATE organizations 
            SET name = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name
        `;
        
        const result = await pool.query(query, [data.name, organizationId]);
        
        if (result.rowCount === 0) {
            throw new Error("Organização não encontrada.");
        }
        
        return result.rows[0];
    }
}

export const organizationService = new OrganizationService();