// src/services/invite-service.ts
import pool from "@/lib/db";
import { randomBytes } from "crypto";
import { OrganizationRole } from "@/types/auth-types";

export const inviteService = {
  
  // --- GESTÃO ---

  async listPendingInvites(organizationId: number) {
    const query = `
      SELECT id, email, role, token, expires_at 
      FROM organization_invites 
      WHERE organization_id = $1 AND expires_at > NOW() 
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [organizationId]);
    return res.rows;
  },

  async createInvite(organizationId: number, email: string, role: OrganizationRole) {
    const client = await pool.connect();
    try {
        // Validações...
        const checkQuery = `SELECT id FROM organization_invites WHERE organization_id = $1 AND email = $2 AND expires_at > NOW()`;
        const checkRes = await client.query(checkQuery, [organizationId, email]);
        if (checkRes.rowCount && checkRes.rowCount > 0) throw new Error("Convite já pendente.");

        const memberCheck = `
            SELECT u.id FROM users u
            JOIN organization_members om ON om.user_id = u.id
            WHERE u.email = $1 AND om.organization_id = $2
        `;
        const memberRes = await client.query(memberCheck, [email, organizationId]);
        if (memberRes.rowCount && memberRes.rowCount > 0) throw new Error("Usuário já é membro.");

        // Criação
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const insertQuery = `
          INSERT INTO organization_invites (organization_id, email, token, role, expires_at)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, email, role, token, expires_at
        `;
        
        const res = await client.query(insertQuery, [organizationId, email, token, role, expiresAt]);
        return res.rows[0];
    } finally {
        client.release();
    }
  },

  async revokeInvite(inviteId: number, organizationId: number) {
    await pool.query('DELETE FROM organization_invites WHERE id = $1 AND organization_id = $2', [inviteId, organizationId]);
  },

  // --- PÚBLICO / ACEITE ---

  async getInviteByToken(token: string) {
      const query = `
        SELECT i.id, i.email, i.role, i.organization_id, i.expires_at, o.name as "organizationName"
        FROM organization_invites i
        JOIN organizations o ON o.id = i.organization_id
        WHERE i.token = $1 AND i.expires_at > NOW()
      `;
      const res = await pool.query(query, [token]);
      return res.rows[0] || null;
  },

  async acceptInvite(token: string, userId: string) {
      const client = await pool.connect();
      try {
          await client.query('BEGIN');

          // Busca com Lock
          const inviteRes = await client.query(`
              SELECT * FROM organization_invites WHERE token = $1 AND expires_at > NOW() FOR UPDATE
          `, [token]);

          if (inviteRes.rowCount === 0) throw new Error("Convite inválido ou expirado.");
          const invite = inviteRes.rows[0];

          // Insere Membro
          await client.query(`
              INSERT INTO organization_members (organization_id, user_id, role)
              VALUES ($1, $2, $3)
              ON CONFLICT (organization_id, user_id) DO NOTHING
          `, [invite.organization_id, userId, invite.role]);

          // Atualiza Org Ativa do Usuário
          await client.query('UPDATE users SET organization_id = $1 WHERE id = $2', [invite.organization_id, userId]);

          // Deleta Convite
          await client.query('DELETE FROM organization_invites WHERE id = $1', [invite.id]);

          await client.query('COMMIT');
          return invite.organization_id;

      } catch (error) {
          await client.query('ROLLBACK');
          throw error;
      } finally {
          client.release();
      }
  }
};