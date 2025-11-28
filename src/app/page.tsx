// src/app/page.tsx
'use client'; // Necessário para usar hooks do Next.js

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material'; // Usamos MUI para o carregamento

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Redireciona o usuário imediatamente para a página principal.
        router.replace('/dashboard');
    }, [router]);

    // Exibe um spinner enquanto o redirecionamento acontece
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
            <CircularProgress />
        </Box>
    );
}