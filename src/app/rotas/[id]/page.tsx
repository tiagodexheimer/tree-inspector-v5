// src/app/rotas/[id]/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation'; 
import {
    Box, Typography, CircularProgress, Alert, Button, Paper,
    Chip, Snackbar 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save'; 
import ReplayIcon from '@mui/icons-material/Replay'; 
import DownloadIcon from '@mui/icons-material/Download';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DemandaType } from '@/types/demanda';
import DetalheRotaLista from '@/components/ui/rotas/DetalheRotaLista';
import { format } from 'date-fns';
import {
    // *** IMPORTS DO DND-KIT ***
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors, // Importado
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
// Importar o Decode
import { decode } from '@googlemaps/polyline-codec'; 


const RouteMap = dynamic(() => import('@/components/ui/demandas/RouteMap'), {
    ssr: false,
    loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa...</Box>
});

const START_END_POINT: [number, number] = [-29.8608, -51.1789]; 

// Interfaces
interface Rota {
    id: number;
    nome: string;
    responsavel: string;
    status: string;
    created_at: string;
}
export interface DemandaComOrdem extends DemandaType {
    ordem: number;
    status_nome: string;
    status_cor: string;
}
interface RotaDetalhesResponse {
  rota: Rota;
  demandas: DemandaComOrdem[];
  encodedPolyline: string | null; 
}


export default function PaginaDetalheRota() {
    const params = useParams(); 
    const id = params.id as string;

    const [rota, setRota] = useState<Rota | null>(null);
    const [demandas, setDemandas] = useState<DemandaComOrdem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const [apiPolyline, setApiPolyline] = useState<string | null>(null);
    const [originalApiPolyline, setOriginalApiPolyline] = useState<string | null>(null);
    const [originalDemandas, setOriginalDemandas] = useState<DemandaComOrdem[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    
    const [isExporting, setIsExporting] = useState(false);

    const hasChanges = useMemo(() => {
        if (demandas.length !== originalDemandas.length) return true;
        return demandas.some((demanda, index) => demanda.id !== originalDemandas[index]?.id);
    }, [demandas, originalDemandas]);


    // Função de busca
    const fetchRotaDetalhes = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/rotas/${id}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: RotaDetalhesResponse = await response.json();
            
            setRota(data.rota);
            setDemandas(data.demandas);
            setOriginalDemandas(data.demandas); 
            setApiPolyline(data.encodedPolyline);
            setOriginalApiPolyline(data.encodedPolyline); 
            
        } catch (err) {
            console.error(`[PAGE /rotas/${id}] Falha ao buscar detalhes:`, err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchRotaDetalhes();
        }
    }, [id, fetchRotaDetalhes]); 

    // Recalcula o caminho do mapa
    const routePath = useMemo(() => {
        if (apiPolyline && !hasChanges) {
            try {
                return decode(apiPolyline); 
            } catch (e) {
                console.error("Erro ao decodificar polyline da API:", e);
            }
        }
        if (demandas.length === 0) return [];
        const path: [number, number][] = [
            START_END_POINT,
            ...demandas
                .filter(d => d.geom?.coordinates) 
                .map(d => 
                    [d.geom!.coordinates[1], d.geom!.coordinates[0]] as [number, number]
            ),
            START_END_POINT
        ];
        return path;
    }, [demandas, apiPolyline, hasChanges]); 

    
    // --- (Funções Dnd, Save, Cancel, Export) ---

    // Definir a constante 'sensors'
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setApiPolyline(null); // Limpa a polyline para usar linhas retas
            setDemandas((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                 if (oldIndex === -1 || newIndex === -1) return items;
                return arrayMove(items, oldIndex, newIndex);
            });
            setSaveError(null);
            setSaveSuccess(false);
        }
    }

    // Função para Remover Demanda (localmente)
    const handleRemoveDemanda = (demandaIdToRemove: number) => {
        console.log("Removendo demanda ID:", demandaIdToRemove);
        setApiPolyline(null); // Limpa a polyline
        setDemandas(prev => prev.filter(d => d.id !== demandaIdToRemove));
        setSaveError(null);
        setSaveSuccess(false);
    };

    // Função para Cancelar Alterações
    const handleCancelChanges = () => {
        setDemandas(originalDemandas); 
        setApiPolyline(originalApiPolyline); // Restaura polyline original
        setSaveError(null);
        setSaveSuccess(false);
    };


    // Função para Salvar a Ordem (API de reorder)
    const handleSaveOrder = async () => {
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            const response = await fetch(`/api/rotas/${id}/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    demandas: demandas.map(d => ({ id: d.id })) 
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status} ao salvar.`);
            }

            setSaveSuccess(true); 
            // Re-busca os dados para pegar a nova polyline oficial
            await fetchRotaDetalhes(); 

        } catch (err) {
             console.error(`[PAGE /rotas/${id}] Falha ao salvar ordem:`, err);
             setSaveError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setIsSaving(false);
        }
    };

    // Função para Exportar
    const handleExport = async () => {
        if (!rota) return;
        setIsExporting(true);
        setSaveError(null); 

        try {
            const response = await fetch(`/api/rotas/${id}/export`);

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Erro ${response.status} ao gerar arquivo.`);
            }

            const disposition = response.headers.get('content-disposition');
            let filename = `Rota_${id}.xlsx`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename; 
            document.body.appendChild(a);
            a.click(); 
            
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error(`[PAGE /rotas/${id}] Falha ao exportar:`, err);
            setSaveError(err instanceof Error ? err.message : 'Erro desconhecido ao exportar.');
        } finally {
            setIsExporting(false);
        }
    };
    // --- FIM DAS FUNÇÕES ---


    // --- Renderização (Loading, Error) ---
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
        return (
            <Box sx={{p: 2}}>
                <Alert severity="warning">Rota não encontrada.</Alert>
            </Box>
        );
    }
    

    // Define a cor do chip de status
    let statusColor: "default" | "warning" | "info" | "success" = "default";
    if (rota.status === 'Pendente') statusColor = 'warning';
    if (rota.status === 'Em Andamento') statusColor = 'info';
    if (rota.status === 'Concluída') statusColor = 'success';

    return (
        <Box sx={{ p: { xs: 1, md: 3 } }}>
            {/* Cabeçalho da Página */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button
                    component={Link}
                    href="/rotas"
                    startIcon={<ArrowBackIcon />}
                    sx={{ mr: 2 }}
                    disabled={isSaving || isExporting}
                >
                    Voltar
                </Button>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                    {rota.nome}
                </Typography>
                
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                    onClick={handleExport}
                    disabled={isSaving || isExporting || hasChanges}
                >
                    {isExporting ? 'Exportando...' : 'Exportar XLS'}
                </Button>

                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<ReplayIcon />}
                    onClick={handleCancelChanges} 
                    disabled={!hasChanges || isSaving || isExporting}
                    sx={{ 
                        visibility: hasChanges ? 'visible' : 'hidden',
                        opacity: hasChanges ? 1 : 0,
                        transition: 'visibility 0s, opacity 0.2s linear',
                        mr: 1
                    }}
                >
                    Cancelar
                </Button>

                <Button
                    variant="contained"
                    color="primary"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveOrder} 
                    disabled={isSaving || isExporting}
                    sx={{ 
                        visibility: hasChanges ? 'visible' : 'hidden',
                        opacity: hasChanges ? 1 : 0,
                        transition: 'visibility 0s, opacity 0.2s linear',
                        minWidth: 150
                    }}
                >
                    {isSaving ? 'Salvando...' : 'Salvar Ordem'}
                </Button>
            </Box>

            {/* Alerta de Erro de Salvamento */}
            {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

            {/* Informações da Rota */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '30%' }, minWidth: '200px' }}>
                        <Typography variant="body2" color="text.secondary">Responsável</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{rota.responsavel || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1, flexBasis: { xs: '45%', sm: '30%' }, minWidth: '150px' }}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip label={rota.status} color={statusColor} size="small" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, flexBasis: { xs: '45%', sm: '30%' }, minWidth: '200px' }}>
                        <Typography variant="body2" color="text.secondary">Criada em</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {format(new Date(rota.created_at), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Layout Dividido */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {/* Coluna da Esquerda (Lista) */}
                <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '40%' }, minWidth: '300px' }}>
                    <Typography variant="h6" gutterBottom>
                        {demandas.length} Paradas na Rota (Arraste para reordenar)
                    </Typography>
                    <DetalheRotaLista 
                        demandas={demandas} 
                        sensors={sensors} 
                        onDragEnd={handleDragEnd}
                        disabled={isSaving || isExporting}
                        onRemove={handleRemoveDemanda}
                    />
                </Box>
                {/* Coluna da Direita (Mapa) */}
                <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '55%' }, minWidth: '400px' }}>
                    <Typography variant="h6" gutterBottom>
                        Visualização no Mapa
                    </Typography>
                    <Box sx={{ height: '70vh', minHeight: 400, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                        <RouteMap
                            demands={demandas} 
                            path={routePath}    
                        />
                    </Box>
                </Box>
            </Box>


            {/* Snackbar de Sucesso */}
            <Snackbar
                open={saveSuccess}
                autoHideDuration={4000}
                onClose={() => setSaveSuccess(false)}
                message="Nova ordem salva com sucesso!"
            />
        </Box>
    );
}