// src/app/api/auth/[...nextauth]/route.ts

import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs"; // Para comparação de hash
import pool from "@/lib/db"; // O cliente de banco de dados pg.Pool

// ----------------------------------------------------
// DEFINIÇÃO DAS OPÇÕES DE AUTENTICAÇÃO
// ----------------------------------------------------
export const authOptions: NextAuthOptions = {
  // 1. PROVEDORES (Credentials)
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null; // Credenciais incompletas
        }

        // --- CORREÇÃO DO ERRO 401: Aplicar trim() ---
        const emailToSearch = credentials.email.trim();

        try {
          // 2. Busca o usuário no banco de dados
          const userResult = await pool.query(
            "SELECT id, name, email, password, role FROM users WHERE email = $1",
            [emailToSearch] // Usa o email limpo
          );
          const user = userResult.rows[0];

          if (!user || !user.password) {
            // Usuário não encontrado ou sem senha hasheada
            console.log("LOGIN FALHA: Usuário não encontrado ou senha nula.");
            return null;
          }

          // 3. Compara a senha digitada com a senha hasheada do banco
          const passwordIsValid = await compare(
            credentials.password,
            user.password
          );

          if (!passwordIsValid) {
            console.log("LOGIN FALHA: Senha incorreta.");
            return null;
          }
          
          console.log(`LOGIN SUCESSO: Usuário ${user.email} logado.`);

          // 4. Retorna o objeto do usuário (sem a senha) em caso de sucesso
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role, // Inclui a role para os callbacks
          };
        } catch (error) {
          console.error("Erro na autorização:", error);
          return null;
        }
      },
    }),
  ],

  // 2. CONFIGURAÇÃO DE SESSÃO
  session: {
    strategy: "jwt", // Usa JWT para a sessão (ideal para APIs)
  },

  // 3. CALLBACKS (Para injetar a role no JWT e na Sessão)
  callbacks: {
    // Injeta a 'role' no JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role; // Pega a role do objeto retornado em 'authorize'
      }
      return token;
    },
    // Injeta a 'role' na Sessão
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role; // Pega a role do JWT
      }
      return session;
    },
  },
  
  // 4. CHAVE SECRETA
  secret: process.env.NEXTAUTH_SECRET,

  // 5. PÁGINAS CUSTOMIZADAS
  pages: {
    signIn: '/login', // Redireciona usuários não autenticados para a página de login
  },
};


// ----------------------------------------------------
// EXPORTAÇÃO DO HANDLER DE ROTAS
// ----------------------------------------------------

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };