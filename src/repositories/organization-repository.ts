// src/repositories/organization-repository.ts

import pool from "@/lib/db";

// Interface base para a persistência da organização no banco de dados
export interface OrganizationPersistence {
    id: number;
    name: string;
    plan_type: 'Free' | 'Basic' | 'Pro' | 'Premium'; // Ou os nomes de plano que você usa
    created_at?: Date;
    updated_at?: Date;
}

export const OrganizationRepository = {

    /**
     * Busca uma organização pelo seu ID.
     */
    async findById(id: number): Promise<OrganizationPersistence | null> {
        const query = 'SELECT * FROM organizations WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    /**
     * [NOVO] Atualiza apenas o nome da organização.
     * Retorna a organização atualizada.
     */
    async updateName(id: number, newName: string): Promise<OrganizationPersistence | null> {
        const query = `
            UPDATE organizations 
            SET name = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING id, name, plan_type
        `;

        const result = await pool.query(query, [newName, id]);

        if (result.rows.length === 0) return null;
        
        return result.rows[0]; 
    },

    // ----------------------------------------------------------------------
    // OBS: Você pode adicionar outros métodos aqui, se necessário:
    // ----------------------------------------------------------------------
    
    /*
    // Exemplo: Deleta uma organização
    async delete(id: number): Promise<boolean> {
        const query = 'DELETE FROM organizations WHERE id = $1 RETURNING id';
        const res = await pool.query(query, [id]);
        return (res.rowCount ?? 0) > 0;
    }
    */
    
    /*
    // Exemplo: Busca organização pelo nome
    async findByName(name: string): Promise<OrganizationPersistence | null> {
        const query = 'SELECT * FROM organizations WHERE name = $1';
        const result = await pool.query(query, [name]);
        return result.rows[0] || null;
    }
    */
};