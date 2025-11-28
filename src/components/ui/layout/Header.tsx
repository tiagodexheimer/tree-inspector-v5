// src/components/ui/layout/Header.tsx
'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { signOut } from "next-auth/react";
import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';

interface HeaderProps {
    onMenuClick: () => void;
}

const SIDEBAR_WIDTH = 240;

export default function Header({ onMenuClick }: HeaderProps) {
    const theme = useTheme();

    // AGORA MOBILE OU TABLET = width < 900px
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`,
                ml: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between' }}>

                {/* Botão Hamburguer – agora aparece em mobile + tablet */}
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
                    <IconButton color="inherit" onClick={() => signOut()} title="Sair">
                        <LogoutIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
