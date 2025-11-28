// src/app/rotas/page.tsx
'use client';

import React, { useState } from 'react';
import {
    Box, Typography, Alert, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Paper, CircularProgress
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import dynamic from 'next/dynamic';

// 2. Importar o Skeleton
import RotasSkeleton from '@/components/ui/rotas/RotasSkeleton';

// Hooks e Tipos
import { useRotasData } from '@/hooks/useRotasData';
import { useRotasOperations } from '@/hooks/useRotasOperations';
import { RotaComContagem } from '@/services/client/rotas-client';

// 3. Importação Dinâmica do Componente Pesado (DataGrid) e do Mapa
const ListaRotas = dynamic(() => import('@/components/ui/rotas/ListaRotas'), {
    loading: () => <RotasSkeleton />,
    ssr: false // DataGrid geralmente é client-side only
});

const RouteMap = dynamic(() => import('@/components/ui/demandas/RouteMap'), {
    loading: () => <Box sx={{ height: '100%', bgcolor: '#eee' }} />,
    ssr: false
});


export default function RotasPage() {
    // Hooks de Dados e Operações
    // [MODIFICADO] Desestrutura os novos retornos
    const { 
        rotas, isLoading, error, refresh, setRotas, 
        selectedRouteMap, isLoadingRouteMap, fetchRouteDetailsForMap 
    } = useRotasData();
    
    // Estado Local de UI (Modais)
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [rotaParaDeletar, setRotaParaDeletar] = useState<RotaComContagem | null>(null);

    // Estado de Operações (Escrita)
    const { deleteRota, isProcessing: isDeleting, opError: deleteError, clearError } = useRotasOperations();

    // Handlers
    const iniciarDelecao = (id: number) => {
        const rota = rotas.find(r => r.id === id) || null;
        if (rota) {
            setRotaParaDeletar(rota);
            clearError();
            setOpenDeleteConfirm(true);
        }
    };
    
    // [NOVO] Handler para o clique na linha (Dispara a busca dos detalhes para o mapa)
    const handleRowClick = (id: number) => {
        fetchRouteDetailsForMap(id);
    };


    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setTimeout(() => {
            setRotaParaDeletar(null);
            clearError();
        }, 300);
    };

    const confirmarDelecao = async () => {
        if (!rotaParaDeletar) return;

        try {
            await deleteRota(rotaParaDeletar.id);
            setRotas(prev => prev.filter(r => r.id !== rotaParaDeletar.id));
            handleCloseDeleteConfirm();
            
            // [NOVO] Se a rota deletada era a que estava no mapa, limpa o mapa e tenta carregar a primeira da nova lista
            if (selectedRouteMap && selectedRouteMap.rota.id === rotaParaDeletar.id) {
                 // Força o refresh para carregar a primeira nova rota
                 refresh();
            }

        } catch (error) {
            // Erro capturado no hook
        }
    };
    
    // Rota atualmente selecionada para o mapa (para destacar a linha na lista)
    const selectedRotaId = selectedRouteMap?.rota.id || null;

    return (
        <Box sx={{ p: 2 }}>
            <h1 className="text-2xl font-bold mb-4">
                Rotas Criadas
            </h1>

            {/* Tratamento de Erro */}
            {error && (
                <Box sx={{ p: 2 }}>
                    <Alert severity="error">
                        Erro ao carregar rotas: {error}
                        <Button color="inherit" size="small" onClick={refresh}>Tentar Novamente</Button>
                    </Alert>
                </Box>
            )}

            {/* Layout Principal: Lista (60%) e Mapa (40%) */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    gap: 3, 
                    flexDirection: { xs: 'column', lg: 'row' },
                    minHeight: '80vh' 
                }}
            >
                {/* Coluna da Lista */}
                <Box sx={{ flex: '3 1 50%', minWidth: 350 }}>
                    <Paper elevation={2}>
                        {isLoading ? (
                            <Box sx={{ p: 2 }}>
                                <RotasSkeleton />
                            </Box>
                        ) : (
                            rotas.length > 0 ? (
                                <ListaRotas 
                                    rotas={rotas} 
                                    onDelete={iniciarDelecao} 
                                    onRowClick={handleRowClick} // Passa o novo handler
                                    selectedRotaId={selectedRotaId} // Passa o ID selecionado
                                />
                            ) : !error && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                                    <Typography variant="h6">Nenhuma rota criada ainda.</Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        Vá para a página de <a href="/demandas" style={{ color: '#1976d2', textDecoration: 'underline' }}>Demandas</a> para criar sua primeira rota.
                                    </Typography>
                                </Box>
                            )
                        )}
                    </Paper>
                </Box>
                
                {/* Coluna do Mapa */}
                <Box sx={{ flex: '2 1 40%', minWidth: 300, minHeight: 400 }}>
                    <Paper elevation={2} sx={{ height: '100%', p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Visualização da Rota: {selectedRouteMap?.rota.nome || 'N/A'}
                        </Typography>
                        
                        <Box sx={{ height: '90%', minHeight: 350, position: 'relative', overflow: 'hidden', borderRadius: 1 }}>
                            {isLoadingRouteMap && (
                                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                                    <CircularProgress />
                                </Box>
                            )}
                            
                            {selectedRouteMap && (
                                <RouteMap
                                    demandas={selectedRouteMap.demandas as any} // O tipo DemandaComOrdem deve ser compatível
                                    path={selectedRouteMap.path}
                                    modalIsOpen={true} // Força o invalidateSize
                                />
                            )}
                            
                            {!selectedRouteMap && !isLoadingRouteMap && rotas.length > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', bgcolor: '#eee' }}>
                                    <Typography color="text.secondary">Selecione uma rota na lista.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Modal de Confirmação (Mantido) */}
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Você tem certeza que deseja excluir a rota:
                    </DialogContentText>
                    <Typography variant="h6" sx={{ my: 1, fontWeight: 'bold' }}>
                        {rotaParaDeletar?.nome} (ID: {rotaParaDeletar?.id})
                    </Typography>
                    <DialogContentText>
                        Todas as associações de demandas com esta rota serão perdidas.
                        Esta ação não pode ser desfeita.
                    </DialogContentText>
                    
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" disabled={isDeleting}>
                        {isDeleting ? <Typography variant="caption">Excluindo...</Typography> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}