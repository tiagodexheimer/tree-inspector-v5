// src/app/signup/page.tsx
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Container, Box, Paper, Typography, Button, Alert, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; 

// Importa a lógica e componentes separados
import { PLANS, PlanId } from '@/config/plans';
import { PlanType } from '@/types/auth-types';
import PlanSelectionStep from '@/components/signup/PlanSelectionStep';
import AccountCreationStep, { SignupFormData } from '@/components/signup/AccountCreationStep';

// Define o tipo de estado para o fluxo de passos
type Step = 'plan-selection' | 'account-creation';

const initialFormData: SignupFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const SignUpPage = () => {
  const router = useRouter();
  
  // Estado do Fluxo
  const [step, setStep] = useState<Step>('plan-selection');
  // Inicializa com o primeiro plano (free)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(PLANS[0].id as PlanType); 
  const [isMonthly, setIsMonthly] = useState(true);

  // Estado do Formulário e UI
  const [formData, setFormData] = useState<SignupFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Funções de Controle de Fluxo ---
  
  // Lógica para avançar para a próxima etapa
  const handleSelectPlanAndProceed = (planId: PlanId) => {
      setSelectedPlan(planId as PlanType);
      setStep('account-creation');
      setError(null);
  };
  
  // Lógica para alternar a seleção do plano no Step 1
  const handlePlanCardClick = (planId: PlanId) => {
      const isPlanAvailable = PLANS.find(p => p.id === planId)?.isAvailable;
      
      if (planId === selectedPlan || !isPlanAvailable) {
          handleSelectPlanAndProceed(planId);
      } else {
          // Apenas seleciona o novo plano se for diferente
          setSelectedPlan(planId as PlanType);
      }
  }

  // Lógica de manipulação dos campos do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null); 
  };
  
  // Lógica de Submissão (Core Business Logic)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    // [FIX FINAL CRÍTICO] O planType deve vir diretamente do state (selectedPlan),
    // pois a submissão via fetch/JSON no React ignora campos hidden do formulário DOM.
    const submittedPlanType = selectedPlan;
    
    // Validação de Senha (Evitar chamada API com erro conhecido)
    if (formData.password !== formData.confirmPassword) {
        setError('A senha e a confirmação de senha não são iguais.');
        setLoading(false);
        return;
    }
    
    // Validação de Plano 
    const currentPlan = PLANS.find(p => p.id === submittedPlanType);
    if (!currentPlan || !currentPlan.isAvailable) {
        setError('O plano selecionado não está disponível para registro.'); 
        setLoading(false);
        return;
    }

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.name, 
                email: formData.email, 
                password: formData.password, 
                // [FIX FINAL] Garante que o planType selecionado no state seja enviado.
                planType: submittedPlanType, 
                isMonthly: isMonthly 
            }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Falha ao registrar. O e-mail pode já estar em uso.');
        }

        // Registro bem-sucedido, tenta fazer login
        const signInResult = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
        });

        if (signInResult?.error) {
            router.push('/login?message=registration_success');
        } else {
            router.push('/dashboard');
        }
    } catch (err: any) {
        console.error("Erro no processo de cadastro/login:", err);
        setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
        setLoading(false);
    }
  };


  const currentPlan = PLANS.find(p => p.id === selectedPlan);
  const currentPlanTitle = currentPlan?.title || 'selecionado';
  
  return (
    <Container component="main" maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        
        {/* TÍTULO E SUBTÍTULO DINÂMICOS */}
        <Typography component="h1" variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
          {step === 'plan-selection' ? 'Escolha Seu Plano' : 'Crie Sua Conta'}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          {step === 'plan-selection' ? 
            'Selecione o plano ideal. Clique em "Criar Conta" no plano escolhido para avançar.' :
            `Finalize seu cadastro no plano ${currentPlanTitle}.`
          }
        </Typography>

        {error && <Alert severity="error" sx={{ width: '100%', maxWidth: 400, mb: 2 }}>{error}</Alert>}
        
        {step === 'account-creation' && (
            <Button 
                onClick={() => {
                    setStep('plan-selection');
                    setFormData(initialFormData);
                    setError(null);
                }}
                startIcon={<ArrowBackIcon />}
                sx={{ mb: 2, alignSelf: 'flex-start' }}
            >
                Voltar à Seleção de Planos
            </Button>
        )}
        
        {/* Renderiza a etapa correta */}
        {step === 'plan-selection' ? (
            <PlanSelectionStep 
                selectedPlan={selectedPlan}
                onPlanSelect={handlePlanCardClick}
                isMonthly={isMonthly}
                onBillingFrequencyChange={setIsMonthly}
            />
        ) : (
            <AccountCreationStep 
                formData={formData}
                loading={loading}
                error={error}
                onChange={handleChange}
                onSubmit={handleSubmit}
                // [FIX] Passa o plano selecionado para garantir o estado
                selectedPlan={selectedPlan} 
            />
        )}
      </Paper>
    </Container>
  );
};

export default SignUpPage;