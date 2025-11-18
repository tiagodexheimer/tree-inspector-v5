'use client';

import React from 'react';
import { useParams } from 'next/navigation'; 
import {
    Box, Typography, Alert, Button, Paper, Chip, Snackbar, CircularProgress // <--- ADICIONADO AQUI
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save'; 
import ReplayIcon from '@mui/icons-material/Replay'; 
import DownloadIcon from '@mui/icons-material/Download';
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

// --- Imports Dinâmicos ---
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

    // 1. Hooks de Dados e Operações
    const {
        rota, demandas, setDemandas, 
        originalDemandas, originalApiPolyline, setApiPolyline,
        isLoading, error, hasChanges, routePath, refresh
    } = useRotaDetalhesData(id);

    const {
        saveOrder, exportToExcel,
        isSaving, isExporting, opError, saveSuccess, setSaveSuccess, setOpError
    } = useRotaDetalhesOperations(id, refresh);

    // 2. Configuração DnD
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // 3. Handlers de Interface
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setApiPolyline(null); // Invalida polyline otimizada
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

    // Status Chip Color
    let statusColor: "default" | "warning" | "info" | "success" = "default";
    if (rota.status === 'Pendente') statusColor = 'warning';
    if (rota.status === 'Em Andamento') statusColor = 'info';
    if (rota.status === 'Concluída') statusColor = 'success';

    return (
        <Box sx={{ p: { xs: 1, md: 3 } }}>
            {/* Cabeçalho */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button component={Link} href="/rotas" startIcon={<ArrowBackIcon />} sx={{ mr: 2 }} disabled={isSaving || isExporting}>
                    Voltar
                </Button>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                    {rota.nome}
                </Typography>
                
                <Button
                    variant="outlined" color="primary"
                    startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                    onClick={exportToExcel}
                    disabled={isSaving || isExporting || hasChanges}
                >
                    {isExporting ? 'Exportando...' : 'Exportar XLS'}
                </Button>

                {hasChanges && (
                    <Button
                        variant="outlined" color="secondary"
                        startIcon={<ReplayIcon />}
                        onClick={handleCancelChanges} 
                        disabled={isSaving || isExporting}
                    >
                        Cancelar
                    </Button>
                )}

                <Button
                    variant="contained" color="primary"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveClick} 
                    disabled={isSaving || isExporting || !hasChanges}
                    sx={{ minWidth: 150 }}
                >
                    {isSaving ? 'Salvando...' : 'Salvar Ordem'}
                </Button>
            </Box>

            {opError && <Alert severity="error" sx={{ mb: 2 }}>{opError}</Alert>}

            {/* Informações */}
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

            {/* Conteúdo Principal */}
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
                        disabled={isSaving || isExporting}
                        onRemove={handleRemoveDemanda}
                    />
                </Box>
                
                {/* Mapa (Direita) */}
                <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '55%' }, minWidth: '400px' }}>
                    <Typography variant="h6" gutterBottom>Visualização</Typography>
                    <Box sx={{ height: '70vh', minHeight: 400, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                        <RouteMap demandas={demandas} path={routePath} />
                    </Box>
                </Box>
            </Box>

            <Snackbar
                open={saveSuccess}
                autoHideDuration={4000}
                onClose={() => setSaveSuccess(false)}
                message="Ordem salva com sucesso!"
            />
        </Box>
    );
}