'use client';
import React, { useState, useEffect } from "react";
import { Box, Alert, Pagination, Typography } from "@mui/material";
import dynamic from 'next/dynamic'; // 1. Importar dynamic do Next.js

// Componentes UI Leves (Carregamento Imediato)
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import DemandasToolbar from "@/components/ui/demandas/DemandasToolbar";
import DemandasSkeleton from "@/components/ui/demandas/DemandasSkeleton"; // 2. Importar Skeleton

// Hooks e Serviços
import { useDemandasData } from "@/hooks/useDemandasData";
import { useDemandasOperations } from "@/hooks/useDemandasOperations";
import { DemandasClient } from "@/services/client/demandas-client";
import { OptimizedRouteData } from "@/types/demanda";

// 3. Carregamento Preguiçoso (Lazy Loading) dos Modais Pesados
const AddDemandaModal = dynamic(() => import("@/components/ui/demandas/AddDemandaModal"), {
  ssr: false // Não precisa renderizar no servidor pois é um modal de interação
});

const CriarRotaModal = dynamic(() => import("@/components/ui/demandas/CriarRotaModal"), {
  ssr: false
});

export default function DemandasPage() {
    // ... (Mantém todo o estado e hooks inalterados) ...
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<any>(null);
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]);
    
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedRouteData, setOptimizedRouteData] = useState<OptimizedRouteData | null>(null);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);

    const [availableStatus, setAvailableStatus] = useState<any[]>([]);
    const [availableTipos, setAvailableTipos] = useState<any[]>([]);

    const { 
        demandas, totalCount, isLoading, error, page, limit, setPage, filters, refresh 
    } = useDemandasData();

    const { 
        handleStatusChange, deleteDemandas, isProcessing: isDeleting, opError 
    } = useDemandasOperations(refresh);

    // ... (Mantém o useEffect de carga de dados auxiliares) ...
    useEffect(() => {
        Promise.all([
            fetch('/api/demandas-status').then(r => r.json()),
            fetch('/api/demandas-tipos').then(r => r.json())
        ]).then(([status, tipos]) => {
            setAvailableStatus(status);
            setAvailableTipos(tipos);
        }).catch(console.error);
    }, []);

    // ... (Mantém os Handlers handleSelectDemanda, handlePrepareRota, etc.) ...
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
            // Aqui poderia setar um estado de erro de rota para mostrar no alerta
        } finally {
            setIsOptimizing(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (selectedDemandas.length === 0) return;
        await deleteDemandas(selectedDemandas);
        setSelectedDemandas([]);
    };


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 p-4">Demandas ({totalCount})</h1>
            
            {/* A Toolbar é leve e deve aparecer imediatamente */}
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
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onAddDemandaClick={() => setAddModalOpen(true)}
                onCreateRotaClick={handlePrepareRota}
                onDeleteSelectedClick={handleConfirmDelete}
                selectedDemandasCount={selectedDemandas.length}
                onClearStatusFilter={() => filters.setStatus([])}
                onClearTipoFilter={() => filters.setTipos([])}
                isOptimizing={isOptimizing}
            />

            {opError && <Box p={2}><Alert severity="error">{opError}</Alert></Box>}
            {error && <Box p={2}><Alert severity="error">{error}</Alert></Box>}

            {/* 4. Substituição: Se isLoading, mostra o Skeleton ao invés do Spinner */}
            {isLoading ? (
                <DemandasSkeleton viewMode={viewMode} />
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
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <Pagination 
                            count={Math.ceil(totalCount / limit) || 1} 
                            page={page} 
                            onChange={(_, v) => setPage(v)} 
                            color="primary"
                        />
                    </Box>
                </>
            )}

            {/* 5. Modais carregados sob demanda (só baixam o JS se addModalOpen for true, etc) */}
            {addModalOpen && (
                <AddDemandaModal 
                    open={addModalOpen} 
                    onClose={() => { setAddModalOpen(false); refresh(); }} 
                    availableTipos={availableTipos} 
                />
            )}
            
            {editModalOpen && demandaParaEditar && (
                <AddDemandaModal 
                    key={demandaParaEditar.id} 
                    open={editModalOpen} 
                    onClose={() => setEditModalOpen(false)} 
                    demandaInicial={demandaParaEditar} 
                    onSuccess={() => { setEditModalOpen(false); refresh(); }} 
                    availableTipos={availableTipos} 
                />
            )}

            {criarRotaModalOpen && (
                <CriarRotaModal
                    open={criarRotaModalOpen}
                    onClose={() => setCriarRotaModalOpen(false)}
                    routeData={optimizedRouteData}
                    onRotaCriada={(nome, resp) => { 
                        /* Lógica de sucesso simples */ 
                        setCriarRotaModalOpen(false); 
                    }}
                />
            )}
        </div>
    );
}