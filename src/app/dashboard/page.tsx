// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
    Box, Paper, Typography, CircularProgress, Card, CardContent,
    Divider, Button, Alert, Link as MuiLink // [NOVO] Alert, Link e Button importados
} from '@mui/material';
import {
    Assignment, CheckCircle, PendingActions, Route, FilterList
} from '@mui/icons-material';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Stack, Paper as MuiPaper
} from '@mui/material';
import DashboardSkeleton from "@/components/ui/dashboard/DashboardSkeleton";
import Link from 'next/link';
import { DashboardData } from '@/types/dashboard';
import { useSession } from 'next-auth/react'; // [NOVO] Importar useSession
import DashboardIcon from '@mui/icons-material/Dashboard';
import { usePageTitle } from '@/contexts/PageTitleContext';

// [NOVO] Interface para o Convite Pendente
interface PendingInvite {
    id: number;
    organization_id: number;
    organization_name: string;
    token: string;
    role: string;
}

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
    usePageTitle("Visão Geral da Operação", <DashboardIcon />);
    const { data: session, status } = useSession(); // [NOVO] Capturar sessão
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    // [NOVO] Estado para convites pendentes
    const [invites, setInvites] = useState<PendingInvite[]>([]);

    // Filtros
    const [availableBairros, setAvailableBairros] = useState<string[]>([]);
    const [filtroBairros, setFiltroBairros] = useState<string[]>([]);


    // [NOVO] Função para buscar convites pendentes
    const fetchInvites = async () => {
        if (status !== 'authenticated') return;

        try {
            const response = await fetch('/api/convites/pendentes');
            const resData = await response.json();

            if (response.ok) {
                setInvites(resData.convites || []);
            } else {
                console.error("Falha ao buscar convites pendentes:", resData.message);
            }
        } catch (error) {
            console.error("Erro de rede ao buscar convites:", error);
        }
    };

    // Função para buscar dados do Dashboard original
    const fetchData = (bairros: string[] = []) => {
        setLoading(true);
        const query = bairros.length > 0 ? `?bairros=${bairros.join(',')}` : '';
        fetch(`/api/dashboard${query}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }

    const loadBairros = async () => {
        try {
            const res = await fetch('/api/demandas-bairros');
            const data = await res.json();
            setAvailableBairros(data);
        } catch (e) { console.error(e); }
    };


    useEffect(() => {
        // [MODIFICADO] Carrega os dados do dashboard E os convites
        if (status === 'authenticated') {
            fetchInvites();
            loadBairros();
            fetchData(filtroBairros);
        } else if (status !== 'loading') {
            // Se não está logado, paramos o loading para evitar loop e evitar chamada de API
            setLoading(false);
        }
    }, [status, filtroBairros]);


    // Lógica de Redirecionamento e Loading
    if (status === 'loading' || loading) {
        return <DashboardSkeleton />;
    }

    if (status === 'unauthenticated') {
        // O middleware deve redirecionar, mas este é um bom fallback de UX
        return <Typography>Você precisa estar logado para acessar o Dashboard.</Typography>;
    }

    if (!data) return <Typography>Erro ao carregar dados do Dashboard.</Typography>;


    // [NOVO] Notificação de Convite
    const InviteNotification = invites.length > 0 && (
        <Alert
            severity="success" // <-- CORRIGIDO PARA VERDE (success)
            sx={{ mb: 4 }}
            variant="filled"
        >
            <Typography variant="body1" fontWeight="bold">Você tem {invites.length} convite(s) pendente(s):</Typography>
            {invites.map(invite => (
                <Box key={invite.token} sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ mr: 2 }}>
                        Convidado para ser **{invite.role.toUpperCase()}** em **{invite.organization_name}**.
                    </Typography>
                    <Button
                        variant="contained"
                        // O Button padrão usa a cor 'primary' do tema, que deve contrastar com o verde do Alert.
                        color="secondary"
                        size="small"
                        // Linka para a rota de aceite, passando o token
                        component={MuiLink}
                        href={`/convite/${invite.token}`}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Aceitar Convite Agora
                    </Button>
                </Box>
            ))}
        </Alert>
    );


    return (
        <Box sx={{ p: 3 }}>

            {/* 0. NOTIFICAÇÃO DE CONVITE (Aparece no topo) */}
            {InviteNotification}

            <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 4 }}>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Filtrar por Bairro</InputLabel>
                    <Select
                        multiple
                        value={filtroBairros}
                        onChange={(e) => setFiltroBairros(e.target.value as string[])}
                        label="Filtrar por Bairro"
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                ))}
                            </Box>
                        )}
                        endAdornment={
                            filtroBairros.length > 0 && (
                                <IconButton
                                    size="small"
                                    sx={{ mr: 2 }}
                                    onClick={() => setFiltroBairros([])}
                                >
                                    <FilterList />
                                </IconButton>
                            )
                        }
                    >
                        {availableBairros.map((b) => (
                            <MenuItem key={b} value={b}>{b}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>

            {/* 1. KPIs (Indicadores) */}
            <Box sx={{ mb: 4 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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
            </Box>

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
                                    <Legend verticalAlign="bottom" height={36} />
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