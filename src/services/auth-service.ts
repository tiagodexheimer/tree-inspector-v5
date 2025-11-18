import bcrypt from "bcryptjs";
import { UserRepository } from "@/repositories/user-repository";
import { User } from "next-auth"; // Interface padrão do NextAuth

interface LoginCredentials {
  email?: string;
  password?: string;
}

export const AuthService = {
  /**
   * Verifica as credenciais e retorna o usuário seguro (sem senha) se válido.
   */
  async authenticate(credentials: LoginCredentials | undefined): Promise<User | null> {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    // 1. Busca no repositório
    const user = await UserRepository.findByEmail(credentials.email);

    if (!user || !user.password) {
      // Retornar null é mais seguro que dizer "usuário não encontrado" (evita enumeração)
      return null;
    }

    // 2. Verifica a senha (Regra de Negócio)
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.password
    );

    if (!isValidPassword) {
      return null;
    }

    // 3. Retorna apenas os dados necessários para a sessão (DTO)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
};