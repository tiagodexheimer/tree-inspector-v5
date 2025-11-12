// src/types/next-auth.d.ts
import 'next-auth';

// "Aumenta" os módulos do NextAuth para incluir nossos campos
declare module 'next-auth' {
  /**
   * O objeto User retornado pela sua função `authorize`
   */
  interface User {
    id: string; // O seu ID é text
    role: 'admin' | 'paid_user' | 'free_user';
  }

  /**
   * O objeto Session que você acessa com useSession() ou getServerSession()
   */
  interface Session {
    user: User; // Agora session.user terá id e role
  }
}

declare module 'next-auth/jwt' {
  /**
   * O token JWT
   */
  interface JWT {
    id: string;
    role: 'admin' | 'paid_user' | 'free_user';
  }
}