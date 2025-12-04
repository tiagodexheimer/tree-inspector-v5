// src/services/user-management-service.ts

import { hash } from "bcrypt";
import { UserRepository, UserPersistence } from "@/repositories/user-repository";
// [CORREÇÃO] Importa o novo serviço que cria a Organização e o Seed
import { organizationService } from "@/services/organization-service"; 

// DTO para a criação de usuário
interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
  role: 'admin' | 'paid_user' | 'free_user';
}

export class UserManagementService {
  
  async listAllUsers(): Promise<Omit<UserPersistence, 'password' | 'orgId' | 'planType' | 'orgRole'>[]> {
      // NOTE: Este método precisa ser atualizado para filtrar por Organização
      return UserRepository.findAll();
  }

  async getUserByEmail(email: string): Promise<UserPersistence | null> {
    return UserRepository.findByEmail(email);
  }

  async createUser(input: CreateUserInput): Promise<UserPersistence> {
    if (!input.email || !input.password || !input.role) {
      throw new Error("Email, senha e papel são obrigatórios.");
    }

    // 1. Verifica a existência de usuário antes de tentar conexão
    const existingUser = await UserRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error("Email já cadastrado.");
    }

    const passwordHash = await hash(input.password, 10);
    
    // Define o tipo de plano com base na role
    const planType = input.role === 'paid_user' ? 'pro' : 'free';

    // 2. Cria o usuário
    const newUser = await UserRepository.create({
      name: input.name || "",
      email: input.email,
      passwordHash: passwordHash,
      role: input.role,
    });

    // 3. Cria a organização padrão, popula as configurações (seed)
    try {
      const org = await organizationService.createOrganizationForUser(
          newUser.id, 
          newUser.name || "Usuário", 
          planType
      );
      
      // Retorna o objeto de persistência do usuário expandido com os dados da organização
      return {
          ...newUser,
          orgId: org.organizationId,
          planType: planType,
          orgRole: 'owner', // O usuário recém-criado é o dono da nova organização
      };
      
    } catch (error) {
        // Se a criação da organização falhar, deleta o usuário recém-criado.
        await UserRepository.delete(newUser.id);
        console.error("Falha ao criar organização para o novo usuário:", error);
        throw new Error("Falha ao configurar o ambiente de usuário. Tente novamente.");
    }
  }

  async registerUser(input: { name?: string; email: string; password: string }): Promise<UserPersistence> {
    // Quem se cadastra sozinho, entra como FREE
    return this.createUser({
      ...input,
      role: "free_user",
    });
  }
  
  async deleteUser(userId: string): Promise<boolean> {
      return UserRepository.delete(userId);
  }
}

export const userManagementService = new UserManagementService();