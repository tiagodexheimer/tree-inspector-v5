// src/app/login/page.tsx
'use client';

// [CORREÇÃO] Importar Suspense
import React, { useState, Suspense } from 'react'; 
import { signIn } from 'next-auth/react';
// Importar useSearchParams
import { useRouter, useSearchParams } from 'next/navigation'; 
import {
  Container, Box, Paper, Typography, TextField, Button, CircularProgress, Alert
} from '@mui/material';
import Link from 'next/link';

// Componente que contém a lógica do cliente (incluindo useSearchParams)
function LoginContent() {
    const router = useRouter();
    // AQUI USAMOS O HOOK CLIENT-SIDE
    const searchParams = useSearchParams(); 
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn('credentials', {
                redirect: false, 
                email: email,
                password: password,
            });

            if (result?.ok) {
                // Redireciona para o callbackUrl
                router.push('/dashboard'); 
            } else {
                setError('Email ou senha inválidos.');
            }
        } catch (_err) {
            setError('Ocorreu um erro ao tentar fazer login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
            <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <Typography component="h1" variant="h5">
                    Tree Inspector Login
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, width: '100%' }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Senha"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2, backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                        disabled={isLoading}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
                    </Button>
                    
                    <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                        Não tem uma conta?{' '}
                        <Button component={Link} href="/signup" variant="text" size="small">
                            Criar Conta
                        </Button>
                    </Typography>
                    
                </Box>
            </Paper>
        </Container>
    );
}

// O componente Page principal apenas renderiza LoginContent dentro de Suspense
export default function LoginPage() {
    return (
        <Suspense fallback={
             <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
             </Container>
        }>
            <LoginContent />
        </Suspense>
    );
}