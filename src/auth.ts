// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AuthService } from "@/services/auth-service";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Delega a autenticação para o serviço dedicado
        const user = await AuthService.authenticate(credentials);
        return user;
      },
    }),
  ],
  callbacks: {
    // 1. JWT Callback: Adiciona ID e Role ao token quando o user loga
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as 'admin' | 'paid_user' | 'free_user';
      }
      return token;
    },
    // 2. Session Callback: Passa os dados do token para a sessão do cliente
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'paid_user' | 'free_user';
      }
      return session;
    },
    // 3. Middleware de Autorização
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      
      // Rotas Protegidas (Adicionamos /dashboard aqui)
      const isOnDashboard = nextUrl.pathname.startsWith('/demandas') || 
                            nextUrl.pathname.startsWith('/rotas') || 
                            nextUrl.pathname.startsWith('/gerenciar') ||
                            nextUrl.pathname.startsWith('/dashboard');

      // Rotas de Autenticação (Login/Signup)
      const isOnAuth = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup');

      if (isOnDashboard) {
        // Se tentar acessar área logada sem estar logado -> Bloqueia (vai para login)
        if (isLoggedIn) return true;
        return false; 
      } else if (isOnAuth) {
        // Se tentar acessar login já estando logado -> Redireciona para o Dashboard
        if (isLoggedIn) {
           return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }
      
      // Outras rotas (ex: API, public assets) -> Permite
      return true;
    },
  },
});