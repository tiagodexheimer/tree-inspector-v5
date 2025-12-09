// src/repositories/user-repository.ts
import pool from "@/lib/db";

export interface UserPersistence {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'paid_user' | 'free_user';
  organization_id?: number; // [NOVO]
  plan_type?: string;       // [NOVO]
}

export interface CreateUserRepoDTO {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}

export const UserRepository = {
  // Busca usuário E dados da organização
  async findByEmail(email: string): Promise<UserPersistence | null> {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.password, u.role, 
        u.organization_id, 
        o.plan_type
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  },

  async findAll(): Promise<UserPersistence[]> {
    const query = "SELECT id, name, email, role, organization_id FROM users ORDER BY name ASC";
    const result = await pool.query(query);
    return result.rows;
  },

  // [MODIFICADO] Cria Usuário E Organização em uma transação
  async createWithOrganization(data: CreateUserRepoDTO): Promise<UserPersistence> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Cria a Organização (Nome do usuário = Nome da Org para Free)
      const orgQuery = `
        INSERT INTO organizations (name, plan_type) 
        VALUES ($1, 'Free') 
        RETURNING id, plan_type
      `;
      const orgRes = await client.query(orgQuery, [data.name]);
      const orgId = orgRes.rows[0].id;
      const planType = orgRes.rows[0].plan_type;

      // 2. Cria o Usuário vinculado à Organização
      const userQuery = `
        INSERT INTO users (id, name, email, password, role, organization_id) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) 
        RETURNING id, name, email, role
      `;
      const userRes = await client.query(userQuery, [
        data.name, 
        data.email, 
        data.passwordHash, 
        data.role,
        orgId
      ]);

      await client.query('COMMIT');
      
      return { 
        ...userRes.rows[0], 
        organization_id: orgId,
        plan_type: planType
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Erro no UserRepository.createWithOrganization:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Mantendo compatibilidade (apenas redireciona se necessário ou remove)
  async create(data: CreateUserRepoDTO) {
      return this.createWithOrganization(data);
  },
  
  async delete(id: string): Promise<boolean> {
     // ... (manter código existente de delete)
     const res = await pool.query("DELETE FROM users WHERE id=$1", [id]);
     return (res.rowCount ?? 0) > 0;
  }
};