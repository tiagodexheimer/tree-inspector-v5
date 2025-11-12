// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { 
    Container, 
    Box, 
    TextField, 
    Button, 
    Typography, 
    Link, 
    Alert 
} from '@mui/material';

// --- Interface para o Estado do Formulário ---
interface FormData {
    name?: string;
    email: string;
    password: string;
}

export default function LoginPage() {
    const router = useRouter();
    
    // Estado para alternar entre Login e Registro
    const [isRegistering, setIsRegistering] = useState(false);
    
    // Estados do Formulário (Login/Register)
    const [formData, setFormData] = useState<FormData>({ 
        name: '', 
        email: '', 
        password: '' 
    });
    
    // NOVO ESTADO: Para a confirmação de senha
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Estados de UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --------------------------------------------------------
    // FUNÇÃO DE LOGIN
    // --------------------------------------------------------
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email: formData.email,
                password: formData.password,
            });

            if (result?.error) {
                setError('Email ou senha inválidos. Tente novamente.');
            } else {
                router.push('/dashboard'); 
            }
        } catch (err) {
            setError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------------
    // FUNÇÃO DE REGISTRO
    // --------------------------------------------------------
    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.name || !formData.email || !formData.password) {
            setError('Todos os campos são obrigatórios.');
            setLoading(false);
            return;
        }

        // VALIDAÇÃO DE SENHA NO FRONTEND
        if (formData.password !== confirmPassword) {
            setError('As senhas não coincidem! Por favor, verifique.');
            setLoading(false);
            return;
        }

        try {
            // Cria um objeto para enviar ao backend, excluindo confirmPassword
            const registrationData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
            };

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Sucesso! ${data.message} Agora você pode fazer login.`);
                
                // Limpa o formulário e volta para o modo Login
                setConfirmPassword(''); // Limpa a confirmação
                setFormData({ name: '', email: formData.email, password: '' });
                setIsRegistering(false);
                
            } else {
                setError(data.error || 'Falha ao criar o usuário.');
            }
        } catch (err) {
            setError('Erro de rede ao registrar.');
        } finally {
            setLoading(false);
        }
    };

    // Função auxiliar para mudar o modo e limpar o estado de erro/loading
    const toggleMode = (isReg: boolean) => {
        setIsRegistering(isReg);
        setError(null);
        setLoading(false);
        setConfirmPassword('');
        setFormData({ name: '', email: '', password: '' });
    }

    return (
        <Container 
            maxWidth="xs" 
            sx={{ 
                height: '100vh', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center' 
            }}
        >
            <Box sx={{ p: 4, borderRadius: 2, boxShadow: 3, bgcolor: 'background.paper' }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    {isRegistering ? 'Criar Nova Conta' : 'Acesso ao Tree Inspector'}
                </Typography>
                
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {isRegistering ? (
                    // --------------------------------------------------------
                    // FORMULÁRIO DE REGISTRO
                    // --------------------------------------------------------
                    <Box component="form" onSubmit={handleRegister} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Seu Nome Completo"
                            name="name"
                            autoComplete="name"
                            autoFocus
                            value={formData.name || ''}
                            onChange={handleChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email"
                            name="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
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
                            value={formData.password}
                            onChange={handleChange}
                        />
                        {/* NOVO CAMPO DE CONFIRMAÇÃO DE SENHA */}
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Repetir Senha"
                            type="password"
                            id="confirm-password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? 'Registrando...' : 'Registrar'}
                        </Button>
                        <Typography variant="body2" align="center">
                            Já tem uma conta? 
                            <Link href="#" onClick={() => toggleMode(false)} sx={{ ml: 1 }}>
                                Faça Login
                            </Link>
                        </Typography>
                    </Box>
                ) : (
                    // --------------------------------------------------------
                    // FORMULÁRIO DE LOGIN
                    // --------------------------------------------------------
                    <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={formData.email}
                            onChange={handleChange}
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
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </Button>
                        <Typography variant="body2" align="center">
                            Não tem uma conta? 
                            <Link href="#" onClick={() => toggleMode(true)} sx={{ ml: 1 }}>
                                Criar Conta
                            </Link>
                        </Typography>
                    </Box>
                )}
            </Box>
        </Container>
    );
}