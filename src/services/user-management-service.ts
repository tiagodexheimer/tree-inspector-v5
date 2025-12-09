// src/services/user-management-service.ts

import { hash } from "bcrypt";
import {
  UserRepository,
  UserPersistence,
} from "@/repositories/user-repository";
// [CORREÇÃO] Importa o novo serviço que cria a Organização e o Seed
import { organizationService } from "@/services/organization-service";

// DTO para a criação de usuário
interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
  role: "admin" | "paid_user" | "free_user";
}

export class UserManagementService {
  async listAllUsers() {
    return await UserRepository.findAll();
  }
  async getUserByEmail(email: string) {
    return await UserRepository.findByEmail(email);
  }
  async deleteUser(id: string, adminId: string) {
    return await UserRepository.delete(id);
  } // Simplificado para exemplo

  async createUser(input: {
    name?: string | null;
    email: string;
    password: string;
    role: string;
  }): Promise<UserPersistence> {
    if (!input.email || !input.password || !input.role) {
      throw new Error("Dados obrigatórios faltando.");
    }

    const existing = await UserRepository.findByEmail(input.email);
    if (existing) throw new Error("Email já cadastrado.");

    const passwordHash = await hash(input.password, 10);

    // [CORREÇÃO] Usa o método que cria a organização junto
    return await UserRepository.createWithOrganization({
      name: input.name || "Sem Nome",
      email: input.email,
      passwordHash,
      role: input.role,
    });
  }

  async registerUser(input: { name?: string; email: string; password: string }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Verifica duplicidade
      const existingRes = await client.query('SELECT id FROM users WHERE email = $1', [input.email]);
      if (existingRes.rows.length > 0) {
        throw new Error("Email já cadastrado.");
      }

      // 2. Cria a Organização
      const orgName = input.name ? `${input.name} Org` : 'Minha Organização';
      const orgRes = await client.query(
        'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
        [orgName]
      );
      const newOrgId = orgRes.rows[0].id;

      // 3. Cria o Usuário vinculado
      const passwordHash = await hash(input.password, 10);
      const userRes = await client.query(`
        INSERT INTO users (id, name, email, password, role, organization_id) 
        VALUES (gen_random_uuid(), $1, $2, $3, 'free_user', $4) 
        RETURNING id, name, email, role, organization_id as "organizationId"
      `, [input.name, input.email, passwordHash, newOrgId]);

      // 4. (Opcional) Define o usuário como dono da organização
      // await client.query('UPDATE organizations SET owner_id = $1 WHERE id = $2', [userRes.rows[0].id, newOrgId]);

      await client.query('COMMIT');
      
      return userRes.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Erro no registro:", error);
      throw error; 
    } finally {
      client.release();
    }
  }
}

export const userManagementService = new UserManagementService();
