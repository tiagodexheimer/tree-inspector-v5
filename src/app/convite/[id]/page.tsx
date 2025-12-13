// src/app/convite/[id]/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material';

export default function AcceptInvitePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    
    // [CORREÇÃO] O token é lido de params.id (devido ao conflito de slug)
    const token = params.id as string; 

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Token de convite não encontrado na URL.');
            setLoading(false);
            return;
        }

        // 1. Espera a sessão carregar
        if (status === 'loading') {
            return;
        }
        
        // 2. Se não está autenticado, redireciona para o login com o token
        if (status === 'unauthenticated') {
            // Redireciona para login e armazena o token nos query params
            router.push(`/login?invite_token=${token}`);
            return;
        }
        
        // 3. Se autenticado, processa o aceite automaticamente
        if (status === 'authenticated' && session.user) {
            handleAcceptInvite();
        }

    }, [token, status, session, router]);
    
    const handleAcceptInvite = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Chama a API de aceite (POST /api/convite/[id])
            const response = await fetch(`/api/convite/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                // Sucesso: Redireciona para o dashboard com o novo ID da organização
                router.push(`/dashboard?orgId=${data.organizationId}&accepted=true`);
            } else {
                setError(data.message || 'Falha ao aceitar o convite.');
            }

        } catch (err) {
            console.error('Erro ao aceitar convite:', err);
            setError('Ocorreu um erro de rede. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    {status === 'loading' ? 'Carregando sessão...' : 'Processando convite...'}
                </Typography>
            </Box>
        );
    }

    // Se houver erro, exibe o alerta
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', p: 3 }}>
            {error ? (
                <Alert severity="error" sx={{ width: '100%', maxWidth: 400 }}>
                    <Typography variant="h6">Erro ao processar convite</Typography>
                    <Typography>{error}</Typography>
                    {error.includes("não é para sua conta") && (
                        <Button onClick={() => router.push('/login')} sx={{ mt: 1 }}>
                            Fazer Login com a conta correta
                        </Button>
                    )}
                </Alert>
            ) : (
                // Se a página parou aqui (não foi auto-aceita), exibe o botão manual
                <Alert severity="info" sx={{ width: '100%', maxWidth: 400 }}>
                    <Typography variant="h6">Pronto para aceitar</Typography>
                    <Typography>Você foi convidado para uma organização. Clique para aceitar.</Typography>
                    <Button onClick={handleAcceptInvite} disabled={loading} sx={{ mt: 2 }} variant="contained">
                        Aceitar Convite Agora
                    </Button>
                </Alert>
            )}
        </Box>
    );
}