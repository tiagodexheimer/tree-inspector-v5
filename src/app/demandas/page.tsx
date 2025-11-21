'use client';
import React, { useState, useEffect } from "react";
import { 
    Box, Alert, Pagination, Typography, 
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button 
} from "@mui/material";
import dynamic from 'next/dynamic';

// Componentes UI Leves
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import DemandasToolbar from "@/components/ui/demandas/DemandasToolbar";
import DemandasSkeleton from "@/components/ui/demandas/DemandasSkeleton";

// Hooks e Serviços
import { useDemandasData } from "@/hooks/useDemandasData";
import { useDemandasOperations } from "@/hooks/useDemandasOperations";
import { DemandasClient } from "@/services/client/demandas-client";
import { OptimizedRouteData } from "@/types/demanda";

// Modais Pesados
const AddDemandaModal = dynamic(() => import("@/components/ui/demandas/AddDemandaModal"), { ssr: false });
const CriarRotaModal = dynamic(() => import("@/components/ui/demandas/CriarRotaModal"), { ssr: false });

export default function DemandasPage() {
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<any>(null);
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]);
    
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedRouteData, setOptimizedRouteData] = useState<OptimizedRouteData | null>(null);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);

    // --- NOVO ESTADO PARA CONFIRMAÇÃO ---
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null); // Caso seja deleção unitária

    const [availableStatus, setAvailableStatus] = useState<any[]>([]);
    const [availableTipos, setAvailableTipos] = useState<any[]>([]);

    const { 
        demandas, setDemandas, totalCount, isLoading, error, page, limit, setPage, filters, refresh 
    } = useDemandasData();

    const { 
        deleteDemandas, isProcessing: isDeleting, opError, clearError 
    } = useDemandasOperations(refresh);

    // --- HANDLERS DE DELEÇÃO ---

    // 1. Acionado pelo botão "Lixeira" na Toolbar (Lote)
    const handleRequestDeleteSelected = () => {
        if (selectedDemandas.length === 0) return;
        setItemToDelete(null); // Indica que é lote
        setDeleteConfirmationOpen(true);
    };

    // 2. Acionado pelo botão "Lixeira" no Card/Linha (Individual)
    const handleRequestDeleteSingle = (id: number) => {
        setItemToDelete(id);
        setDeleteConfirmationOpen(true);
    };

    // 3. Executa a exclusão real após confirmação
    const executeDelete = async () => {
        setDeleteConfirmationOpen(false);
        
        const idsToDelete = itemToDelete ? [itemToDelete] : selectedDemandas;
        
        if (idsToDelete.length === 0) return;

        await deleteDemandas(idsToDelete);
        
        // Limpa seleção se foi sucesso (opcional, o refresh já deve cuidar)
        setSelectedDemandas([]);
        setItemToDelete(null);
    };

    // --- OUTROS HANDLERS ---
    const handleStatusUpdateLocal = async (demandaId: number, newStatusId: number) => {
        const statusInfo = availableStatus.find(s => s.id === newStatusId);
        if (!statusInfo) return;

        try {
            await DemandasClient.updateStatus(demandaId, newStatusId);
            setDemandas((prev) => prev.map((d) => {
                if (d.id === demandaId) {
                    return { ...d, id_status: newStatusId, status_nome: statusInfo.nome, status_cor: statusInfo.cor };
                }
                return d;
            }));
        } catch (err) {
            console.error("Erro status:", err);
            alert("Erro ao atualizar status.");
        }
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/demandas-status').then(r => r.json()),
            fetch('/api/demandas-tipos').then(r => r.json())
        ]).then(([status, tipos]) => {
            setAvailableStatus(status);
            setAvailableTipos(tipos);
        }).catch(console.error);
    }, []);

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
        } catch (err) { console.error(err); } 
        finally { setIsOptimizing(false); }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 p-4">Demandas ({totalCount})</h1>
            
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
                onDeleteSelectedClick={handleRequestDeleteSelected} // Alterado aqui
                selectedDemandasCount={selectedDemandas.length}
                onClearStatusFilter={() => filters.setStatus([])}
                onClearTipoFilter={() => filters.setTipos([])}
                isOptimizing={isOptimizing}
            />

            {/* Mostra erro de operação (ex: bloqueio de rota) */}
            {opError && (
                <Box p={2}>
                    <Alert severity="error" onClose={clearError}>{opError}</Alert>
                </Box>
            )}
            
            {error && <Box p={2}><Alert severity="error">{error}</Alert></Box>}

            {isLoading ? (
                <DemandasSkeleton viewMode={viewMode} />
            ) : (
                <>
                    {viewMode === 'card' ? (
                        <ListaCardDemanda
                            demandas={demandas}
                            selectedDemandas={selectedDemandas}
                            onSelectDemanda={handleSelectDemanda}
                            onDelete={handleRequestDeleteSingle} // Alterado aqui
                            onEdit={(d) => { setDemandaParaEditar(d); setEditModalOpen(true); }}
                            onStatusChange={handleStatusUpdateLocal}
                            availableStatus={availableStatus}
                        />
                    ) : (
                        <ListaListDemanda
                            demandas={demandas}
                            selectedDemandas={selectedDemandas}
                            onSelectDemanda={handleSelectDemanda}
                            onDelete={handleRequestDeleteSingle} // Alterado aqui
                            onEdit={(d) => { setDemandaParaEditar(d); setEditModalOpen(true); }}
                            onStatusChange={handleStatusUpdateLocal}
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

            {/* --- DIALOG DE CONFIRMAÇÃO --- */}
            <Dialog
                open={deleteConfirmationOpen}
                onClose={() => setDeleteConfirmationOpen(false)}
            >
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {itemToDelete 
                            ? "Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita."
                            : `Tem certeza que deseja excluir ${selectedDemandas.length} demanda(s) selecionada(s)?`
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmationOpen(false)} color="primary">
                        Cancelar
                    </Button>
                    <Button onClick={executeDelete} color="error" variant="contained" autoFocus>
                        Excluir
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modais existentes */}
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
                    onRotaCriada={() => setCriarRotaModalOpen(false)}
                />
            )}
        </div>
    );
}