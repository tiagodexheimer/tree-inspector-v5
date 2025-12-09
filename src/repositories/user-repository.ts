// src/repositories/user-repository.ts
import pool from "@/lib/db";

export interface UserPersistence {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "admin" | "paid_user" | "free_user";
  // [IMPORTANTE] Renomeado para camelCase para bater com o NextAuth
  organizationId: number;
  plan_type?: string;
}

export interface CreateUserRepoDTO {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}

export const UserRepository = {
  // 1. Busca usuário E dados da organização (JOIN)
  async findByEmail(email: string): Promise<UserPersistence | null> {
    try {
      // Usamos 'as "organizationId"' para o JS receber em camelCase
      const query = `
        SELECT 
          u.id, u.name, u.email, u.password, u.role, 
          u.organization_id as "organizationId",
          o.plan_type,
          o.name as "organizationName" -- [NOVO] Busca o nome
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
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

  async findAll(): Promise<UserPersistence[]> {
    const query = `
      SELECT id, name, email, role, organization_id as "organizationId" 
      FROM users 
      ORDER BY name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // 2. CRIAÇÃO COM ORGANIZAÇÃO (Fluxo de Cadastro / Signup)
  // Cria uma organização "Free" automaticamente para o novo usuário
  async createWithOrganization(
    data: CreateUserRepoDTO
  ): Promise<UserPersistence> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // A) Cria a Organização
      // Usa o nome do usuário como nome da empresa inicial (ex: "Empresa de João")
      const orgName = data.name && data.name.trim() !== '' ? data.name : 'Minha Organização';

      const orgQuery = `
        INSERT INTO organizations (name, plan_type) 
        VALUES ($1, 'Free') 
        RETURNING id, plan_type
      `;
      const orgRes = await client.query(orgQuery, [orgName]);
      const orgId = orgRes.rows[0].id;
      const planType = orgRes.rows[0].plan_type;

      // B) Cria o Usuário vinculado à Organização recém-criada
      const userQuery = `
        INSERT INTO users (id, name, email, password, role, organization_id) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) 
        RETURNING id, name, email, role, organization_id as "organizationId"
      `;

      const userRes = await client.query(userQuery, [
        data.name,
        data.email,
        data.passwordHash,
        data.role, // Geralmente 'free_user'
        orgId,
      ]);

      await client.query("COMMIT");

      // Retorna o objeto combinado
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
  // Isso mantém compatibilidade com o Service existente
  async create(data: CreateUserRepoDTO): Promise<UserPersistence> {
    return this.createWithOrganization(data);
  },

  async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM users WHERE id = $1 RETURNING id";
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  },
  // Busca apenas usuários da organização específica para preencher dropdowns
  async findAllByOrganization(
    organizationId: number
  ): Promise<UserPersistence[]> {
    const query = `
      SELECT id, name, email, role, organization_id as "organizationId"
      FROM users
      WHERE organization_id = $1
      ORDER BY name ASC
    `;
    const result = await pool.query(query, [organizationId]);
    return result.rows;
  },
};
