// src/services/auth-service.ts
import bcrypt from "bcryptjs";
import { UserRepository } from "@/repositories/user-repository";

export const AuthService = {
  async authenticate(credentials: Partial<Record<string, unknown>>) {
    const email = credentials?.email as string | undefined;
    const password = credentials?.password as string | undefined;

    // 1. Validação básica de entrada
    if (!email || !password) {
      return null;
    }

    // 2. Busca o utilizador (delegando para o repositório)
    const user = await UserRepository.findByEmail(email);

    if (!user || !user.password) {
      return null;
    }

    // 3. Validação de segurança (bcrypt)
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return null;
    }

    // 4. Sanitização (Remove a senha antes de devolver para o NextAuth)
    // O NextAuth usará este objeto para criar o token JWT
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
};