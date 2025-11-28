// src/app/rotas/[id]/page.tsx
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation'; 
import {
    Box, Typography, Alert, Button, Paper, Chip, Snackbar, CircularProgress, 
    Dialog, DialogTitle, DialogContent, TextField, List, ListItem, ListItemText, Checkbox, DialogActions,
    InputAdornment
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save'; 
import ReplayIcon from '@mui/icons-material/Replay'; 
import DownloadIcon from '@mui/icons-material/Download';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RouteIcon from '@mui/icons-material/Route'; // <-- Novo Ícone
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

// Dnd Kit
import {
    KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// Skeleton
import RotaDetalhesSkeleton from '@/components/ui/rotas/RotaDetalhesSkeleton';

// Hooks
import { useRotaDetalhesData } from '@/hooks/useRotaDetalhesData';
import { useRotaDetalhesOperations } from '@/hooks/useRotaDetalhesOperations';
import { RotaDetalhesClient, DemandaNaoDistribuida, DemandaComOrdem } from '@/services/client/rota-detalhes-client'; 

// Imports Dinâmicos
const RouteMap = dynamic(() => import('@/components/ui/demandas/RouteMap'), {
    loading: () => <Box sx={{ height: '100%', bgcolor: '#eee' }} />,
    ssr: false
});

const DetalheRotaLista = dynamic(() => import('@/components/ui/rotas/DetalheRotaLista'), {
    ssr: false
});


export default function PaginaDetalheRota() {
    const params = useParams(); 
    const id = params.id as string;
    const rotaIdNumber = parseInt(id, 10);

    // 1. Hooks de Dados e Operações
    const {
        rota, demandas, setDemandas, 
        originalDemandas, originalApiPolyline, setApiPolyline,
        isLoading, error, hasChanges, routePath, refresh
    } = useRotaDetalhesData(id);

    const {
        saveOrder, exportToExcel, addDemandas, 
        optimizeOrder, // <-- NOVO MÉTODO
        isSaving, isExporting, isOptimizing, // <-- NOVO ESTADO
        opError, saveSuccess, setSaveSuccess, setOpError
    } = useRotaDetalhesOperations(id, refresh);
    
    // --- ESTADOS DO MODAL ---
    const [addDemandaModalOpen, setAddDemandaModalOpen] = useState(false);
    const [undistributedDemandas, setUndistributedDemandas] = useState<DemandaNaoDistribuida[]>([]);
    const [loadingUndistributed, setLoadingUndistributed] = useState(false);
    const [selectedNewDemandas, setSelectedNewDemandas] = useState<number[]>([]);
    const [modalFilter, setModalFilter] = useState('');
    // --- FIM ESTADOS MODAL ---


    // 2. Configuração DnD (Mantida)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // 3. Handlers de Interface (Mantidos)
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setApiPolyline(null); 
            setDemandas((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return items;
                return arrayMove(items, oldIndex, newIndex);
            });
            setOpError(null);
            setSaveSuccess(false);
        }
    }

    const handleRemoveDemanda = (demandaId: number) => {
        setApiPolyline(null);
        setDemandas(prev => prev.filter(d => d.id !== demandaId));
        setOpError(null);
        setSaveSuccess(false);
    };

    const handleCancelChanges = () => {
        setDemandas(originalDemandas); 
        setApiPolyline(originalApiPolyline);
        setOpError(null);
        setSaveSuccess(false);
    };

    const handleSaveClick = () => {
        saveOrder(demandas.map(d => ({ id: d.id! }))); 
    };
    
    // --- LÓGICA DE OTIMIZAÇÃO ---
    const handleOptimizeOrder = async () => {
        if (demandas.length <= 1) {
            setOpError("A rota precisa de pelo menos 2 demandas com coordenadas para ser otimizada.");
            return;
        }

        // 1. Coleta os IDs atuais
        const demandaIds = demandas
            .filter(d => d.id !== undefined)
            .map(d => d.id!);
        
        try {
            // 2. Chama a otimização
            const result = await optimizeOrder(demandaIds);

            // 3. ATUALIZA O ESTADO LOCAL
            // result.optimizedDemands é o array na ordem otimizada
            setDemandas(result.optimizedDemandas as DemandaComOrdem[]);
            
            // result.routePath é a string CODIFICADA (Encoded Polyline)
            setApiPolyline(result.routePath); 
            
            // As duas linhas acima corrigem o problema de coordenadas,
            // pois o useRotaDetalhesData agora pode decodificar o novo apiPolyline.

            setOpError(null);
            setSaveSuccess(false);

        } catch (e) {
            // O erro é tratado no hook
        }
    };
    // --- FIM LÓGICA DE OTIMIZAÇÃO ---

    // --- Lógica do Modal (Mantida) ---
    const fetchUndistributedDemandas = useCallback(async () => {
        setLoadingUndistributed(true);
        try {
            const result = await RotaDetalhesClient.getUndistributedDemandas();
            setUndistributedDemandas(result);
        } catch (e) {
            setOpError("Falha ao carregar demandas disponíveis.");
        } finally {
            setLoadingUndistributed(false);
        }
    }, []);

    useEffect(() => {
        if (addDemandaModalOpen) {
            fetchUndistributedDemandas();
            setSelectedNewDemandas([]); 
            setModalFilter('');
        }
    }, [addDemandaModalOpen, fetchUndistributedDemandas]);
    
    const toggleNewDemanda = (id: number) => {
        setSelectedNewDemandas(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };
    
    const handleAddSelectedDemandas = async () => {
        if (selectedNewDemandas.length === 0) return;
        
        try {
            const updatedDemandas = await addDemandas(selectedNewDemandas);
            
            setDemandas(updatedDemandas);
            setApiPolyline(null); // Invalida polyline
            setAddDemandaModalOpen(false); 
            setSelectedNewDemandas([]); 
            setOpError(null);
        } catch (e) {
            // Erro tratado no hook (opError)
        }
    };
    
    const filteredUndistributed = useMemo(() => {
        if (!modalFilter) return undistributedDemandas;
        const filterText = modalFilter.toLowerCase();
        return undistributedDemandas.filter(d =>
            d.protocolo.toLowerCase().includes(filterText) ||
            d.logradouro.toLowerCase().includes(filterText) ||
            d.nome_solicitante.toLowerCase().includes(filterText)
        );
    }, [undistributedDemandas, modalFilter]);


    // --- Renderização ---

    if (isLoading) {
        return <RotaDetalhesSkeleton />;
    }
    
    if (error || !rota) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    {error || "Rota não encontrada."}
                    <Button color="inherit" size="small" onClick={refresh} sx={{ ml: 2 }}>Tentar Novamente</Button>
                </Alert>
            </Box>
        );
    }

    let statusColor: "default" | "warning" | "info" | "success" = "default";
    if (rota.status === 'Pendente') statusColor = 'warning';
    if (rota.status === 'Em Andamento') statusColor = 'info';
    if (rota.status === 'Concluída') statusColor = 'success';

    return (
        <Box sx={{ p: { xs: 1, md: 3 } }}>
            {/* Cabeçalho */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button component={Link} href="/rotas" startIcon={<ArrowBackIcon />} sx={{ mr: 2 }} disabled={isSaving || isExporting || isOptimizing}>
                    Voltar
                </Button>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                    {rota.nome}
                </Typography>
                
                {/* [NOVO] Botão Otimizar Ordem */}
                <Button
                    variant="outlined" color="secondary"
                    startIcon={isOptimizing ? <CircularProgress size={20} /> : <RouteIcon />}
                    onClick={handleOptimizeOrder}
                    disabled={isSaving || isExporting || isOptimizing || demandas.length < 2}
                    title="Otimiza a ordem das paradas para o caminho mais curto."
                >
                    {isOptimizing ? 'Otimizando...' : 'Otimizar Ordem'}
                </Button>
                
                {/* Botão Adicionar Demanda */}
                <Button
                    variant="outlined" color="success"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setAddDemandaModalOpen(true)}
                    disabled={isSaving || isExporting || isOptimizing}
                >
                    Adicionar Demanda
                </Button>

                <Button
                    variant="outlined" color="primary"
                    startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                    onClick={exportToExcel}
                    disabled={isSaving || isExporting || hasChanges || isOptimizing}
                >
                    {isExporting ? 'Exportando...' : 'Exportar XLS'}
                </Button>

                {hasChanges && (
                    <Button
                        variant="outlined" color="secondary"
                        startIcon={<ReplayIcon />}
                        onClick={handleCancelChanges} 
                        disabled={isSaving || isExporting || isOptimizing}
                    >
                        Cancelar
                    </Button>
                )}

                <Button
                    variant="contained" color="primary"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveClick} 
                    disabled={isSaving || isExporting || !hasChanges || isOptimizing}
                    sx={{ minWidth: 150 }}
                >
                    {isSaving ? 'Salvando...' : 'Salvar Ordem'}
                </Button>
            </Box>

            {opError && <Alert severity="error" sx={{ mb: 2 }}>{opError}</Alert>}

            {/* Informações (Mantidas) */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary">Responsável</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{rota.responsavel || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip label={rota.status} color={statusColor} size="small" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary">Criada em</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{format(new Date(rota.created_at), 'dd/MM/yyyy HH:mm')}</Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Conteúdo Principal (Mantido) */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {/* Lista (Esquerda) */}
                <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '40%' }, minWidth: '300px' }}>
                    <Typography variant="h6" gutterBottom>
                        {demandas.length} Paradas na Rota
                    </Typography>
                    <DetalheRotaLista 
                        demandas={demandas} 
                        sensors={sensors} 
                        onDragEnd={handleDragEnd}
                        disabled={isSaving || isExporting || isOptimizing}
                        onRemove={handleRemoveDemanda}
                    />
                </Box>
                
                {/* Mapa (Direita) */}
                <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '55%' }, minWidth: '400px' }}>
                    <Typography variant="h6" gutterBottom>Visualização</Typography>
                    <Box sx={{ height: '70vh', minHeight: 400, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                        <RouteMap demandas={demandas as any} path={routePath} />
                    </Box>
                </Box>
            </Box>

            <Snackbar
                open={saveSuccess}
                autoHideDuration={4000}
                onClose={() => setSaveSuccess(false)}
                message="Ordem salva com sucesso!"
            />
            
            {/* Modal de Adição de Demandas (Mantido) */}
            <Dialog open={addDemandaModalOpen} onClose={() => setAddDemandaModalOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>
                    Adicionar Demandas à Rota #{rotaIdNumber}
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Selecione as demandas abaixo que ainda **não foram distribuídas** em nenhuma rota.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Filtrar por Protocolo, Endereço ou Solicitante"
                        variant="outlined"
                        size="small"
                        value={modalFilter}
                        onChange={(e) => setModalFilter(e.target.value)}
                        sx={{ mb: 2 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    {filteredUndistributed.length} de {undistributedDemandas.length}
                                </InputAdornment>
                            )
                        }}
                    />

                    {loadingUndistributed ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                    ) : (
                        <List dense sx={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                            {filteredUndistributed.map((demanda) => (
                                <ListItem
                                    key={demanda.id}
                                    onClick={() => toggleNewDemanda(demanda.id)}
                                    secondaryAction={
                                        <Checkbox 
                                            edge="end" 
                                            checked={selectedNewDemandas.includes(demanda.id)}
                                            onChange={() => toggleNewDemanda(demanda.id)}
                                        />
                                    }
                                    sx={{ '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}
                                >
                                    <ListItemText
                                        primary={`#${demanda.id} | ${demanda.tipo_demanda}: ${demanda.logradouro}, ${demanda.numero}`}
                                        secondary={`Solicitante: ${demanda.nome_solicitante} - ${demanda.status_nome}`}
                                    />
                                </ListItem>
                            ))}
                            {undistributedDemandas.length === 0 && <ListItem><ListItemText secondary="Nenhuma demanda disponível para adicionar." /></ListItem>}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDemandaModalOpen(false)} disabled={isSaving}>Cancelar</Button>
                    <Button 
                        onClick={handleAddSelectedDemandas} 
                        variant="contained" 
                        color="success" 
                        disabled={selectedNewDemandas.length === 0 || isSaving}
                    >
                        {isSaving ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : `Adicionar (${selectedNewDemandas.length}) Demandas`}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* FIM MODAL */}
        </Box>
    );
}