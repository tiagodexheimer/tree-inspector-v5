// src/app/signup/page.tsx
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container, Box, Paper, Typography, TextField, Button, CircularProgress, Alert
} from '@mui/material';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Opcional: Logar o usuário automaticamente após o registro
        const loginResult = await signIn('credentials', {
            redirect: false, 
            email: email,
            password: password,
        });
        
        if (loginResult?.ok) {
            router.push('/demandas'); // Redireciona para a página principal
        } else {
             // Se o login automático falhar (o que não deveria), redireciona para a página de login
            router.push('/login?message=registration_success');
        }
        
      } else {
        setError(result.message || 'Erro ao criar conta. Tente novamente.');
      }
    } catch (_err) {
      setError('Ocorreu um erro de rede. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Typography component="h1" variant="h5">
          Criar Nova Conta
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
              Conta criada com sucesso! Redirecionando...
            </Alert>
          )}
          
          <TextField
            margin="normal"
            fullWidth
            id="name"
            label="Nome Completo (Opcional)"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
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
            autoComplete="new-password"
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
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Registrar'}
          </Button>
          
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Já tem uma conta?{' '}
            <Button component={Link} href="/login" variant="text" size="small">
                Fazer Login
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}