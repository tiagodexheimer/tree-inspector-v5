// Arquivo: src/services/user-management-service.ts

import { hash } from "bcrypt";
import {
  UserRepository,
  UserPersistence,
} from "@/repositories/user-repository";

interface CreateUserInput {
  name?: string | null;
  email: string;
  password: string;
  role: string;
}

export class UserManagementService {
  async listAllUsers(): Promise<UserPersistence[]> {
    return await UserRepository.findAll();
  }

  // --- ADICIONE ESTE BLOCO DE CÓDIGO AQUI ---
  async getUserByEmail(email: string): Promise<UserPersistence | null> {
    return await UserRepository.findByEmail(email);
  }
  // -------------------------------------------

  async createUser(input: CreateUserInput): Promise<UserPersistence> {
    // ... (mantenha o código existente do createUser)
    if (!input.email || !input.password || !input.role) {
      throw new Error("Email, senha e papel são obrigatórios.");
    }

    const existingUser = await UserRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error("Email já cadastrado.");
    }

    const passwordHash = await hash(input.password, 10);

    return await UserRepository.create({
      name: input.name || "",
      email: input.email,
      passwordHash: passwordHash,
      role: input.role,
    });
  }

  async registerUser(input: {
    name?: string;
    email: string;
    password: string;
  }): Promise<UserPersistence> {
    return this.createUser({
      ...input,
      role: "free_user",
    });
  }

  async deleteUser(
    userIdToDelete: string,
    currentAdminId: string
  ): Promise<void> {
    // ... (mantenha o código existente do deleteUser)
    if (userIdToDelete === currentAdminId) {
      throw new Error("Você não pode apagar a si mesmo.");
    }
    const wasDeleted = await UserRepository.delete(userIdToDelete);
    if (!wasDeleted) {
      throw new Error("Usuário não encontrado.");
    }
  }
}

// Certifique-se de que esta linha existe no final do arquivo:
export const userManagementService = new UserManagementService();
