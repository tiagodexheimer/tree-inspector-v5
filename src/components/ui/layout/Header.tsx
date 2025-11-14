// src/components/ui/layout/Header.tsx
'use client'; // [NOVO] Precisa ser um Client Component para usar a sessão

import { Toolbar, IconButton, Box, Typography, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// [NOVO] Importações do Auth.js
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
    // [NOVO] Pega os dados da sessão
    const { data: session, status } = useSession();

    return (
        <div className='flex w-full justify-between items-center h-12 text-white' style={{ background: '#257e1a' }}>
            <Toolbar variant="dense" className='w-full flex justify-between shadow-lg'>
            <div>
                <IconButton edge="start" color="inherit" aria-label="menu">
                    <MenuIcon />
                </IconButton>
            </div>
            <div>
                {/* Mudei o H1 para Typography */}
                <Typography variant="h6" component="div">
                    Tree Inspector V5
                </Typography>
            </div>
            
            {/* [NOVO] Lógica de Login/Logout */}
            <Box sx={{ minWidth: 150, textAlign: 'right' }}>
                {status === 'loading' && (
                    <Typography variant="body2">Carregando...</Typography>
                )}
                
                {status === 'authenticated' && session.user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" noWrap>
                            Olá, {session.user.name || session.user.email}
                        </Typography>
                        <Button 
                            color="inherit" 
                            variant="outlined" 
                            size="small"
                            onClick={() => signOut({ callbackUrl: '/login' })} // Desloga e manda para o login
                        >
                            Sair
                        </Button>
                    </Box>
                )}
                
                {/* (Opcional) Mostra o botão de Login se não estiver logado
                    (Embora o middleware vá redirecionar de qualquer forma) */}
                {status === 'unauthenticated' && (
                     <Button 
                        color="inherit" 
                        variant="outlined" 
                        size="small"
                        href="/login" // Link simples para a página de login
                    >
                        Login
                    </Button>
                )}
            </Box>
            
        </Toolbar>
        </div>
    );
}