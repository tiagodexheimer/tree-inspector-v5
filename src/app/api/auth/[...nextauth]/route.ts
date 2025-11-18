import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthService } from "@/services/auth-service";

export const authOptions: AuthOptions = {
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
      // A função authorize agora delega a lógica para o AuthService
      async authorize(credentials) {
        return await AuthService.authenticate(credentials);
      },
    }),
  ],

  callbacks: {
    // Mantém os callbacks limpos, apenas mapeando dados
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
        session.user.role = token.role as 'admin' | 'paid_user' | 'free_user';
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