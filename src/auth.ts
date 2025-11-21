// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AuthService } from "@/services/auth-service"; // Importa a lógica isolada

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
      // AQUI ESTÁ A MUDANÇA: Toda a complexidade foi substituída por uma linha
      authorize: async (credentials) => {
        const user = await AuthService.authenticate(credentials);
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // O TypeScript reconhece 'role' pelo arquivo src/types/next-auth.d.ts
        token.role = user.role as 'admin' | 'paid_user' | 'free_user';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'paid_user' | 'free_user';
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      console.log(`[Middleware] Acessando: ${nextUrl.pathname}. Usuário logado? ${auth?.user?.email}`);
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/demandas') || 
                            nextUrl.pathname.startsWith('/rotas') || 
                            nextUrl.pathname.startsWith('/gerenciar');
      const isOnAuth = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redireciona para login
      } else if (isOnAuth) {
        if (isLoggedIn) {
           return Response.redirect(new URL('/demandas', nextUrl));
        }
        return true;
      }
      return true;
    },
  },
});