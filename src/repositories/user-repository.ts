// src/repositories/user-repository.ts
import pool from "@/lib/db";
// [CORREÇÃO] Importa a definição canônica de UserRole
import { UserRole, OrganizationRole } from "@/types/auth-types";

// [REMOVIDO] A definição de UserRole foi movida para '@/types/auth-types'

export interface UserPersistence {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  organizationId: number;
  plan_type: string;
  organizationName: string;
  organizationRole: OrganizationRole;
}

export interface CreateUserRepoDTO {
  name: string;
  email: string;
  passwordHash: string;
  // [ATUALIZADO] Utiliza o tipo importado
  role: UserRole;
  planType: string;
}

export const UserRepository = {
  // 1. Busca usuário E dados da organização E papel na organização
  async findByEmail(email: string): Promise<UserPersistence | null> {
    try {
      // O JOIN com organization_members (om) é essencial para ler a role 'owner'
      // criada pelo trigger.
      const query = `
        SELECT 
          u.id, u.name, u.email, u.password, u.role, 
          u.organization_id as "organizationId",
          o.plan_type,
          o.name as "organizationName",
          om.role as "organizationRole" 
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = o.id
        WHERE u.email = $1
      `;

      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) return null;
      return result.rows[0] as UserPersistence;
    } catch (error) {
      console.error("Erro no UserRepository.findByEmail:", error);
      return null;
    }
  },

  /**
   * [CORRIGIDO/ADICIONADO] Busca um usuário pelo ID. Essencial para o aceite de convite.
   */
  async findById(id: string): Promise<UserPersistence | null> {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.password, u.role, 
        u.organization_id as "organizationId",
        o.plan_type,
        o.name as "organizationName",
        om.role as "organizationRole"  -- [IMPORTANTE] Faltava este campo
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      -- Faz o join para pegar o papel do usuário NA organização ativa
      LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = o.id
      WHERE u.id = $1
    `;

    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) return null;
      return result.rows[0] as UserPersistence;
    } catch (error) {
      console.error("Erro no UserRepository.findById:", error);
      return null;
    }
  },

  // 2. CRIAÇÃO COM ORGANIZAÇÃO (Fluxo de Cadastro / Signup)
  // Atualizado para usar o planType fornecido
  async createWithOrganization(
    data: CreateUserRepoDTO
  ): Promise<UserPersistence> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // A) Cria a Organização
      const orgName =
        data.name && data.name.trim() !== "" ? data.name : "Minha Organização";

      const orgQuery = `
        INSERT INTO organizations (name, plan_type) 
        VALUES ($1, $2) 
        RETURNING id, plan_type
      `;
      // [CORREÇÃO] Usa o planType passado no DTO
      const orgRes = await client.query(orgQuery, [orgName, data.planType]);
      const orgId = orgRes.rows[0].id;
      const planType = orgRes.rows[0].plan_type;

      // B) Cria o Usuário vinculado à Organização
      const userQuery = `
        INSERT INTO users (id, name, email, password, role, organization_id) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) 
        RETURNING id, name, email, role, organization_id as "organizationId"
      `;

      const userRes = await client.query(userQuery, [
        data.name,
        data.email,
        data.passwordHash,
        data.role, // Agora é a nova UserRole (free, basic, pro, premium)
        orgId,
      ]);

      await client.query("COMMIT");

      return {
        ...userRes.rows[0],
        plan_type: planType,
        organizationName: orgName,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no UserRepository.createWithOrganization:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Método padrão de criação (redireciona para o fluxo com organização)
  async create(data: CreateUserRepoDTO): Promise<UserPersistence> {
    // Implementação simplificada ou throw error se deve usar o service
    throw new Error(
      "Use userManagementService.registerUser para criar usuários"
    );
  },

  async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM users WHERE id = $1 RETURNING id";
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  },

  async findAll(): Promise<UserPersistence[]> {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.role, 
        u.organization_id as "organizationId",
        o.name as "organizationName",
        o.plan_type,
        om.role as "organizationRole"
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = o.id
      ORDER BY u.name ASC
    `;
    const result = await pool.query(query);
    return result.rows as UserPersistence[];
  },

  async findAllByOrganization(
    organizationId: number
  ): Promise<UserPersistence[]> {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.role, 
        om.organization_id as "organizationId",
        om.role as "organizationRole"
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = $1
      ORDER BY u.name ASC
    `;
    const result = await pool.query(query, [organizationId]);
    return result.rows as UserPersistence[];
  },

  /**
   * Lista todos os membros de uma organização específica.
   * Retorna a organization_role (papel dentro da organização) junto com os dados do usuário.
   */
  async listOrganizationMembers(organizationId: number): Promise<any[]> {
    if (!organizationId) {
      throw new Error("ID da Organização é obrigatório para listar membros.");
    }

    const query = `
            SELECT
                u.id,
                u.name,
                u.email,
                om.role AS organization_role, -- Alias para o papel na organização
                u.role AS system_role         -- Adicionamos o role do sistema (global) se necessário
            FROM users u
            JOIN organization_members om ON u.id = om.user_id
            WHERE om.organization_id = $1
            ORDER BY om.role, u.name;
        `;
    const result = await pool.query(query, [organizationId]);

    // Mapeia para o formato esperado no frontend
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.organization_role, // Retorna o papel na organização (owner, admin, member, viewer)
      systemRole: row.system_role, // Role global (free_user, paid_user, admin, etc.)
    }));
  },

  /**
   * [NOVO] Atualiza o organization_id e a role de um usuário.
   * Usado para desvincular o usuário de uma organização (passando null para newOrgId).
   */
  async updateOrganizationAndRole(
    userId: string,
    newOrgId: number | null,
    newRole: string
  ): Promise<void> {
    const query = `
            UPDATE users
            SET organization_id = $2, role = $3
            WHERE id = $1;
        `;
    // newOrgId sendo 'null' desvincula o usuário.
    await pool.query(query, [userId, newOrgId, newRole]);
  },

  /**
   * MÉTODO 1/2: Conta membros para checar a regra de saída (leaveOrganization).
   */
  async countMembersInOrganization(organizationId: number): Promise<number> {
    const query = `
            SELECT COUNT(*) FROM users
            WHERE organization_id = $1;
        `;
    const result = await pool.query(query, [organizationId]);
    // Garante que o resultado seja um número inteiro
    return parseInt(result.rows[0].count, 10);
  },

  /**
   * [NOVO] Remove o registro do usuário da tabela organization_members.
   */
  async removeUserFromOrganizationMembers(
    userId: string,
    organizationId: number
  ): Promise<void> {
    const query = `
            DELETE FROM organization_members
            WHERE user_id = $1 AND organization_id = $2;
        `;
    await pool.query(query, [userId, organizationId]);
  },

  async insertOrganizationMember(
    orgId: number,
    userId: string,
    role: string,
    client: any
  ) {
    const query = `
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, $3);
    `;
    await (client || pool).query(query, [orgId, userId, role]);
  },
};
