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
  async createInvite(input: CreateInviteInput) {
        // Usa a role da sessão, garantindo minúsculas e fallback
        const inviterRole = input.inviterRole ? input.inviterRole.toLowerCase() : 'none'; 
        
        // Agora, 'pro' será lido corretamente como 'unlimited'
        const limit = INVITE_LIMITS[inviterRole] || 0;

        console.log(`[InviteService] User Role: ${inviterRole}, Resolved Limit: ${limit}`);

        if (limit === 0) {
            // Mensagem de erro mais clara
            throw new Error(`Seu papel no sistema (${inviterRole.toUpperCase()}) não tem permissão de convite.`);
        }

    // O restante da lógica de limite e criação de convite é mantida:

    const activeInvitesCount = await InviteRepository.countActiveInvites(
      input.organizationId
    );

    if (limit !== "unlimited" && activeInvitesCount >= limit) {
      throw new Error(
        `Limite de ${limit} convites ativos atingido para o seu plano.`
      );
    }

    // 1. Gera Token Único
    const token = crypto.randomBytes(32).toString("hex");

    // 2. Verifica se o e-mail já é membro da organização
    const existingUser = await UserRepository.findByEmail(input.email);
    if (
      existingUser &&
      String(existingUser.organizationId) === String(input.organizationId)
    ) {
      throw new Error("Usuário já é membro desta organização.");
    }

    // 3. Cria o Convite
    const newInvite = await InviteRepository.create(
      input.organizationId,
      input.email.toLowerCase(),
      input.role,
      token
    );

    console.log(
      `[INVITE] Convite criado para ${newInvite.email}. Token: ${token}`
    );

    return newInvite;
  }

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
