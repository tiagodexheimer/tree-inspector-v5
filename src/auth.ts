// src/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth-service";

// [CORREÇÃO DE ROTEAMENTO]
// Definimos aqui apenas rotas que são EXCLUSIVAS do Super Admin do sistema.
const adminRoutes = [
  "/api/admin",
  "/api/admin/users", 
  // REMOVIDO: "/api/gerenciar/convites" 
  // Motivo: Donos de organização (users 'pro'/'basic') precisam acessar essa rota.
  // A segurança dessa rota será feita internamente no arquivo route.ts verificando a organizationRole.
];

// Caminhos que não requerem autenticação (Públicos)
const publicRoutes = [
  "/login",
  "/signup",
  "/api/auth/signup",
  "/api/mobile-login",
  "/convite", // Rota pública para aceitar convites
];

export const authConfig: NextAuthConfig = {
  // Configurações de Sessão
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },

  // Provedores
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
          // O authService deve retornar o usuário com organizationRole e planType
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

  // Callbacks: Garantem que os dados cheguem ao Frontend
  callbacks: {
    // Adicione 'trigger' e 'session' nos argumentos
    async jwt({ token, user, trigger, session }) {
      
      // 1. Login Inicial (Carrega do banco)
      if (user) {
        token.id = user.id;
        token.role = user.role as any;
        token.organizationId = user.organizationId;
        token.organizationName = (user as any).organizationName;
        token.organizationRole = (user as any).organizationRole;
        token.planType = (user as any).planType;
      }

      // 2. [CORREÇÃO] Atualização Manual (Quando você chama update() no frontend)
      if (trigger === "update" && session) {
        // Se enviarmos { organizationName: 'Novo Nome' } no frontend, atualizamos o token aqui
        if (session.organizationName) {
            token.organizationName = session.organizationName;
        }
        
        // Se precisar atualizar outros campos futuramente (ex: role, planType), faça aqui também
        if (session.organizationRole) token.organizationRole = session.organizationRole;
        if (session.planType) token.planType = session.planType;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Copia dados do Token JWT para a Sessão do Cliente
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.organizationId = Number(token.organizationId);
        session.user.organizationName = token.organizationName as string;
        
        // [CRÍTICO] Disponibilizando para useSession() no frontend
        (session.user as any).organizationRole = token.organizationRole as any;
        (session.user as any).planType = token.planType as string;
      }
      return session;
    },

    /**
     * Middleware de Proteção de Rotas (Authorized)
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

      // A) ROTA RAIZ -> Dashboard ou Login
      if (pathname === "/") {
        if (isLoggedIn) {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      // B) ROTAS PÚBLICAS (Permite acesso sem login)
      if (publicRoutes.some((route) => pathname.startsWith(route))) {
        // Se já está logado e tenta ir para login/signup, manda pro dashboard
        if (
          isLoggedIn &&
          (pathname.startsWith("/login") || pathname.startsWith("/signup"))
        ) {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // C) ROTAS EXCLUSIVAS DE SUPER ADMIN
      // Aqui só entram rotas que NENHUM usuário comum (mesmo pagante) pode ver.
      const isAdminRoute = adminRoutes.some((route) =>
        pathname.startsWith(route)
      );
      if (isAdminRoute) {
        if (auth?.user?.role !== "admin") {
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
      }

      // D) ROTAS GERAIS PROTEGIDAS (Dashboard, Gerenciar, APIs internas)
      // Bloqueia qualquer acesso não autenticado que não seja público
      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);