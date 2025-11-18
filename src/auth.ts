// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

// [CORREÇÃO] Removemos o 'declare module' daqui porque já existe em src/types/next-auth.d.ts

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

        const result = await pool.query(
          "SELECT id, name, email, role, password FROM users WHERE email = $1",
          [credentials.email]
        );
        const user = result.rows[0];

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

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
        // O TypeScript vai reconhecer 'role' graças ao seu ficheiro d.ts
        token.role = user.role as 'admin' | 'paid_user' | 'free_user';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // Forçamos a tipagem para garantir compatibilidade com o d.ts
        session.user.role = token.role as 'admin' | 'paid_user' | 'free_user';
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/demandas') || 
                            nextUrl.pathname.startsWith('/rotas') || 
                            nextUrl.pathname.startsWith('/gerenciar');
      const isOnAuth = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; 
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