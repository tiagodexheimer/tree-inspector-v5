'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
// [CORREÇÃO] Adicionar useSearchParams
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container, Box, Paper, Typography, TextField, Button, CircularProgress, Alert
} from '@mui/material';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  // [CORREÇÃO] Capturar parâmetros da URL
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite_token'); // Captura o token

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!email || !password) {
      setError('Email e senha são obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    // [CORREÇÃO] Define a URL de callback com base no token
    const callbackUrl = inviteToken ? `/convite/${inviteToken}` : '/dashboard';


    const loginResult = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
      // [OPCIONAL, mas recomendado] Se o signIn fosse com redirect: true, o callbackUrl seria passado aqui.
      // Como estamos usando redirect: false, o redirecionamento manual é suficiente.
    });

    setIsSubmitting(false);

    if (loginResult?.error) {
      let errorMessage = 'Falha ao fazer login. Tente novamente.';

      if (loginResult.error.includes('Email ou senha inválidos.')) {
        errorMessage = 'Email ou senha inválidos.';
      } else if (loginResult.error.includes('CredentialsSignin')) {
        errorMessage = 'Credenciais inválidas. Verifique seu email e senha.';
      }

      setError(errorMessage);
    } else if (loginResult?.ok) {
      // [CORREÇÃO] Redireciona para a URL de callback (que será /convite/[token] se o token existir)
      router.push(callbackUrl);
    } else {
      setError('Ocorreu um erro desconhecido.');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, width: '100%' }}>
      {/* Renderiza aviso se houver token na URL */}
      {inviteToken && (
        <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
          Por favor, faça login para aceitar seu convite.
        </Alert>
      )}

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

      <Typography component="div" variant="body2" align="center" sx={{ mt: 2 }}>
        Não tem uma conta?{' '}
        <Button component={Link} href="/signup" variant="text" size="small">
          Criar Conta
        </Button>
      </Typography>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Typography component="h1" variant="h5">
          Fazer Login
        </Typography>
        <Suspense fallback={<CircularProgress />}>
          <LoginForm />
        </Suspense>
      </Paper>
    </Container>
  );
}