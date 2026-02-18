'use client';
import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Alert, Pagination, Typography,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
    Paper, CircularProgress
} from "@mui/material";
import dynamic from 'next/dynamic';

import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import DemandasToolbar from "@/components/ui/demandas/DemandasToolbar";
import DemandasSkeleton from "@/components/ui/demandas/DemandasSkeleton";
import DetalhesDemandaModal from "@/components/ui/demandas/DetalhesDemandaModal"; // [NOVO IMPORT]

import { useDemandasData } from "@/hooks/useDemandasData";
import { useDemandasOperations } from "@/hooks/useDemandasOperations";
import { useDemandasMapData } from "@/hooks/useDemandasMapData";
import { DemandasClient } from "@/services/client/demandas-client";
import { OptimizedRouteData, DemandaComIdStatus } from "@/types/demanda";

const AddDemandaModal = dynamic(() => import("@/components/ui/demandas/AddDemandaModal"), { ssr: false });
const CriarRotaModal = dynamic(() => import("@/components/ui/demandas/CriarRotaModal"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/ui/demandas/RouteMap"), {
    loading: () => <Box sx={{ height: 600, bgcolor: '#eee' }} />,
    ssr: false
});

export default function DemandasPage() {
    const [viewMode, setViewMode] = useState<'card' | 'list' | 'map'>('card');

    const handleViewModeChange = (mode: 'card' | 'list' | 'map') => {
        setViewMode(mode);
        if (mode === 'map') fetchMapData(filters);
    };

    const {
        demandas, setDemandas, totalCount, isLoading, error, page, limit, setPage,
        filters, refresh, availableStatus, availableTipos, availableBairros
    } = useDemandasData();
    const { demandasMap, isLoadingMap, fetchMapData } = useDemandasMapData();

    // Sincroniza Mapa com Filtros
    useEffect(() => {
        if (viewMode === 'map') {
            fetchMapData(filters);
        }
    }, [filters.texto, filters.status, filters.tipos, filters.bairros, viewMode, fetchMapData]);

    const { deleteDemandas, isProcessing: isDeleting, opError, clearError } = useDemandasOperations(refresh);

    // Refresh map when data reaches backend
    const originalRefresh = refresh;
    const syncedRefresh = useCallback(() => {
        originalRefresh();
        if (viewMode === 'map') fetchMapData(filters);
    }, [originalRefresh, viewMode, fetchMapData, filters]);

    // Estados Modais
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<any>(null);
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]);

    // [NOVO] Estados para Visualização de Detalhes (via Mapa)
    const [viewDemandaModalOpen, setViewDemandaModalOpen] = useState(false);
    const [selectedDemandaForView, setSelectedDemandaForView] = useState<DemandaComIdStatus | null>(null);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedRouteData, setOptimizedRouteData] = useState<OptimizedRouteData | null>(null);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    // Handlers
    const handleSelectDemanda = (id: number) => {
        setSelectedDemandas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // [NOVO] Handler para clique no mapa
    const handleMapMarkerClick = (demanda: any) => {
        setSelectedDemandaForView(demanda);
        setViewDemandaModalOpen(true);
    };

    const handleRequestDeleteSelected = () => {
        if (selectedDemandas.length === 0) return;
        setItemToDelete(null);
        setDeleteConfirmationOpen(true);
    };

    const handleRequestDeleteSingle = (id: number) => {
        setItemToDelete(id);
        setDeleteConfirmationOpen(true);
    };

    const executeDelete = async () => {
        setDeleteConfirmationOpen(false);
        const idsToDelete = itemToDelete ? [itemToDelete] : selectedDemandas;
        if (idsToDelete.length === 0) return;
        await deleteDemandas(idsToDelete);
        setSelectedDemandas([]);
        setItemToDelete(null);
    };

    const handlePrepareRota = async () => {
        if (selectedDemandas.length === 0) return;
        setIsOptimizing(true);
        try {
            const data = await DemandasClient.optimizeRoute(selectedDemandas);
            setOptimizedRouteData(data);
            setCriarRotaModalOpen(true);
        } catch (err) { console.error(err); }
        finally { setIsOptimizing(false); }
    };

    const handleStatusUpdateLocal = async (demandaId: number, newStatusId: number) => {
        const statusInfo = availableStatus.find(s => s.id === newStatusId);
        if (!statusInfo) return;
        try {
            await DemandasClient.updateStatus(demandaId, newStatusId);
            setDemandas((prev) => prev.map((d) => {
                if (d.id === demandaId) return { ...d, id_status: newStatusId, status_nome: statusInfo.nome, status_cor: statusInfo.cor };
                return d;
            }));
        } catch (err) { alert("Erro ao atualizar status."); }
    };

    const handleViewDemanda = (demanda: DemandaComIdStatus) => {
        setSelectedDemandaForView(demanda);
        setViewDemandaModalOpen(true);
    };

    return (
        <Box>
            <Box sx={{ px: 3, pt: 3 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Gestão de Demandas ({totalCount})
                </Typography>

                <DemandasToolbar
                    filtro={filters.texto}
                    onFiltroChange={filters.setTexto}
                    filtroStatusIds={filters.status}
                    onFiltroStatusChange={(e) => filters.setStatus(e.target.value as any)}
                    availableStatus={availableStatus}
                    statusError={null}
                    filtroTipoNomes={filters.tipos}
                    onFiltroTipoChange={(e) => filters.setTipos(e.target.value as any)}
                    availableTipos={availableTipos}
                    tiposError={null}
                    filtroBairros={filters.bairros}
                    onFiltroBairrosChange={(e) => filters.setBairros(e.target.value as any)}
                    availableBairros={availableBairros}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    onAddDemandaClick={() => setAddModalOpen(true)}
                    onCreateRotaClick={handlePrepareRota}
                    onDeleteSelectedClick={handleRequestDeleteSelected}
                    selectedDemandasCount={selectedDemandas.length}
                    onClearStatusFilter={() => filters.setStatus([])}
                    onClearTipoFilter={() => filters.setTipos([])}
                    onClearBairroFilter={() => filters.setBairros([])}
                    isOptimizing={isOptimizing}
                />
            </Box>

            <Box sx={{ px: 3, pb: 3 }}>
                {opError && <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>{opError}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Cards */}
                {viewMode === 'card' && (
                    isLoading ? <DemandasSkeleton viewMode="card" /> : (
                        <>
                            <ListaCardDemanda
                                demandas={demandas}
                                selectedDemandas={selectedDemandas}
                                onSelectDemanda={handleSelectDemanda}
                                onDelete={handleRequestDeleteSingle}
                                onEdit={(d: DemandaComIdStatus) => { setDemandaParaEditar(d); setEditModalOpen(true); }}
                                onView={handleViewDemanda}
                                onStatusChange={handleStatusUpdateLocal}
                                availableStatus={availableStatus}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Pagination count={Math.ceil(totalCount / limit) || 1} page={page} onChange={(_, v) => setPage(v)} color="primary" size="large" />
                            </Box>
                        </>
                    )
                )}

                {/* Lista */}
                {viewMode === 'list' && (
                    isLoading ? <DemandasSkeleton viewMode="list" /> : (
                        <>
                            <ListaListDemanda
                                demandas={demandas}
                                selectedDemandas={selectedDemandas}
                                onSelectDemanda={handleSelectDemanda}
                                onDelete={handleRequestDeleteSingle}
                                onEdit={(d: DemandaComIdStatus) => { setDemandaParaEditar(d); setEditModalOpen(true); }}
                                onView={handleViewDemanda}
                                onStatusChange={handleStatusUpdateLocal}
                                availableStatus={availableStatus}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Pagination count={Math.ceil(totalCount / limit) || 1} page={page} onChange={(_, v) => setPage(v)} color="primary" size="large" />
                            </Box>
                        </>
                    )
                )}

                {/* MODO MAPA GERAL */}
                {viewMode === 'map' && (
                    <Paper elevation={2} sx={{ height: '75vh', overflow: 'hidden', borderRadius: 2 }}>
                        {isLoadingMap ? (
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <CircularProgress />
                                <Typography sx={{ mt: 2 }} color="text.secondary">Carregando todas as demandas no mapa...</Typography>
                            </Box>
                        ) : (
                            <RouteMap
                                // [CORREÇÃO DE BUILD]
                                // Adicionamos ': any' para o TypeScript aceitar 'd.lat' e 'd.lng'
                                demandas={demandasMap.map((d: any) => ({
                                    ...d,
                                    lat: d.lat || null,
                                    lng: d.lng || null
                                }))}
                                path={[]}
                                modalIsOpen={true}
                                viewMode="points"
                                onMarkerClick={handleMapMarkerClick}
                            />
                        )}
                    </Paper>
                )}
            </Box>

            {/* Modais */}
            <Dialog open={deleteConfirmationOpen} onClose={() => setDeleteConfirmationOpen(false)}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {itemToDelete ? "Excluir esta demanda?" : `Excluir ${selectedDemandas.length} demanda(s)?`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmationOpen(false)}>Cancelar</Button>
                    <Button onClick={executeDelete} color="error" variant="contained">Excluir</Button>
                </DialogActions>
            </Dialog>

            {addModalOpen && (
                <AddDemandaModal open={addModalOpen} onClose={() => { setAddModalOpen(false); refresh(); }} availableTipos={availableTipos} />
            )}

            {editModalOpen && demandaParaEditar && (
                <AddDemandaModal key={demandaParaEditar.id} open={editModalOpen} onClose={() => setEditModalOpen(false)} demandaInicial={demandaParaEditar} onSuccess={() => { setEditModalOpen(false); refresh(); }} availableTipos={availableTipos} />
            )}

            {criarRotaModalOpen && (
                <CriarRotaModal open={criarRotaModalOpen} onClose={() => setCriarRotaModalOpen(false)} routeData={optimizedRouteData} onRotaCriada={() => setCriarRotaModalOpen(false)} />
            )}

            {/* [NOVO] Modal de Detalhes (acionado pelo Mapa) */}
            {viewDemandaModalOpen && selectedDemandaForView && (
                <DetalhesDemandaModal
                    open={viewDemandaModalOpen}
                    onClose={() => setViewDemandaModalOpen(false)}
                    demanda={selectedDemandaForView}
                />
            )}
        </Box>
    );
}