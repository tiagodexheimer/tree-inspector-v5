// src/components/ui/layout/Header.tsx
'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { signOut } from "next-auth/react";
import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Opcional, mas vamos usar window.location para limpar estado

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Função de Logout Limpo
    const handleLogout = async () => {
        // 1. Avisa o NextAuth para destruir a sessão e NÃO redirecionar ainda
        await signOut({ redirect: false });
        
        // 2. Força o navegador a ir para o login. 
        // Usar window.location.href é melhor que router.push aqui pois 
        // garante um refresh total da página, limpando qualquer estado de memória (Redux, Context, etc).
        window.location.href = '/login';
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                width: '100%',
                ml: 0,
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between' }}>

                {isMobile && (
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={onMenuClick}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
                        Tree Inspector V5
                    </Link>
                </Typography>

                <Box sx={{ flexGrow: 0 }}>
                    {/* AQUI ESTÁ A CORREÇÃO NO ONCLICK */}
                    <IconButton color="inherit" onClick={handleLogout} title="Sair">
                        <LogoutIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}