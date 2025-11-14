// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { Adapter } from "next-auth/adapters";
import PgAdapter from "@auth/pg-adapter";


export const authOptions: AuthOptions = {
  adapter: PgAdapter(pool) as Adapter,

  session: {
    strategy: "jwt",
  },
  
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        // 1. Encontra o usuário no banco
        // CORRIGIDO: Selecionando apenas a coluna 'password' para o hash.
        const result = await pool.query("SELECT id, name, email, role, password FROM users WHERE email = $1", [
          credentials.email,
        ]);
        const user = result.rows[0];

        if (!user) {
          return null;
        }

        // 2. Lógica de Hash de Senha
        // CORRIGIDO: Usando APENAS a coluna 'user.password'.
        const storedHash = user.password; 
        
        if (!storedHash) {
             console.error(`[AUTH] Usuário ${user.email} encontrado, mas sem hash de senha armazenado.`);
             return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          storedHash
        );

        if (!isValidPassword) {
          return null;
        }

        // 3. Retorna o objeto do usuário
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, 
        } as NextAuthUser;
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
      // Usamos o cast para o tipo de união estrito, resolvendo o erro de tipagem anterior
      type UserRole = 'admin' | 'paid_user' | 'free_user';

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole; 
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/login",
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };