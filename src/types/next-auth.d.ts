// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
// [CORREÇÃO] Importa o tipo centralizado
import { UserRole } from "./auth-types"; 

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    organizationId: number;
    // [ATUALIZADO] Usa o tipo centralizado
    role: UserRole; 
    organizationName: string;
    plan_type: string;
  }
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      organizationId: number;
      // [ATUALIZADO] Usa o tipo centralizado
      role: UserRole;
      organizationName: string;
      plan_type: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    organizationId: number;
    // [ATUALIZADO] Usa o tipo centralizado
    role: UserRole; 
    organizationName: string;
    plan_type: string;
  }
}