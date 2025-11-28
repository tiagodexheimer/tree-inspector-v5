// src/app/layout.tsx
'use client'; 

import { Inter } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";
import Sidebar from "@/components/ui/layout/Sidebar";
import Header from "@/components/ui/layout/Header";
import Body from "@/components/ui/layout/Body"; 
import { SessionProvider } from "next-auth/react";
import { useState, useCallback } from "react"; 
import { Box } from '@mui/material'; // <--- CORREÇÃO: IMPORTAÇÃO DO BOX

const inter = Inter({ subsets: ["latin"] });

// Definição da largura (constante)
const SIDEBAR_WIDTH = 240; 

// Layout Principal (Client Component)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const [mobileOpen, setMobileOpen] = useState(false); 

    // Função para abrir/fechar o drawer mobile
    const handleDrawerToggle = useCallback(() => {
        setMobileOpen(prev => !prev);
    }, []);

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SessionProvider>
          <ThemeRegistry>
            {/* CORREÇÃO: Box agora está definido */}
            <Box sx={{ display: 'flex' }}>
              
              {/* Header (Passamos o handler) */}
              <Header onMenuClick={handleDrawerToggle} /> 
              
              {/* Sidebar (Passamos o estado e o handler) */}
              <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
              
              {/* Conteúdo Principal */}
              <Body>{children}</Body>

            </Box>
          </ThemeRegistry>
        </SessionProvider>
      </body>
    </html>
  );
}