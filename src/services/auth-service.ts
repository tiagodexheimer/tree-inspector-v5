// src/services/auth-service.ts
import { userManagementService } from "@/services/user-management-service";
import { compare } from "bcrypt";
import { UserPersistence } from "@/repositories/user-repository";
import { User } from "next-auth"; 

export const AuthService = {
  async authenticate(
    credentials: Partial<Record<"email" | "password", unknown>>
  ): Promise<User | null> {
    const email = credentials?.email as string;
    const password = credentials?.password as string;

    if (!email || !password) return null;

    // Busca usuário completo com dados da organização
    const user = (await userManagementService.getUserByEmail(email)) as UserPersistence | null;

    if (!user || !user.password) return null;

    // Valida senha
    const isValid = await compare(password, user.password);
    if (!isValid) return null;

    // [CORREÇÃO] Repassa o organizationRole para o NextAuth
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // Role do sistema (basic, pro...)
      image: null,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      plan_type: user.plan_type,
      organizationRole: user.organizationRole, // <--- O PULO DO GATO: Agora é 'owner'
    } as User;
  },
};
export const authService = AuthService;