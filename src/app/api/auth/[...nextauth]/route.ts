// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pool from "@/lib/db"; // Importa sua conexão com o banco de dados
import bcrypt from "bcryptjs"; // Importa o bcrypt para comparação de hash
import { Adapter } from "next-auth/adapters"; // Importe o tipo 'Adapter'
import PgAdapter from "@auth/pg-adapter"; // Importe o adaptador


export const authOptions: AuthOptions = {
  // O tipo Adapter já lida com o pool, mas requer o cast para evitar erros
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
        const result = await pool.query("SELECT id, name, email, role, hashed_password, password FROM users WHERE email = $1", [
          credentials.email,
        ]);
        const user = result.rows[0];

        if (!user) {
          return null;
        }

        // 2. Lógica Corrigida de Hash de Senha (Suporta 'hashed_password' ou 'password')
        const storedHash = user.hashed_password || user.password; 
        
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
    // Adiciona o 'role' e o 'id' ao token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; 
      }
      return token;
    },
    // Expõe o 'role' na sessão do lado do cliente (useSession)
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // CORREÇÃO: Forçamos o cast para o tipo de união estrito, resolvendo o erro de tipagem.
        session.user.role = token.role as ('admin' | 'paid_user' | 'free_user'); // <--- LINHA 86 CORRIGIDA
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/login",
  },
  
  // Chave secreta
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };