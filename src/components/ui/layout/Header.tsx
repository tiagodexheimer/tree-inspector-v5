// src/components/ui/layout/Header.tsx
'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu'; // <--- NOVO
import { signOut } from "next-auth/react";
import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';
// ... (outros imports)

// Adicionamos a prop onMenuClick
interface HeaderProps {
    onMenuClick: () => void; // <--- NOVO
}

// O valor de SIDEBAR_WIDTH é usado em layout.tsx/Body.tsx para o padding
const SIDEBAR_WIDTH = 240;

// Modificado para aceitar onMenuClick
export default function Header({ onMenuClick }: HeaderProps) {
    const theme = useTheme();
    // Use useMediaQuery para determinar se estamos em mobile (largura < 600px)
    const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <--- NOVO

    return (
        <AppBar 
            position="fixed" 
            sx={{ 
                zIndex: (theme) => theme.zIndex.drawer + 1, 
                // Ajustar a largura do AppBar no desktop (mantém o espaço para o Sidebar)
                width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`, // <--- MODIFICADO
                ml: isMobile ? 0 : `${SIDEBAR_WIDTH}px`, // <--- MODIFICADO
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                
                {/* Ícone de Menu Hamburguer - VISÍVEL APENAS EM MOBILE */}
                {isMobile && (
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={onMenuClick} // <--- CHAMA A FUNÇÃO AO CLICAR
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
                
                {/* Título (Visível em todas as telas) */}
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
                        Tree Inspector V5
                    </Link>
                </Typography>

                <Box sx={{ flexGrow: 0 }}>
                    <IconButton 
                        color="inherit" 
                        onClick={() => signOut()}
                        title="Sair"
                    >
                        <LogoutIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}