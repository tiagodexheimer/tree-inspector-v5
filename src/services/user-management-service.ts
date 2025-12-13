// src/services/user-management-service.ts

// Recomendado: usar a lib centralizada de auth que criamos para evitar erros de build
import { hash } from "@/lib/auth"; 
// Caso não tenha criado o @/lib/auth, use: import { hash } from "bcryptjs";

import {
  UserRepository,
  UserPersistence,
} from "@/repositories/user-repository";
import { UserRole, OrganizationRole } from "@/types/auth-types";
import pool from "@/lib/db";
import { PlanType } from "@/types/auth-types"; 

// DTO para a criação de usuário (Método antigo, mantido por compatibilidade)
interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
  role: UserRole; 
}

// DTO para o registro, utilizando o PlanType centralizado
interface RegisterUserInput { 
    name?: string; 
    email: string; 
    password: string; 
    planType: PlanType; 
}

export class UserManagementService {
  
  // --- Métodos de Leitura e CRUD Básico ---

  async listAllUsers() {
    return await UserRepository.findAll();
  }

  async getUserByEmail(email: string) {
    return await UserRepository.findByEmail(email);
  }

  async deleteUser(id: string, adminId: string) {
    return await UserRepository.delete(id); 
  }

  // --- Método Antigo (Mantido por compatibilidade) ---
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

    const passwordHash = await hash(input.password);
    
    return await UserRepository.createWithOrganization({
      name: input.name || "Sem Nome",
      email: input.email,
      passwordHash,
      role: input.role as UserRole,
      planType: 'free' as PlanType 
    });
  }

  // --- CORE: Registro de Novo Usuário (Otimizado com Trigger) ---
  async registerUser(input: RegisterUserInput) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Verifica duplicidade
      const existingRes = await client.query('SELECT id FROM users WHERE email = $1', [input.email]);
      if (existingRes.rows.length > 0) {
        throw new Error("Email já cadastrado.");
      }
      
      const orgPlanType = input.planType;
      // Mapeamento: Role do usuário no sistema = tipo do plano
      const userRole: UserRole = orgPlanType as UserRole; 
      
      // 2. Cria a Organização (Inicialmente sem owner definido)
      const orgName = input.name ? `${input.name} Org` : 'Minha Organização';
      const orgRes = await client.query(
        'INSERT INTO organizations (name, plan_type) VALUES ($1, $2) RETURNING id', 
        [orgName, orgPlanType]
      );
      const newOrgId = orgRes.rows[0].id;

      // 3. Cria o Usuário vinculado à organização
      const passwordHash = await hash(input.password);
      const userRes = await client.query(`
        INSERT INTO users (id, name, email, password, role, organization_id) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) 
        RETURNING id, name, email, role, organization_id as "organizationId"
      `, [input.name, input.email, passwordHash, userRole, newOrgId]); 

      const newUserId = userRes.rows[0].id;

      // 4. [OTIMIZADO] Atualiza o owner_id na organização
      // O Trigger 'sync_org_owner_member' no banco detectará isso e
      // INSERIRÁ AUTOMATICAMENTE o usuário em 'organization_members' como 'owner'.
      await client.query(`
        UPDATE organizations SET owner_id = $1 WHERE id = $2
      `, [newUserId, newOrgId]);

      await client.query('COMMIT');
      
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

  // --- Métodos de Gestão de Organização (Necessários para UI) ---

  /**
   * Lista membros da organização.
   */
  async listOrganizationMembers(organizationId: number) {
      return await UserRepository.findAllByOrganization(organizationId);
  }

  /**
   * Permite sair da organização (se não for o único dono).
   */
  async leaveOrganization(userId: string, organizationId: number): Promise<void> {
      const user = await UserRepository.findByEmail((await UserRepository.findById(userId))?.email || ''); // Re-busca para garantir dados
      
      if (!user || user.organizationId !== organizationId) {
          throw new Error("Usuário não pertence a esta organização.");
      }

      // Verifica se é owner
      if (user.organizationRole === 'owner') {
           // Opcional: Verificar se há outros owners antes de bloquear
           throw new Error("O dono da organização não pode sair. Transfira a propriedade ou exclua a organização.");
      }

      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          
          // 1. Remove da tabela de membros
          await client.query(
              'DELETE FROM organization_members WHERE user_id = $1 AND organization_id = $2', 
              [userId, organizationId]
          );

          // 2. Remove vínculo principal
          await client.query(
              'UPDATE users SET organization_id = NULL WHERE id = $1',
              [userId]
          );
          
          await client.query('COMMIT');
      } catch (e) {
          await client.query('ROLLBACK');
          throw e;
      } finally {
          client.release();
      }
  }
}

export const userManagementService = new UserManagementService();