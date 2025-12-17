// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// [NOVO] Tipo de Role centralizado, incluindo os novos planos
// Basicamente, removemos a importação do arquivo externo e definimos o tipo aqui.
type UserRole = 'admin' | 'free' | 'basic' | 'pro' | 'premium' | 'paid_user' | 'free_user' | 'pro_user' | 'premium_user';

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    organizationId: string;
    role: UserRole;
    organizationName: string;
    planType: string;
  }
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      organizationId: string;
      role: UserRole;

      organizationName: string;
      planType: string;
    } & DefaultSession["user"];
  }

  // Adiciona a interface User para garantir que o 'useSession().data.user' também tenha esses campos.
  interface User extends DefaultUser {
    id: string;
    organizationId: string;
    role: UserRole;
    organizationName: string;
    planType: string;
  }
}