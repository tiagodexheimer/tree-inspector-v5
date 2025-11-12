// src/app/AuthProvider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // O SessionProvider fornece o contexto da sessão para
  // todos os componentes-filho que usam 'useSession()'
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}