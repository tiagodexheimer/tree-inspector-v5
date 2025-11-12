// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Importe o de 'next/navigation'
import {
  Container, Box, Paper, Typography, TextField, Button, CircularProgress, Alert
} from '@mui/material';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Isso chama a API que criamos (api/auth/[...nextauth]/route.ts)
      const result = await signIn('credentials', {
        redirect: false, // Importante: não redireciona a página inteira
        email: email,
        password: password,
      });

      if (result?.ok) {
        // Sucesso! Redireciona para a página principal
        router.push('/demandas'); // Ou '/dashboard'
      } else {
        // Erro!
        setError('Email ou senha inválidos.');
      }
    } catch (err) {
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
        </Box>
      </Paper>
    </Container>
  );
}