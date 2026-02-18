'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, useTheme, useMediaQuery, Chip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { signOut, useSession } from "next-auth/react"; // [NOVO] Import useSession
import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';
import { useTitleContext } from "@/contexts/PageTitleContext";
import { Divider } from '@mui/material';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // [NOVO] Pega os dados da sessão
    const { data: session } = useSession();
    const orgName = session?.user?.organizationName;

    const { title, icon } = useTitleContext();

    const handleLogout = async () => {
        await signOut({ redirect: false });
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

                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" noWrap component="div">
                        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 'bold' }}>
                            {/* [CORREÇÃO] Removido o "V5" */}
                            Tree Inspector
                        </Link>
                    </Typography>

                    {/* [NOVO] Mostra o nome da organização se existir */}
                    {orgName && (
                        <Chip
                            label={orgName}
                            size="small"
                            variant="outlined"
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.5)',
                                display: { xs: 'none', sm: 'flex' } // Esconde em telas muito pequenas
                            }}
                        />
                    )}

                    {!isMobile && (title || icon) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)', height: 24, alignSelf: 'center' }} />
                            {icon && <Box sx={{ display: 'flex', color: 'inherit', '& svg': { fontSize: 20 } }}>{icon}</Box>}
                            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 500 }}>
                                {title}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {isMobile && (title || icon) && (
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        {icon && <Box sx={{ display: 'flex', color: 'inherit', '& svg': { fontSize: 20 } }}>{icon}</Box>}
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {title}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ flexGrow: 0 }}>
                    <IconButton color="inherit" onClick={handleLogout} title="Sair">
                        <LogoutIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}