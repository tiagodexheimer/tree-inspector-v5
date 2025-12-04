// src/services/auth-service.ts
import { compare } from 'bcrypt'; // Deve usar o compare
import { UserRepository, UserPersistence } from '@/repositories/user-repository';

// Interface para o objeto de credenciais
export interface Credentials {
  email?: string;
  password?: string;
}

export class AuthService {
  /**
   * Tenta autenticar um usuário usando email e senha.
   * Retorna o objeto UserPersistence completo em caso de sucesso.
   */
  async authenticate(credentials: Credentials): Promise<UserPersistence | null> {
    if (!credentials.email || !credentials.password) {
      // Lança erro para ser capturado pelo NextAuth
      throw new Error("Email e senha são obrigatórios."); 
    }
    
    // 1. Buscar o usuário pelo email
    const user = await UserRepository.findByEmail(credentials.email);

    // Se o usuário não for encontrado, ou o hash da senha não estiver presente
    if (!user || !user.password) {
      return null;
    }
    
    // 2. Comparar a senha fornecida com o hash armazenado
    // O 'user.password' é o hash que vem do banco.
    const isMatch = await compare(credentials.password, user.password);

    // 3. Retornar o objeto user se a senha for válida
    if (isMatch) {
      // Retornamos o objeto completo (incluindo orgId e planType) para o NextAuth
      return user; 
    }

    return null; // Senha incorreta
  }
}

export const authService = new AuthService(); // Exporta a instância