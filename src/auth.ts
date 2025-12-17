import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authService } from "@/services/auth-service";
import { UserRepository } from "@/repositories/user-repository";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
          const user = await authService.authenticate(credentials);
          if (user) return user;
          return null;
        } catch (error) {
          console.error("Falha na autenticação:", error);
          throw new Error("Email ou senha inválidos.");
        }
      },
    }),
  ],
  callbacks: {
    // Keep the authorized callback from config, OR override if needed.
    ...authConfig.callbacks,

    // Node.js specific callbacks (DB access)
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as any;
        token.organizationId = user.organizationId;
        token.organizationName = (user as any).organizationName;
        token.organizationRole = (user as any).organizationRole;
        token.planType = (user as any).planType;
      }

      if (trigger === "update" && session) {
        if (session.organizationName) token.organizationName = session.organizationName;
        if (session.organizationRole) token.organizationRole = session.organizationRole;
        if (session.planType) token.planType = session.planType;
      }

      if (token.id) {
        try {
          const freshUser = await UserRepository.findById(token.id as string);

          if (freshUser) {
            token.organizationId = freshUser.organizationId ? String(freshUser.organizationId) : "0";
            token.organizationName = freshUser.organizationName;
            token.organizationRole = freshUser.organizationRole;
            token.planType = freshUser.plan_type;
            token.role = freshUser.role;
          }
        } catch (error) {
          console.error("Erro ao revalidar token:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        (session.user as any).organizationRole = token.organizationRole as any;
        (session.user as any).planType = token.planType as string;
      }
      return session;
    },
  },
});