import bcrypt from "bcryptjs";
import { UserRepository, UserPersistence } from "@/repositories/user-repository";

// Ajuste: 'name' agora é opcional (? ou | null) para flexibilidade
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

  // Método genérico de criação (usado pelo Admin e internamente pelo Register)
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

    // 3. Hashing
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 4. Persistência
    return await UserRepository.create({
      name: input.name || "", // Garante string vazia se for nulo, ou ajuste conforme seu DB
      email: input.email,
      passwordHash: passwordHash,
      role: input.role
    });
  }

  // --- NOVO MÉTODO: Auto-cadastro (Sign Up) ---
  // Recebe apenas o necessário, sem permitir escolha de 'role'
  async registerUser(input: { name?: string; email: string; password: string }): Promise<UserPersistence> {
    return this.createUser({
      ...input,
      role: 'free_user' // Regra de Negócio: Auto-cadastro é sempre 'free_user'
    });
  }

  // ... (método deleteUser mantido igual) ...
  async deleteUser(userIdToDelete: string, currentAdminId: string): Promise<void> {
     if (userIdToDelete === currentAdminId) {
       throw new Error("Você não pode apagar a si mesmo.");
     }
     const wasDeleted = await UserRepository.delete(userIdToDelete);
     if (!wasDeleted) {
       throw new Error("Usuário não encontrado.");
     }
  }
}

export const userManagementService = new UserManagementService();