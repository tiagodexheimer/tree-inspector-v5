// src/repositories/user-repository.ts
import pool from "@/lib/db";
// [CORREÇÃO] Importa a definição canônica de UserRole
import { UserRole } from "@/types/auth-types"; 

// [REMOVIDO] A definição de UserRole foi movida para '@/types/auth-types'

export interface UserPersistence {
  id: string;
  name: string;
  email: string;
  password?: string;
  // [ATUALIZADO] Utiliza o tipo importado
  role: UserRole;
  organizationId: number;
  plan_type: string;
  organizationName: string;
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
  // 1. Busca usuário E dados da organização (JOIN) - Mantido
  async findByEmail(email: string): Promise<UserPersistence | null> {
    try {
      const query = `
        SELECT 
          u.id, u.name, u.email, u.password, u.role, 
          u.organization_id as "organizationId",
          o.plan_type,
          o.name as "organizationName"
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.email = $1
    `;

      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) return null;
      // O resultado do banco de dados deve ser mapeado para o novo tipo UserPersistence
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
    // Mapeamento necessário
    return result.rows;
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
      const orgName = data.name && data.name.trim() !== '' ? data.name : 'Minha Organização';

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
    return this.createWithOrganization(data);
  },

  async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM users WHERE id = $1 RETURNING id";
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  },
  
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
    // Mapeamento necessário
    return result.rows;
  },
};