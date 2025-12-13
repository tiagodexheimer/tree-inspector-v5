// src/services/invite-service.ts
import { InviteRepository } from "@/repositories/invite-repository";
import { UserRepository } from "@/repositories/user-repository";
import pool from "@/lib/db";
import crypto from "crypto";

// Mapeamento das regras de limite para planos
const INVITE_LIMITS: Record<string, number | 'unlimited'> = {
    'free': 0, 
    'basic': 5,          // Seu plano Basic tem limite de 5
    'pro': 'unlimited',      // Seu plano Pro é ilimitado
    'premium': 'unlimited',  // Seu plano Premium é ilimitado
    'admin': 'unlimited',
    'none': 0, // Fallback seguro
};
interface CreateInviteInput {
  organizationId: number;
  inviterRole: string;
  email: string;
  role: "member" | "viewer" | "admin";
}

export class InviteService {
  /**
   * [NOVO] Lista convites ativos. Chamado pela rota /api/gerenciar/convites (GET).
   */
  async listActiveInvites(organizationId: number) {
    return await InviteRepository.listActiveInvites(organizationId);
  }

  /**
   * Lógica para criar um convite, incluindo verificação de limites. (Mantido da resposta anterior)
   */
  export const InviteService = {
  // LISTAR Convites Pendentes da Organização
  async listPendingInvites(organizationId: number) {
    const query = `
      SELECT id, email, role, token, expires_at 
      FROM organization_invites 
      WHERE organization_id = $1 
      AND expires_at > NOW() -- Apenas convites válidos
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [organizationId]);
    return res.rows;
  },

  // CRIAR Novo Convite
  async createInvite(organizationId: number, email: string, role: OrganizationRole) {
    // 1. Verifica se já existe um convite pendente para este email nesta org
    const checkQuery = `
        SELECT id FROM organization_invites 
        WHERE organization_id = $1 AND email = $2 AND expires_at > NOW()
    `;
    const checkRes = await pool.query(checkQuery, [organizationId, email]);
    
    if (checkRes.rowCount && checkRes.rowCount > 0) {
        throw new Error("Já existe um convite pendente para este e-mail.");
    }

    // 2. Verifica se o usuário JÁ É membro da organização
    const memberCheck = `
        SELECT u.id FROM users u
        JOIN organization_members om ON om.user_id = u.id
        WHERE u.email = $1 AND om.organization_id = $2
    `;
    const memberRes = await pool.query(memberCheck, [email, organizationId]);
    if (memberRes.rowCount && memberRes.rowCount > 0) {
        throw new Error("Este usuário já é membro da organização.");
    }

    // 3. Gera Token e Expiração (7 dias)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 4. Insere no Banco
    const insertQuery = `
      INSERT INTO organization_invites (organization_id, email, token, role, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role, token, expires_at
    `;
    
    const res = await pool.query(insertQuery, [organizationId, email, token, role, expiresAt]);
    return res.rows[0];
  },

  // REVOGAR (Deletar) Convite
  async revokeInvite(inviteId: number, organizationId: number) {
    const query = `
        DELETE FROM organization_invites 
        WHERE id = $1 AND organization_id = $2
    `;
    await pool.query(query, [inviteId, organizationId]);
  },
  
  /**
   * Processa a aceitação do convite e adiciona o usuário à organização. (Mantido da resposta anterior)
   */
  async acceptInvite(token: string, acceptingUserId: string) {
    const client = await pool.connect();

    try {
      // ... (Lógica de aceitação) ...
      await client.query("BEGIN");

      const invite = await InviteRepository.findByToken(token);
      if (!invite) throw new Error("Convite inválido ou expirado.");

      const user = await UserRepository.findById(acceptingUserId);
      if (!user) throw new Error("Usuário não encontrado.");

      // 1. Verifica se o email do usuário logado corresponde ao convite
      if (user.email !== invite.email) {
        throw new Error("Este convite não é para sua conta de e-mail.");
      }

      // 2. Adiciona o usuário como membro da organização (com a role do convite)
      await client.query(
        `
                INSERT INTO organization_members (organization_id, user_id, role)
                VALUES ($1, $2, $3)
                ON CONFLICT (organization_id, user_id) 
                DO UPDATE SET role = EXCLUDED.role;
            `,
        [invite.organization_id, acceptingUserId, invite.role]
      );

      // 3. Atualiza o organization_id principal do usuário (se não estiver definido)
      await client.query(
        `
                UPDATE users SET organization_id = $1 
                WHERE id = $2 AND organization_id IS NULL;
            `,
        [invite.organization_id, acceptingUserId]
      );

      // 4. Deleta o convite
      await InviteRepository.delete(invite.id);

      await client.query("COMMIT");

      // Retorna o organizationId para o frontend poder redirecionar
      return invite.organization_id;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao aceitar convite:", error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async cancelInvite(inviteId: number, organizationId: number): Promise<void> {
        const invite = await InviteRepository.findByInviteId(inviteId);

        if (!invite) {
            throw new Error("Convite não encontrado ou já expirado/aceito.");
        }

        // [Security Check] Garante que a organização logada é a dona do convite
        if (invite.organization_id !== organizationId) {
            throw new Error("Você não tem permissão para cancelar este convite.");
        }

        await InviteRepository.delete(inviteId);
    }
}

export const inviteService = new InviteService();
