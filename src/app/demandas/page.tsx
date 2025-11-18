'use client';
import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Alert, Pagination, Button, Typography } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Componentes UI
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import DemandasToolbar from "@/components/ui/demandas/DemandasToolbar";
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal";
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal";

// Hooks e Serviços
import { useDemandasData } from "@/hooks/useDemandasData";
import { useDemandasOperations } from "@/hooks/useDemandasOperations";
import { DemandasClient } from "@/services/client/demandas-client";
import { OptimizedRouteData } from "@/types/demanda";

export default function DemandasPage() {
    // 1. Estado de UI (Visualização, Modais)
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<any>(null);
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]);
    
    // Estado para Rota (específico desta página)
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedRouteData, setOptimizedRouteData] = useState<OptimizedRouteData | null>(null);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);

    // Dados Auxiliares (Status/Tipos) - Poderia ir para outro hook useAuxData
    const [availableStatus, setAvailableStatus] = useState<any[]>([]);
    const [availableTipos, setAvailableTipos] = useState<any[]>([]);

    // 2. Hooks de Dados e Operações
    const { 
        demandas, totalCount, isLoading, error, page, limit, setPage, filters, refresh 
    } = useDemandasData();

    const { 
        handleStatusChange, deleteDemandas, isProcessing: isDeleting, opError 
    } = useDemandasOperations(refresh);

    // Carregar dados auxiliares (Status/Tipos)
    useEffect(() => {
        Promise.all([
            fetch('/api/demandas-status').then(r => r.json()),
            fetch('/api/demandas-tipos').then(r => r.json())
        ]).then(([status, tipos]) => {
            setAvailableStatus(status);
            setAvailableTipos(tipos);
        }).catch(console.error);
    }, []);

    // 3. Handlers de Interface
    const handleSelectDemanda = (id: number) => {
         setSelectedDemandas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handlePrepareRota = async () => {
        if (selectedDemandas.length === 0) return;
        setIsOptimizing(true);
        try {
            const data = await DemandasClient.optimizeRoute(selectedDemandas);
            setOptimizedRouteData(data);
            setCriarRotaModalOpen(true);
        } catch (err) {
            console.error(err);
            // Mostrar erro de rota
        } finally {
            setIsOptimizing(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (selectedDemandas.length === 0) return;
        await deleteDemandas(selectedDemandas);
        setSelectedDemandas([]);
    };

    // --- Renderização ---
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 p-4">Demandas ({totalCount})</h1>
            
            <DemandasToolbar
                filtro={filters.texto}
                onFiltroChange={filters.setTexto}
                filtroStatusIds={filters.status}
                onFiltroStatusChange={(e) => filters.setStatus(e.target.value as any)}
                availableStatus={availableStatus}
                statusError={null} // Tratar erro se necessário
                filtroTipoNomes={filters.tipos}
                onFiltroTipoChange={(e) => filters.setTipos(e.target.value as any)}
                availableTipos={availableTipos}
                tiposError={null}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onAddDemandaClick={() => setAddModalOpen(true)}
                onCreateRotaClick={handlePrepareRota}
                onDeleteSelectedClick={handleConfirmDelete} // Simplified for example
                selectedDemandasCount={selectedDemandas.length}
                onClearStatusFilter={() => filters.setStatus([])}
                onClearTipoFilter={() => filters.setTipos([])}
                isOptimizing={isOptimizing}
            />

            {opError && <Box p={2}><Alert severity="error">{opError}</Alert></Box>}
            {error && <Box p={2}><Alert severity="error">{error}</Alert></Box>}

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : (
                <>
                    {viewMode === 'card' ? (
                        <ListaCardDemanda
                            demandas={demandas}
                            selectedDemandas={selectedDemandas}
                            onSelectDemanda={handleSelectDemanda}
                            onDelete={(id) => deleteDemandas([id])}
                            onEdit={(d) => { setDemandaParaEditar(d); setEditModalOpen(true); }}
                            onStatusChange={handleStatusChange}
                            availableStatus={availableStatus}
                        />
                    ) : (
                        <ListaListDemanda
                            demandas={demandas}
                            selectedDemandas={selectedDemandas}
                            onSelectDemanda={handleSelectDemanda}
                            onDelete={(id) => deleteDemandas([id])}
                            onEdit={(d) => { setDemandaParaEditar(d); setEditModalOpen(true); }}
                            onStatusChange={handleStatusChange}
                            availableStatus={availableStatus}
                        />
                    )}
                    
                    {/* Paginação */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <Pagination 
                            count={Math.ceil(totalCount / limit)} 
                            page={page} 
                            onChange={(_, v) => setPage(v)} 
                        />
                    </Box>
                </>
            )}

            {/* Modais */}
            <AddDemandaModal 
                open={addModalOpen} 
                onClose={() => { setAddModalOpen(false); refresh(); }} 
                availableTipos={availableTipos} 
            />
            
            {demandaParaEditar && (
                <AddDemandaModal 
                    key={demandaParaEditar.id} 
                    open={editModalOpen} 
                    onClose={() => setEditModalOpen(false)} 
                    demandaInicial={demandaParaEditar} 
                    onSuccess={() => { setEditModalOpen(false); refresh(); }} 
                    availableTipos={availableTipos} 
                />
            )}

            <CriarRotaModal
                open={criarRotaModalOpen}
                onClose={() => setCriarRotaModalOpen(false)}
                routeData={optimizedRouteData}
                onRotaCriada={(nome, resp) => { /* Lógica de sucesso */ setCriarRotaModalOpen(false); }}
            />
        </div>
    );
}