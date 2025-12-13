// src/components/Organizacao/PlanLimitsCard.tsx
import React from 'react';
import { Paper, Typography, Divider, Box, Button } from '@mui/material';

interface PlanLimitsCardProps {
    planType: string;
}

export const PlanLimitsCard: React.FC<PlanLimitsCardProps> = ({ planType }) => (
    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }} gutterBottom>
            Seu Plano Atual: {planType}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Box component="ul" sx={{ pl: 2, typography: 'body2' }}>
            <li>Máx. Usuários: {planType === 'FREE' ? '2' : 'Ilimitado'}</li>
            <li>Máx. Demandas: {planType === 'FREE' ? '50' : 'Ilimitado'}</li>
            <li>Relatórios Customizados: {planType === 'FREE' ? 'Não' : 'Sim'}</li>
        </Box>
        <Button variant="contained" color="secondary" sx={{ mt: 2 }} disabled={planType !== 'FREE'}>
            Fazer Upgrade
        </Button>
    </Paper>
);