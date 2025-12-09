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

  async registerUser(input: {
    name?: string;
    email: string;
    password: string;
  }) {
    return this.createUser({ ...input, role: "free_user" });
  }
}

export const userManagementService = new UserManagementService();
