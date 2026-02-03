// src/app/rotas/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
    Box, Typography, Alert, Button, Paper, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useTheme, useMediaQuery
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import dynamic from 'next/dynamic';

// Componentes UI
import RotasSkeleton from '@/components/ui/rotas/RotasSkeleton';

// Hooks e Tipos
import { useRotasData } from '@/hooks/useRotasData';
import { useRotasOperations } from '@/hooks/useRotasOperations';
import { RotaComContagem } from '@/services/client/rotas-client';

// Carregamento dinâmico dos componentes principais
const ListaRotas = dynamic(() => import('@/components/ui/rotas/ListaRotas'), {
    loading: () => <RotasSkeleton />,
    ssr: false
});

const RouteMap = dynamic(() => import('@/components/ui/demandas/RouteMap'), {
    loading: () => <Box sx={{ height: '100%', bgcolor: '#eee' }} />,
    ssr: false
});

export default function RotasPage() {
    const {
        rotas, isLoading, error, refresh, selectedRouteMap,
        isLoadingRouteMap, fetchRouteDetailsForMap,
        // [NOVO] Recebe a config global
        globalConfig
    } = useRotasData();

    const { deleteRota, isProcessing: isDeleting, opError: deleteError, clearError } = useRotasOperations(refresh);

    // Estados para o Modal de Confirmação de Deleção
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [rotaParaDeletar, setRotaParaDeletar] = useState<RotaComContagem | null>(null);

    // Detecção de breakpoint (Mobile/Desktop)
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Handlers para Deleção
    const iniciarDelecao = useCallback((id: number) => {
        if (typeof id !== 'number' || isNaN(id) || id <= 0) {
            console.error("Deleção bloqueada: ID inválido/ausente recebido:", id);
            return;
        }

        const rota = rotas.find(r => r.id === id) || null;
        if (rota) {
            setRotaParaDeletar(rota);
            setOpenDeleteConfirm(true);
            clearError();
        } else {
            console.error("Rota não encontrada para o ID:", id);
        }
    }, [rotas, clearError]);

    const handleCloseDeleteConfirm = useCallback(() => {
        setOpenDeleteConfirm(false);
        setRotaParaDeletar(null);
    }, []);

    const confirmarDelecao = useCallback(async () => {
        if (!rotaParaDeletar) {
            handleCloseDeleteConfirm();
            return;
        }

        await deleteRota(rotaParaDeletar.id);
        handleCloseDeleteConfirm();
    }, [rotaParaDeletar, deleteRota, handleCloseDeleteConfirm]);

    // Handler para clique na linha da tabela / card da rota
    const handleRowClick = useCallback((rotaId: number) => {
        fetchRouteDetailsForMap(rotaId);
    }, [fetchRouteDetailsForMap]);

    // Dados para o Mapa
    const mapDemandas = selectedRouteMap?.demandas || [];
    const mapRota = rotas.find(r => r.id === selectedRouteMap?.rota.id);
    const selectedRotaId = selectedRouteMap?.rota.id || null;

    let startPointForMap = selectedRouteMap?.startPoint;
    let endPointForMap = selectedRouteMap?.endPoint;

    if (!selectedRotaId && globalConfig) {
        // Converte {lat, lng} para {latitude, longitude} que o RouteMap espera
        startPointForMap = { latitude: globalConfig.inicio.lat, longitude: globalConfig.inicio.lng };
        endPointForMap = { latitude: globalConfig.fim.lat, longitude: globalConfig.fim.lng };
    }

    return (
        <Box sx={{ p: isMobile ? 1 : 3 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: isMobile ? 2 : 4 }}>
                Rotas Criadas
            </Typography>

            {/* Exibe erros de carregamento */}
            {error && (
                <Box sx={{ mb: 2 }}>
                    <Alert severity="error">
                        Erro ao carregar dados: {error}
                        <Button color="inherit" size="small" onClick={refresh}>Tentar Novamente</Button>
                    </Alert>
                </Box>
            )}

            {/* Container Principal: Define o Layout Flexível (Lista e Mapa) */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 3,
                    // Empilha em telas pequenas (mobile/sm) e divide em telas médias+ (desktop/md+)
                    flexDirection: { xs: 'column', sm: 'column', md: 'row' },
                    alignItems: 'flex-start'
                }}
            >

                {/* Coluna da Lista (60% no desktop) */}
                <Box sx={{
                    flexBasis: { xs: '100%', md: '60%' },
                    flexGrow: 1,
                    minWidth: { xs: '100%', md: 400 }
                }}>
                    <Paper elevation={2}>
                        {isLoading ? (
                            <RotasSkeleton />
                        ) : (
                            rotas.length > 0 ? (
                                <ListaRotas
                                    rotas={rotas}
                                    onDelete={iniciarDelecao}
                                    onRowClick={handleRowClick}
                                    selectedRotaId={selectedRotaId}
                                />
                            ) : !error && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'grey.600', p: 4 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                                    <Typography variant="h6">Nenhuma rota criada ainda.</Typography>
                                </Box>
                            )
                        )}
                    </Paper>
                </Box>

                {/* Coluna Direita: Mapa */}
                <Box sx={{ flexBasis: { xs: '100%', md: '40%' }, flexGrow: 1, minWidth: { xs: '100%', md: 350 } }}>
                    <Paper elevation={2} sx={{ height: { xs: 400, md: '50vh' }, minHeight: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                        <Typography variant="h6" sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd', flexShrink: 0 }}>
                            Visualização da Rota: {mapRota?.nome || (isLoadingRouteMap ? 'Carregando...' : 'Nenhuma Selecionada')}
                        </Typography>

                        <Box sx={{ flexGrow: 1, height: 'auto' }}>
                            {isLoading || isLoadingRouteMap ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <RouteMap
                                    demandas={mapDemandas as any}
                                    path={selectedRouteMap?.path as any[]}
                                    // [CORREÇÃO] Passa os pontos calculados (Global ou da Rota)
                                    startPoint={startPointForMap}
                                    endPoint={endPointForMap}
                                />
                            )}
                        </Box>
                    </Paper>
                </Box>

            </Box>

            {/* Modal de Confirmação de Deleção (Mantido) */}
            <Dialog
                open={openDeleteConfirm}
                onClose={handleCloseDeleteConfirm}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {"Confirmar Exclusão"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Tem certeza que deseja deletar a rota **{rotaParaDeletar?.nome}** (ID: {rotaParaDeletar?.id})? Esta ação não pode ser desfeita.
                        {deleteError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                Erro ao deletar: {deleteError}
                            </Alert>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} color="primary" disabled={isDeleting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={confirmarDelecao}
                        color="error"
                        autoFocus
                        disabled={isDeleting}
                    >
                        {isDeleting ? <CircularProgress size={24} /> : 'Deletar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}