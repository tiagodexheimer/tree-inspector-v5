// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import PgAdapter from "@auth/pg-adapter";
import pool from "@/lib/db"; 
import bcrypt from "bcryptjs"; 
import { AuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters"; // +++ IMPORTE O TIPO 'Adapter' +++

export const authOptions: AuthOptions = {
  // 1. Adaptador para o seu banco de dados Postgre
  //    vvv ADICIONE "as Adapter" AQUI vvv
  adapter: PgAdapter(pool) as Adapter,

  // 2. Provedores (aqui usamos Email/Senha)
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

        // Encontra o usuário no banco
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [
          credentials.email,
        ]);
        const user = result.rows[0];

        if (!user) {
          return null;
        }

        // Verifica a senha
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashed_password
        );

        if (!isValidPassword) {
          return null;
        }

        // Retorna o objeto do usuário (sem a senha)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // Importante para a Fase 3
        };
      },
    }),
  ],

  // 3. Estratégia de Sessão
  session: {
    strategy: "jwt",
  },

  // 4. Callbacks para adicionar dados ao JWT e à Sessão
  callbacks: {
    // Adiciona o 'role' e 'id' ao token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; // Remove 'as any'
      }
      return token;
    },
    // Adiciona o 'role' e 'id' à sessão (para uso no frontend)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role; // Remove 'as any'
      }
      return session;
    },
  },

  // 5. Chave secreta
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };