// src/services/organization-service.ts
import pool from "@/lib/db";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/config/organization-defaults";

// [NOVO] Função auxiliar para Slug (pode estar fora da classe)
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres que não são letras, números, espaços ou hífens
    .replace(/[\s_-]+/g, '-') // Substitui espaços e hífens múltiplos por um único hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens do início e do fim
}

export class OrganizationService {
    
    // [NOVO] Método para garantir que o slug seja único no banco (com tentativa e erro)
    async createUniqueSlug(baseSlug: string, client: any, count: number = 0): Promise<string> {
        const testSlug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
        
        const checkQuery = 'SELECT slug FROM organizations WHERE slug = $1 LIMIT 1';
        // Usa o cliente da transação para evitar problemas
        const result = await client.query(checkQuery, [testSlug]);
        
        if (result.rowCount === 0) {
            return testSlug;
        } else {
            // Se existir, tenta o próximo número recursivamente
            return this.createUniqueSlug(baseSlug, client, count + 1);
        }
    }

    async createOrganizationForUser(userId: string, userName: string, planType: 'free' | 'pro' = 'free') {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            const orgName = `Ambiente de ${userName}`;
            const baseSlug = createSlug(orgName);
            
            // [CRÍTICO] Chama a função de unicidade usando o cliente da transação
            const orgSlug = await this.createUniqueSlug(baseSlug, client); 

            // 1. Criar a Organização
            const orgQuery = `
                INSERT INTO organizations (name, slug, plan_type, owner_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `;
            // [CORREÇÃO] Passa o slug gerado para a query
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
}

export const organizationService = new OrganizationService();