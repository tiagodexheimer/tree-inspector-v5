// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

// Definição de tipos para o TypeScript (pode manter o seu arquivo d.ts, mas aqui reforçamos)
declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      role?: string;
    } & import("next-auth").DefaultSession["user"];
  }
}

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Encontra o utilizador no banco
        const result = await pool.query(
          "SELECT id, name, email, role, password FROM users WHERE email = $1",
          [credentials.email]
        );
        const user = result.rows[0];

        if (!user || !user.password) {
          return null;
        }

        // 2. Valida a senha
        // Nota: Como o 'password' vem como 'any' ou 'unknown' do credentials, convertemos para string
        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

        // 3. Retorna o objeto do utilizador
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string; // Ajuste de tipo
      }
      return session;
    },
    // Lógica de autorização para o Proxy (Middleware)
    authorized({ auth, request: { nextUrl } }) {
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
           // Redireciona para a página inicial se já estiver logado
           return Response.redirect(new URL('/demandas', nextUrl));
        }
        return true;
      }
      return true;
    },
  },
}); 