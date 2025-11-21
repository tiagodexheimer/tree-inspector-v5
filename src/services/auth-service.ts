// src/services/auth-service.ts
import { userManagementService } from "@/services/user-management-service";
import { compare } from "bcryptjs";

export const AuthService = {
  async authenticate(credentials: Partial<Record<"email" | "password", unknown>>) {
    const email = credentials?.email as string;
    const password = credentials?.password as string;

    if (!email || !password) return null;

    // Busca usuário
    const user = await userManagementService.getUserByEmail(email);
    if (!user || !user.password) return null;

    // Valida senha
    const isValid = await compare(password, user.password);
    if (!isValid) return null;

    // Retorna o objeto usuário limpo (sem a senha)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: null, // ou user.image se tiver
    };
  }
};