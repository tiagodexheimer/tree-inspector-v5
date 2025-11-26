import NextAuth, { type NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextResponse, type NextRequest } from 'next/server';
// 💡 CORREÇÃO DE ERRO: Importa o objeto AuthService completo.
import { AuthService } from '@/services/auth-service'; 

// Caminhos que não requerem autenticação (incluindo as APIs de autenticação)
const publicRoutes = ['/login', '/signup', '/api/auth/signup', '/api/mobile-login'];

// Caminhos que requerem role 'admin'
const adminRoutes = ['/gerenciar', '/api/admin', '/api/gerenciar'];

export const authConfig: NextAuthConfig = {
  // Configurações de Sessão e Páginas
  session: {
    strategy: 'jwt', 
  },
  pages: {
    signIn: '/login', // Redireciona para esta página se não estiver logado
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
          // 💡 CORREÇÃO DE ERRO: Chama o método authenticate dentro do objeto AuthService.
          const user = await AuthService.authenticate(credentials); 
          
          if (user) {
            return user;
          }
          return null;
        } catch (error) {
          console.error('Falha na autenticação:', error);
          throw new Error('Credenciais inválidas.');
        }
      },
    }),
  ],

  // Callbacks: Essenciais para a propagação correta do ROLE e proteção de rotas
  callbacks: {
    /**
     * 1. JWT Callback: Adiciona 'id' e 'role' do objeto 'user' (vindo do authorize) ao token JWT.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as 'admin' | 'paid_user' | 'free_user';
      }
      return token;
    },
    
    /**
     * 2. Session Callback: Lê 'id' e 'role' do token JWT e injeta esses dados no objeto 'session.user'.
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'paid_user' | 'free_user';
      }
      return session;
    },
    
    /**
     * 3. Authorized Callback (Middleware de Proteção de Rotas)
     * 💡 CORREÇÃO DE ERRO: Lógica aprimorada para evitar loops de redirecionamento.
     */
    authorized({ auth, request: { nextUrl } }: { auth: any, request: NextRequest }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // A) TRATAMENTO DA ROTA RAIZ (/)
      if (pathname === '/') {
          if (isLoggedIn) {
              // Se logado, vai para /dashboard
              return NextResponse.redirect(new URL('/dashboard', nextUrl));
          }
          // Se não estiver logado, vai para /login
          return NextResponse.redirect(new URL('/login', nextUrl)); 
      }
      
      // B) ROTAS PÚBLICAS
      if (publicRoutes.some(route => pathname.startsWith(route))) {
        // Se estiver em uma rota de login/signup e já estiver logado, redireciona para o dashboard
        if (isLoggedIn && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
            return NextResponse.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      // C) ROTAS PROTEGIDAS POR ADMIN
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
      if (isAdminRoute) {
        if (auth?.user?.role !== 'admin') {
          // Acesso negado, redireciona para o dashboard
          return NextResponse.redirect(new URL('/dashboard', nextUrl)); 
        }
      }
      
      // D) ROTAS GERAIS PROTEGIDAS (Ex: /dashboard, /demandas, /rotas)
      if (!isLoggedIn) {
        // Redireciona para /login (retorna false para que o NextAuth faça o redirecionamento configurado)
        return false; 
      }

      // Se logado e tudo mais checado, permite o acesso.
      return true;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);