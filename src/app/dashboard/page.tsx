'use client';

import React, { useEffect, useState } from 'react';
import { 
    Box, Paper, Typography, CircularProgress, Card, CardContent, 
    Divider, Button 
} from '@mui/material';
import { 
    Assignment, CheckCircle, PendingActions, Route 
} from '@mui/icons-material';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Link from 'next/link';
import { DashboardData } from '@/types/dashboard';

// Componente auxiliar para Card de KPI
const KPICard = ({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) => (
    <Card elevation={2} sx={{ height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
        <Box sx={{ p: 2, borderRadius: '50%', bgcolor: `${color}20`, color: color, mr: 2 }}>
            {icon}
        </Box>
        <CardContent sx={{ p: '16px !important', flexGrow: 1 }}>
            <Typography color="textSecondary" variant="body2" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
                {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="textPrimary">
                {value}
            </Typography>
        </CardContent>
    </Card>
);

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
    }

    if (!data) return <Typography>Erro ao carregar dados.</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, color: '#2c3e50' }}>
                Visão Geral da Operação
            </Typography>

            {/* 1. KPIs (Indicadores) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <KPICard 
                    title="Total de Demandas" 
                    value={data.kpis.totalDemandas} 
                    icon={<Assignment fontSize="large" />} 
                    color="#1976d2" 
                />
                <KPICard 
                    title="Pendentes" 
                    value={data.kpis.totalPendentes} 
                    icon={<PendingActions fontSize="large" />} 
                    color="#ed6c02" 
                />
                <KPICard 
                    title="Concluídas" 
                    value={data.kpis.totalConcluidas} 
                    icon={<CheckCircle fontSize="large" />} 
                    color="#2e7d32" 
                />
                <KPICard 
                    title="Rotas Ativas" 
                    value={data.kpis.totalRotas} 
                    icon={<Route fontSize="large" />} 
                    color="#9c27b0" 
                />
            </div>

            {/* 2. Gráficos e Ações */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Gráfico de Distribuição de Status */}
                <div className="md:col-span-2">
                    <Paper elevation={2} sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Distribuição por Status
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        // CORREÇÃO AQUI: Adicionado fallback (percent || 0)
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {data.statusDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </div>

                {/* Ações Rápidas / Links */}
                <div>
                    <Paper elevation={2} sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Ações Rápidas
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        <div className="flex flex-col gap-4">
                            <Button component={Link} href="/demandas" variant="outlined" size="large" startIcon={<Assignment />}>
                                Gerenciar Demandas
                            </Button>
                            <Button component={Link} href="/rotas" variant="outlined" size="large" startIcon={<Route />}>
                                Gerenciar Rotas
                            </Button>
                            <Button component={Link} href="/relatorios" variant="outlined" size="large" startIcon={<CheckCircle />}>
                                Ver Relatórios
                            </Button>
                        </div>
                    </Paper>
                </div>
            </div>
        </Box>
    );
}