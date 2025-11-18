// src/services/user-management-service.ts
import bcrypt from "bcryptjs";
// CORREÇÃO: Importamos UserPersistence em vez de UserPublicDTO
import { UserRepository, UserPersistence } from "@/repositories/user-repository";

// Interface interna para o input deste serviço
interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: string;
}

export class UserManagementService {
  
  // Retorna UserPersistence[] compatível com o repositório
  async listAllUsers(): Promise<UserPersistence[]> {
    return await UserRepository.findAll();
  }

  async createUser(input: CreateUserInput): Promise<UserPersistence> {
    // 1. Validação básica
    if (!input.email || !input.password || !input.role) {
      throw new Error("Email, senha e papel são obrigatórios.");
    }

    // 2. Verificar duplicidade
    const existingUser = await UserRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error("Email já cadastrado.");
    }

    // 3. Hashing de senha
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 4. Persistência
    // O objeto passado aqui deve corresponder ao CreateUserRepoDTO do repositório
    const newUser = await UserRepository.create({
      name: input.name,
      email: input.email,
      passwordHash: passwordHash, // Note que passamos o hash aqui
      role: input.role
    });

    return newUser;
  }
}

export const userManagementService = new UserManagementService();