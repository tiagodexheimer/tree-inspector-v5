// src/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth-service";
// [NOVO] Importar o repositório para buscar dados frescos
import { UserRepository } from "@/repositories/user-repository";

// ... (definições de adminRoutes e publicRoutes permanecem iguais) ...
const adminRoutes = [
  "/api/admin",
  "/api/admin/users",
];

const publicRoutes = [
  "/login",
  "/signup",
  "/api/auth/signup",
  "/api/mobile-login",
  "/convite",
];

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        try {
          const user = await authService.authenticate(credentials);
          if (user) return user;
          return null;
        } catch (error) {
          console.error("Falha na autenticação:", error);
          throw new Error("Email ou senha inválidos.");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {

      // 1. Login Inicial
      if (user) {
        token.id = user.id;
        token.role = user.role as any;
        token.organizationId = user.organizationId;
        token.organizationName = (user as any).organizationName;
        token.organizationRole = (user as any).organizationRole;
        token.planType = (user as any).planType;
      }

      // 2. Atualização Manual (Frontend)
      if (trigger === "update" && session) {
        if (session.organizationName) token.organizationName = session.organizationName;
        if (session.organizationRole) token.organizationRole = session.organizationRole;
        if (session.planType) token.planType = session.planType;
      }

      // 3. [CORREÇÃO CRÍTICA] Revalidação Automática (Sincronização com o DB)
      // Sempre que o token for acessado e tivermos um ID, buscamos os dados frescos do banco.
      // Isso garante que se o user for removido da org, o token reflita isso na próxima navegação.
      if (token.id) {
        try {
          // Busca rápida apenas para atualizar contexto da organização
          const freshUser = await UserRepository.findById(token.id as string);

          if (freshUser) {
            // Atualiza o token com o que está REALMENTE no banco
            token.organizationId = freshUser.organizationId ? String(freshUser.organizationId) : "0"; // Se foi removido, virá null
            token.organizationName = freshUser.organizationName;
            token.organizationRole = freshUser.organizationRole;
            token.planType = freshUser.plan_type;
            token.role = freshUser.role; // [CORREÇÃO] Sincroniza o role do sistema (free/basic/pro)
          }
        } catch (error) {
          console.error("Erro ao revalidar token:", error);
          // Em caso de erro de DB, mantemos o token antigo ou forçamos logout (opcional)
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.organizationId = token.organizationId as string; // Será 0 ou null se removido
        session.user.organizationName = token.organizationName as string;
        (session.user as any).organizationRole = token.organizationRole as any;
        (session.user as any).planType = token.planType as string;
      }
      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      if (pathname === "/") {
        if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", nextUrl));
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      if (publicRoutes.some((route) => pathname.startsWith(route))) {
        if (isLoggedIn && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
      if (isAdminRoute) {
        if (auth?.user?.role !== "admin") {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
      }

      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);