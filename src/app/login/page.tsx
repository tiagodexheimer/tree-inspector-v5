// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container, Box, Paper, Typography, TextField, Button, CircularProgress, Alert
} from '@mui/material';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // [NOVO] Estado para mensagens de erro
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null); // Limpa erros anteriores

    // Verifica campos mínimos no frontend
    if (!email || !password) {
        setError('Email e senha são obrigatórios.');
        setIsSubmitting(false);
        return;
    }

    // [CRÍTICO] Chama signIn com redirect: false para capturar o resultado
    const loginResult = await signIn('credentials', {
        redirect: false, 
        email: email,
        password: password,
    });
    
    setIsSubmitting(false);

    if (loginResult?.error) {
        // Mapeia erros do NextAuth ou os erros lançados no auth.ts
        let errorMessage = 'Falha ao fazer login. Tente novamente.';

        if (loginResult.error.includes('Email ou senha inválidos.')) {
            // Mensagem lançada pelo AuthService/Repository
            errorMessage = 'Email ou senha inválidos.';
        } else if (loginResult.error.includes('CredentialsSignin')) {
            // Erro genérico do NextAuth (se o customize for desligado)
            errorMessage = 'Credenciais inválidas. Verifique seu email e senha.';
        }
        
        setError(errorMessage);
    } else if (loginResult?.ok) {
        // Login bem-sucedido: Redireciona para o dashboard
        router.push('/dashboard'); 
    } else {
        // Fallback para respostas não esperadas
        setError('Ocorreu um erro desconhecido.');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Typography component="h1" variant="h5">
          Fazer Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, width: '100%' }}>
          
          {/* [CRÍTICO] Renderiza a mensagem de erro */}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
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