// src/types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: 'admin' | 'paid_user' | 'free_user';
    organizationId: string;
    organizationName?: string; 
    planType: string; 
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'paid_user' | 'free_user';
    organizationId: string;
    organizationName?: string; 
    planType: string; 
  }
}