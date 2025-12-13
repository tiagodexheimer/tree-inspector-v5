// src/repositories/invite-repository.ts
import pool from "@/lib/db"; // [CORREÇÃO] Importa a conexão correta: 'pool'
import crypto from 'crypto';

export interface InvitePersistence {
  id: number;
  organization_id: number;
  email: string;
  token: string;
  role: 'member' | 'viewer' | 'admin';
  expires_at: Date;
  created_at: Date;
  // Adicionado para o GET de convites pendentes no Dashboard
  organization_name?: string; 
}

export const InviteRepository = {

    /**
     * Cria um novo convite no banco de dados.
     */
    async create(organizationId: number, email: string, role: string, token: string): Promise<InvitePersistence> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const query = `
            INSERT INTO organization_invites (organization_id, email, token, role, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await pool.query(query, [organizationId, email, token, role, expiresAt]);
        return result.rows[0];
    },

    /**
     * Conta quantos convites ativos (não expirados) a organização possui.
     */
    async countActiveInvites(organizationId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) FROM organization_invites 
            WHERE organization_id = $1 AND expires_at > NOW();
        `;
        const result = await pool.query(query, [organizationId]);
        return parseInt(result.rows[0].count, 10);
    },
    
    /**
     * [CORRIGIDO] Lista convites ativos que foram enviados para um email específico.
     */
    async findPendingByEmail(email: string): Promise<InvitePersistence[]> {
        // [CORREÇÃO] O banco de dados é referenciado como 'pool'
        const query = `
            SELECT 
                oi.id, 
                oi.organization_id, 
                oi.token, 
                oi.role, 
                oi.expires_at, 
                o.name AS organization_name  
            FROM organization_invites oi
            JOIN organizations o ON oi.organization_id = o.id
            WHERE oi.email = $1 AND oi.expires_at > NOW()
            ORDER BY oi.created_at DESC;
        `;
        const result = await pool.query(query, [email]); // [CORREÇÃO] Uso de pool.query
        
        // Mapeia para garantir que o resultado tenha o organization_name
        return result.rows.map(row => ({
            id: row.id,
            organization_id: row.organization_id,
            organization_name: row.organization_name,
            token: row.token,
            role: row.role,
            expires_at: row.expires_at,
        }));
    },

    /**
     * Lista todos os convites ativos para uma organização específica.
     */
    async listActiveInvites(organizationId: number): Promise<InvitePersistence[]> {
        const query = `
            SELECT * FROM organization_invites
            WHERE organization_id = $1 AND expires_at > NOW()
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query, [organizationId]);
        return result.rows;
    },

    /**
     * Busca um convite pelo token para aceitação.
     */
    async findByToken(token: string): Promise<InvitePersistence | null> {
        const query = `
            SELECT * FROM organization_invites
            WHERE token = $1 AND expires_at > NOW();
        `;
        const result = await pool.query(query, [token]);
        return result.rows[0] || null;
    },
    
    /**
     * Busca um convite pelo ID, para verificações de segurança.
     */
    async findByInviteId(id: number): Promise<InvitePersistence | null> {
        const query = 'SELECT * FROM organization_invites WHERE id = $1;';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    /**
     * Deleta um convite (usado após a aceitação ou para cancelamento manual).
     */
    async delete(id: number): Promise<void> {
        await pool.query('DELETE FROM organization_invites WHERE id = $1', [id]);
    }
};