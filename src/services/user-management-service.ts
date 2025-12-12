// src/services/user-management-service.ts

import { hash } from "bcrypt";
import {
  UserRepository,
  UserPersistence,
} from "@/repositories/user-repository";
import { UserRole } from "@/types/auth-types";
import { organizationService } from "@/services/organization-service";
import pool from "@/lib/db";
// [CORREÇÃO SOLID/DRY] Importa o tipo centralizado para Plano
import { PlanType } from "@/types/auth-types"; 

// DTO para a criação de usuário (Método antigo, mantido por compatibilidade)
interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
  role: UserRole; 
}

// [ATUALIZADO] DTO para o registro, utilizando o PlanType centralizado
interface RegisterUserInput { 
    name?: string; 
    email: string; 
    password: string; 
    planType: PlanType; // Utiliza o tipo centralizado
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
  }

  // Método antigo para criar usuário (mantido por compatibilidade)
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
    
    // Passa role e planType padrão para o Repositório
    return await UserRepository.createWithOrganization({
      name: input.name || "Sem Nome",
      email: input.email,
      passwordHash,
      role: input.role as UserRole, // Assume que a role é válida e faz o cast
      planType: 'free' as PlanType // PlanType padrão se não for fornecido
    });
  }

  // [COMPLETO] Função registerUser com lógica de planos e novas roles
  async registerUser(input: RegisterUserInput) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Verifica duplicidade
      const existingRes = await client.query('SELECT id FROM users WHERE email = $1', [input.email]);
      if (existingRes.rows.length > 0) {
        throw new Error("Email já cadastrado.");
      }
      
      // 2. Define a Role do usuário E o Plan Type da organização
      const orgPlanType = input.planType;
      // Mapeamento: A role do usuário agora é exatamente o tipo de plano
      const userRole: UserRole = orgPlanType as UserRole; 
      
      // 3. Cria a Organização (passando o plan_type)
      const orgName = input.name ? `${input.name} Org` : 'Minha Organização';
      const orgRes = await client.query(
        // Inserir plan_type na tabela organizations
        'INSERT INTO organizations (name, plan_type) VALUES ($1, $2) RETURNING id', 
        [orgName, orgPlanType]
      );
      const newOrgId = orgRes.rows[0].id;

      // 4. Cria o Usuário vinculado
      const passwordHash = await hash(input.password, 10);
      const userRes = await client.query(`
        INSERT INTO users (id, name, email, password, role, organization_id) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) 
        RETURNING id, name, email, role, organization_id as "organizationId"
      `, [input.name, input.email, passwordHash, userRole, newOrgId]); // Usa o userRole

      await client.query('COMMIT');
      
      // Retorna dados do usuário e do plano da organização
      return {
        ...userRes.rows[0],
        plan_type: orgPlanType,
        organizationName: orgName
      }; 

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