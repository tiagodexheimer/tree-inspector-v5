// src/repositories/configuracoes-repository.ts
import pool from "@/lib/db";

export interface RotaConfig {
    inicio: { lat: number; lng: number };
    fim: { lat: number; lng: number };
}

export const ConfiguracoesRepository = {
    // ✅ CORREÇÃO 1: Aceita organizationId e filtra no banco
    async getRotaConfig(organizationId: number): Promise<RotaConfig | null> {
        // A chave de segurança organization_id é adicionada à query.
        const query = `
            SELECT valor 
            FROM configuracoes 
            WHERE chave = 'padrao_rota' AND organization_id = $1
        `;
        const res = await pool.query(query, [organizationId]);
        
        if (res.rows.length === 0 || !res.rows[0].valor) return null;
        
        try {
            // Assumimos que o valor no banco é uma string JSON e precisa de parse
            return JSON.parse(res.rows[0].valor) as RotaConfig;
        } catch (e) {
            console.error("Erro ao fazer parse do JSON da configuração:", e);
            return null;
        }
    },

    // ✅ CORREÇÃO 2: Aceita organizationId e garante que a atualização é por organização
    async updateRotaConfig(organizationId: number, config: RotaConfig): Promise<void> {
        const query = `
            INSERT INTO configuracoes (chave, valor, organization_id, updated_at)
            VALUES ('padrao_rota', $1, $2, NOW())
            -- CRÍTICO: Conflito composto por chave e organization_id
            ON CONFLICT (chave, organization_id) 
            DO UPDATE SET valor = $1, updated_at = NOW();
        `;
        await pool.query(query, [JSON.stringify(config), organizationId]);
    }
};