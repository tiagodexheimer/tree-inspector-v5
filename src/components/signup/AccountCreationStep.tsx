// src/components/signup/AccountCreationStep.tsx
import React from 'react';
import { Box, TextField, Button, CircularProgress, Typography } from '@mui/material';
import Link from 'next/link';
import { PlanType } from '@/types/auth-types'; // Importa o tipo canônico

// Exporta o tipo para uso no componente pai (SignUpPage)
export interface SignupFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface AccountCreationStepProps {
    formData: SignupFormData;
    loading: boolean;
    error: string | null;
    selectedPlan: PlanType; // [NOVO] Adicionado para garantir que o plano seja visível
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void; // Esta função agora lida com o plano
}

const AccountCreationStep: React.FC<AccountCreationStepProps> = ({
    formData,
    loading,
    error,
    selectedPlan, // Usado apenas para exibição/depuração se necessário
    onChange,
    onSubmit,
}) => {
    
    const isPasswordMismatch = formData.password !== formData.confirmPassword;
    
    const isFormValid = 
        formData.name.trim() && 
        formData.email.trim() && 
        formData.password.trim() && 
        formData.confirmPassword.trim() &&
        !isPasswordMismatch;
        
    return (
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 2, width: '100%', maxWidth: 400 }}>
            
            {/* Campo Nome */}
            <TextField
                margin="normal" required fullWidth id="name" label="Nome Completo" name="name" 
                autoComplete="name" autoFocus value={formData.name} onChange={onChange}
                disabled={loading} error={!!error && !formData.name.trim()}
            />
            
            <TextField
                margin="normal" required fullWidth id="email" label="Endereço de E-mail" name="email" 
                autoComplete="email" value={formData.email} onChange={onChange}
                disabled={loading} error={!!error && !formData.email.trim()}
            />
            
            <TextField
                margin="normal" required fullWidth name="password" label="Senha" type="password" 
                id="password" autoComplete="new-password" value={formData.password} onChange={onChange}
                disabled={loading} error={!!error && !formData.password.trim()}
            />
            
            <TextField
                margin="normal" required fullWidth name="confirmPassword" label="Confirme a Senha" 
                type="password" id="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} 
                onChange={onChange} disabled={loading}
                error={!!error && (isPasswordMismatch || !formData.confirmPassword.trim())}
                helperText={isPasswordMismatch ? 'As senhas não coincidem' : ''}
            />

            {/* Este campo HIDDEN é a forma mais simples de garantir que o Playwright/Formulário envie o planType */}
            <input type="hidden" name="planType" value={selectedPlan} />


            <Button
                type="submit" fullWidth variant="contained" 
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem', backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                disabled={loading || !isFormValid}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Finalizar Cadastro'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                    Já tem uma conta?{' '}
                    <Button component={Link} href="/login" size="small" sx={{ textTransform: 'none', px: 0 }}>
                        Faça login
                    </Button>
                </Typography>
            </Box>
        </Box>
    );
};

export default AccountCreationStep;