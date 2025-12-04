import NextAuth, { type NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextResponse, type NextRequest } from 'next/server';
// Importa a instância do serviço (authService)
import { authService } from '@/services/auth-service'; 

// [CORREÇÃO] Caminhos que requerem role 'admin'
// A rota geral '/gerenciar' foi removida para ser acessível a todos os usuários logados.
// Protegemos apenas a gestão de usuários e APIs de admin.
const adminRoutes = ['/gerenciar/usuarios', '/api/admin', '/api/gerenciar/usuarios']; 

// Caminhos que não requerem autenticação (incluindo as APIs de autenticação)
const publicRoutes = ['/login', '/signup', '/api/auth/signup', '/api/mobile-login'];

export const authConfig: NextAuthConfig = {
  // Configurações de Sessão e Páginas
  session: {
    strategy: 'jwt', 
  },
  pages: {
    signIn: '/login',
  },
  
  // Provedores (Credentials para autenticação por email/senha)
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Chama o método authenticate na INSTÂNCIA
          const user = await authService.authenticate(credentials); 
          
          if (user) {
            return user;
          }
          return null;
        } catch (error) {
          console.error('Falha na autenticação:', error);
          // Lançar um erro aqui faz o NextAuth incluir a mensagem no objeto de erro.
          throw new Error('Email ou senha inválidos.'); 
        }
      },
    }),
  ],

  // Callbacks: Essenciais para a propagação correta do ROLE e dados Multi-tenant
  callbacks: {
    /**
     * 1. JWT Callback: Adiciona dados da Organização ao token JWT.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as 'admin' | 'paid_user' | 'free_user';
        // [CRÍTICO] RESTAURAÇÃO DOS CAMPOS MULTI-TENANT
        token.orgId = (user as any).orgId as number; 
        token.planType = (user as any).planType as 'free' | 'pro';
      }
      return token;
    },
    
    /**
     * 2. Session Callback: Injeta dados Multi-tenant no objeto 'session.user'.
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'paid_user' | 'free_user';
        // [CRÍTICO] RESTAURAÇÃO DOS CAMPOS MULTI-TENANT
        session.user.orgId = token.orgId as number; 
        session.user.planType = token.planType as 'free' | 'pro';
      }
      return session;
    },
    
    /**
     * 3. Authorized Callback (Middleware de Proteção de Rotas)
     */
    authorized({ auth, request: { nextUrl } }: { auth: any, request: NextRequest }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // A) TRATAMENTO DA ROTA RAIZ (/)
      if (pathname === '/') {
          if (isLoggedIn) {
              return NextResponse.redirect(new URL('/dashboard', nextUrl));
          }
          return NextResponse.redirect(new URL('/login', nextUrl)); 
      }
      
      // B) ROTAS PÚBLICAS
      if (publicRoutes.some(route => pathname.startsWith(route))) {
        if (isLoggedIn && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
            return NextResponse.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      // C) ROTAS PROTEGIDAS POR ADMIN (CORRIGIDO)
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
      if (isAdminRoute) {
        // Agora, somente rotas sensíveis como /gerenciar/usuarios são protegidas
        if (auth?.user?.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', nextUrl)); 
        }
      }
      
      // D) ROTAS GERAIS PROTEGIDAS (inclui /dashboard, /demandas e /gerenciar/status, /gerenciar/tipos-demanda)
      if (!isLoggedIn) {
        return false; 
      }

      return true;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);