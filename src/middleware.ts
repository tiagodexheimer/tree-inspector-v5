// src/middleware.ts
import { withAuth } from "next-auth/middleware";

// 'withAuth' é o middleware padrão do NextAuth
// Ele vai automaticamente proteger suas páginas
export default withAuth({
  pages: {
    signIn: "/login", // Redireciona usuários não logados para esta página
  },
});

// O 'config' define QUAIS rotas serão protegidas pelo middleware
export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos, EXCETO:
     * - /api (rotas de API)
     * - /login (a própria página de login)
     * - _next/static (arquivos estáticos)
     * - _next/image (arquivos de imagem otimizados)
     * - favicon.ico (o ícone)
     */
    '/((?!api|login|_next/static|_next/image|favicon.ico).*)',
  ],
};