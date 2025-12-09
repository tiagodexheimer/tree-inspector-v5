// src/services/auth-service.ts
import { userManagementService } from "@/services/user-management-service";
import { compare } from "bcrypt";
// Importar o tipo UserPersistence que você definiu no repositório
import { UserPersistence } from "@/repositories/user-repository";
import { User } from "next-auth"; // Tipo padrão do NextAuth

export const AuthService = {
  // Garantimos que o retorno é compatível com o tipo User do NextAuth
  async authenticate(credentials: Partial<Record<"email" | "password", unknown>>): Promise<User | null> {
    const email = credentials?.email as string;
    const password = credentials?.password as string;

    if (!email || !password) return null;

    // Busca usuário e faz o cast para UserPersistence para acessar os campos extras
    const user = await userManagementService.getUserByEmail(email) as (UserPersistence & { organizationName: string }) | null;
    
    if (!user || !user.password) return null;

    // Valida senha
    const isValid = await compare(password, user.password);
    if (!isValid) return null;

    // Retorna o objeto compatível com NextAuth.User, com organizationId como string.
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: null, 
      // ✅ CORREÇÃO CRÍTICA: Converte number para string
      organizationId: String(user.organizationId),
      organizationName: user.organizationName, // Já está na sessão
      // ⚠️ FALTAVA: Adiciona o planType para as validações nas rotas API
      planType: user.plan_type, 
    } as User; 
  }
};
export const authService = AuthService;