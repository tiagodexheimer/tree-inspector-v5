// src/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth-service";

// [CORREÇÃO CRÍTICA] Caminhos que requerem role 'admin'
// 1. Removemos a página de UI '/gerenciar/usuarios' para que users paid/pro/premium possam acessá-la.
// 2. Mantivemos as APIs administrativas e adicionamos as novas APIs de convites.
const adminRoutes = [
  "/api/admin",
  // A API /api/admin/users para CRUD de usuários deve ser restrita
  "/api/admin/users",
  // A API para gerenciar/convites (POST, GET lista de convites) deve ser restrita apenas àqueles com permissão de convite.
  // Por enquanto, mantemos como 'admin' aqui e fazemos a checagem detalhada dentro da API Route (como fizemos no invite-service).
  "/api/gerenciar/convites",
];

// Caminhos que não requerem autenticação
const publicRoutes = [
  "/login",
  "/signup",
  "/api/auth/signup",
  "/api/mobile-login",
  // NOVO: A rota pública para o link de aceite do convite
  "/convite",
];

export const authConfig: NextAuthConfig = {
  // Configurações de Sessão e Páginas
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },

  // Provedores (Credentials para autenticação por email/senha)
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

          if (user) {
            return user;
          }
          return null;
        } catch (error) {
          console.error("Falha na autenticação:", error);
          throw new Error("Email ou senha inválidos.");
        }
      },
    }),
  ],

  // Callbacks: Essenciais para a propagação correta do ROLE e dados Multi-tenant
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Usuário logado: Adiciona dados do usuário ao token
        token.id = user.id;
        token.role = user.role as any;
        token.organizationId = user.organizationId;
        token.organizationName = (user as any).organizationName;
        // --- ADIÇÃO CRÍTICA: Role na Organização e Tipo de Plano ---
        token.organizationRole = (user as any).organizationRole;
        token.planType = (user as any).planType;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.organizationId = Number(token.organizationId);
        session.user.organizationName = token.organizationName as string;
        // --- ADIÇÃO CRÍTICA: Role na Organização e Tipo de Plano ---
        (session.user as any).organizationRole = token.organizationRole as any;
        (session.user as any).planType = token.planType as string;
      }
      return session;
    },

    /**
     * 3. Authorized Callback (Middleware de Proteção de Rotas)
     */
    authorized({
      auth,
      request: { nextUrl },
    }: {
      auth: any;
      request: NextRequest;
    }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // A) TRATAMENTO DA ROTA RAIZ (/)
      if (pathname === "/") {
        if (isLoggedIn) {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      // B) ROTAS PÚBLICAS
      if (publicRoutes.some((route) => pathname.startsWith(route))) {
        if (
          isLoggedIn &&
          (pathname.startsWith("/login") || pathname.startsWith("/signup"))
        ) {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // C) ROTAS PROTEGIDAS POR ADMIN (APENAS APIs SENSÍVEIS)
      const isAdminRoute = adminRoutes.some((route) =>
        pathname.startsWith(route)
      );
      if (isAdminRoute) {
        // Apenas 'admin' (super-usuário) pode acessar essas APIs
        if (auth?.user?.role !== "admin") {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
      }

      // D) ROTAS GERAIS PROTEGIDAS (Inclui /dashboard, /demandas e /gerenciar/*)
      // Se não for uma rota pública, e o usuário não estiver logado, ele é barrado.
      // A UI de Gerenciamento de Usuários cai aqui e é liberada para todos os autenticados.
      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
