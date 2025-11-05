// src/app/rotas/[id]/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation'; // Hook para ler o [id] da URL
import {
    Box, Typography, CircularProgress, Alert, Button, Paper,
    Grid, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DemandaType } from '@/types/demanda';
import DetalheRotaLista from '@/components/ui/rotas/DetalheRotaLista'; // Importa a lista
import { format } from 'date-fns';

// Importa o mapa dinamicamente
const RouteMap = dynamic(() => import('@/components/ui/demandas/RouteMap'), {
    ssr: false,
    loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa...</Box>
});

// Ponto de partida (para desenhar o mapa)
const START_END_POINT: [number, number] = [-29.8608, -51.1789]; // [lat, lng]

// Interface para a Rota
interface Rota {
    id: number;
    nome: string;
    responsavel: string;
    status: string;
    created_at: string;
}
// Interface para a Demanda (com os campos extras da API)
export interface DemandaComOrdem extends DemandaType {
    ordem: number;
    status_nome: string;
    status_cor: string;
}

export default function PaginaDetalheRota() {
    const params = useParams(); // Pega os parâmetros da URL
    const id = params.id as string;

    const [rota, setRota] = useState<Rota | null>(null);
    const [demandas, setDemandas] = useState<DemandaComOrdem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Função para buscar os dados da API
    const fetchRotaDetalhes = async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/rotas/${id}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: { rota: Rota; demandas: DemandaComOrdem[] } = await response.json();
            setRota(data.rota);
            setDemandas(data.demandas);
        } catch (err) {
            console.error(`[PAGE /rotas/${id}] Falha ao buscar detalhes:`, err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    };

    // Busca os dados ao carregar a página
    useEffect(() => {
        fetchRotaDetalhes();
    }, [id]);

    // Recalcula o caminho do mapa (em linha reta) com base nas demandas ordenadas
    const routePath = useMemo(() => {
        if (demandas.length === 0) return [];
        
        const path: [number, number][] = [
            START_END_POINT,
            ...demandas.map(d => 
                [d.geom!.coordinates[1], d.geom!.coordinates[0]] as [number, number]
            ),
            START_END_POINT
        ];
        return path;
    }, [demandas]);

    // --- Renderização ---
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando rota...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">
                    Erro ao carregar rota: {error}
                    <Button color="inherit" size="small" onClick={fetchRotaDetalhes}>Tentar Novamente</Button>
                </Alert>
            </Box>
        );
    }

    if (!rota) {
        return <Alert severity="warning">Rota não encontrada.</Alert>;
    }

    // Define a cor do chip de status
    let statusColor: "default" | "warning" | "info" | "success" = "default";
    if (rota.status === 'Pendente') statusColor = 'warning';
    if (rota.status === 'Em Andamento') statusColor = 'info';
    if (rota.status === 'Concluída') statusColor = 'success';

    return (
        <Box sx={{ p: { xs: 1, md: 3 } }}>
            {/* Cabeçalho da Página */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Button
                    component={Link}
                    href="/rotas"
                    startIcon={<ArrowBackIcon />}
                    sx={{ mr: 2 }}
                >
                    Voltar
                </Button>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                    {rota.nome}
                </Typography>
                {/* TODO: Adicionar botão de "Editar" ou "Iniciar Rota" aqui */}
            </Box>

            {/* Informações da Rota */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">Responsável</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{rota.responsavel || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip label={rota.status} color={statusColor} size="small" sx={{ fontWeight: 'bold' }} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Typography variant="body2" color="text.secondary">Criada em</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {format(new Date(rota.created_at), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Layout Dividido: Lista (Esquerda) e Mapa (Direita) */}
            <Grid container spacing={3}>
                {/* Coluna da Lista */}
                <Grid item xs={12} md={5}>
                    <Typography variant="h6" gutterBottom>
                        {demandas.length} Paradas na Rota (Ordem de Vistoria)
                    </Typography>
                    <DetalheRotaLista demandas={demandas} />
                </Grid>

                {/* Coluna do Mapa */}
                <Grid item xs={12} md={7}>
                    <Typography variant="h6" gutterBottom>
                        Visualização no Mapa
                    </Typography>
                    <Box sx={{ height: '70vh', minHeight: 400, minWidth: 800, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                        <RouteMap
                            demands={demandas} // Passa as demandas para os marcadores numerados
                            path={routePath}    // Passa o caminho (linha azul)
                        />
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}