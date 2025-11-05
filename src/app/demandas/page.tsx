// src/app/demandas/page.tsx
'use client';
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, Typography, CircularProgress, Alert,
    SelectChangeEvent
} from "@mui/material";
import { useMemo, useState, useEffect } from "react";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DemandaType } from "@/types/demanda"; 
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal";
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal";
import DemandasToolbar from "@/components/ui/demandas/DemandasToolbar"; 

// ... (Interfaces StatusOption, TipoDemandaOption, DemandaComIdStatus, OptimizedRouteData... permanecem iguais) ...
interface StatusOption { id: number; nome: string; cor: string; }
interface TipoDemandaOption { id: number; nome: string; }
interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    status_nome?: string;
    status_cor?: string;
}
interface OptimizedRouteData {
    optimizedDemands: DemandaComIdStatus[];
    routePath: [number, number][];
    startPoint: { lat: number, lng: number };
}


export default function DemandasPage() {
    // --- (Estados existentes permanecem) ---
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [filtro, setFiltro] = useState(''); 
    const [filtroStatusIds, setFiltroStatusIds] = useState<number[]>([]); 
    const [filtroTipoNomes, setFiltroTipoNomes] = useState<string[]>([]); 
    const [demandas, setDemandas] = useState<DemandaComIdStatus[]>([]); 
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); 
    const [availableStatus, setAvailableStatus] = useState<StatusOption[]>([]); 
    const [statusError, setStatusError] = useState<string | null>(null); 
    const [availableTipos, setAvailableTipos] = useState<TipoDemandaOption[]>([]); 
    const [tiposError, setTiposError] = useState<string | null>(null); 
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null); 
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<DemandaComIdStatus | null>(null);
    const [demandaParaDeletar, setDemandaParaDeletar] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false); 
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);
    const [confirmacaoRotaOpen, setConfirmacaoRotaOpen] = useState(false);
    const [nomeNovaRota, setNomeNovaRota] = useState('');
    const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
    const [optimizationError, setOptimizationError] = useState<string | null>(null);
    const [optimizedRouteData, setOptimizedRouteData] = useState<OptimizedRouteData | null>(null);

    // *** INÍCIO DA MODIFICAÇÃO 1: Adicionar estado para deleção em massa ***
    const [openBulkDeleteConfirm, setOpenBulkDeleteConfirm] = useState<boolean>(false);
    // (isDeleting e deleteError serão reutilizados)
    // *** FIM DA MODIFICAÇÃO 1 ***

    
    // --- (Funções de busca de dados fetchInitialData, fetchDemandas permanecem iguais) ---
    useEffect(() => { fetchInitialData(); }, []);
    const fetchInitialData = async () => { /* ... (código existente) ... */ 
        setIsLoading(true);
        setError(null); setStatusError(null); setTiposError(null);
        try {
            const [statusRes, tiposRes, demandasRes] = await Promise.all([
                fetch('/api/demandas-status'),
                fetch('/api/demandas-tipos'),
                fetch('/api/demandas')
            ]);
            if (!statusRes.ok) throw new Error('Falha ao buscar status.');
            if (!tiposRes.ok) throw new Error('Falha ao buscar tipos.');
            if (!demandasRes.ok) throw new Error('Falha ao buscar demandas.');

            const statusData = await statusRes.json();
            const tiposData = await tiposRes.json();
            const demandasData = await demandasRes.json();

            setAvailableStatus(statusData);
            setAvailableTipos(tiposData);
            const demandasComDatas = demandasData.map((d: DemandaComIdStatus) => ({
                ...d, prazo: d.prazo ? new Date(d.prazo) : null,
            }));
            setDemandas(demandasComDatas);
        } catch (err) {
            console.error("[PAGE] Falha ao buscar dados iniciais:", err);
            if (err instanceof Error) {
                if (err.message.includes('status')) setStatusError(err.message);
                else if (err.message.includes('tipos')) setTiposError(err.message);
                else setError(err.message);
            } else { setError('Erro desconhecido ao carregar dados.'); }
        } finally {
            setIsLoading(false);
        }
    };
     const fetchDemandas = async () => { /* ... (código existente) ... */ 
        setError(null); setDeleteError(null); setStatusUpdateError(null);
        console.log("[PAGE] Recarregando demandas...");
        try {
            const response = await fetch('/api/demandas');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: DemandaComIdStatus[] = await response.json();
            const demandasComDatas = data.map(d => ({ ...d, prazo: d.prazo ? new Date(d.prazo) : null }));
            setDemandas(demandasComDatas);
        } catch (err) {
            console.error("[PAGE] Falha ao recarregar demandas:", err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido ao recarregar demandas.');
        } finally {
             console.log("[PAGE] Recarga de demandas finalizada.");
        }
     };

    // --- (Lógica de Filtragem 'demandasFiltradas' permanece a mesma) ---
    const demandasFiltradas = useMemo(() => { /* ... (código existente) ... */ 
        const filtroLowerCase = filtro.toLowerCase().trim();
        const statusMap = availableStatus.reduce((acc, status) => {
             acc[status.id] = status.nome.toLowerCase();
             return acc;
         }, {} as Record<number, string>);

        return demandas.filter(demanda => {
            const statusMatch = filtroStatusIds.length === 0 || (demanda.id_status != null && filtroStatusIds.includes(demanda.id_status));
            const tipoMatch = filtroTipoNomes.length === 0 || (demanda.tipo_demanda && filtroTipoNomes.includes(demanda.tipo_demanda));
            if (!statusMatch || !tipoMatch) return false;
            if (!filtroLowerCase) return true;
            
            const statusNome = demanda.id_status ? statusMap[demanda.id_status] : '';
            return (
                (demanda.logradouro && demanda.logradouro.toLowerCase().includes(filtroLowerCase)) ||
                (demanda.bairro && demanda.bairro.toLowerCase().includes(filtroLowerCase)) ||
                (demanda.cidade && demanda.cidade.toLowerCase().includes(filtroLowerCase)) ||
                (demanda.cep && demanda.cep.includes(filtroLowerCase)) ||
                (demanda.nome_solicitante && demanda.nome_solicitante.toLowerCase().includes(filtroLowerCase)) ||
                demanda.descricao.toLowerCase().includes(filtroLowerCase) ||
                (demanda.protocolo && demanda.protocolo.toLowerCase().includes(filtroLowerCase)) ||
                (statusNome && statusNome.includes(filtroLowerCase)) || 
                (demanda.tipo_demanda && demanda.tipo_demanda.toLowerCase().includes(filtroLowerCase))
            );
        });
    }, [filtro, demandas, availableStatus, filtroStatusIds, filtroTipoNomes]);


    // --- (Handlers 'handleSelectDemanda', 'handleSelectAll', 'demandasParaRota', 'handleRotaCriada', 'iniciarEdicao', 'handleCloseEditModal', 'handleDemandaEditada', 'handleStatusChange', 'handleFiltroStatusChange', 'handleFiltroTipoChange', 'handlePrepareRota' permanecem os mesmos) ---
    const handleSelectDemanda = (id: number) => { /* ... (código existente) ... */ 
         setSelectedDemandas(prev =>
            prev.includes(id) ? prev.filter(demId => demId !== id) : [...prev, id]
        );
    };
    const handleSelectAll = () => { /* ... (código existente) ... */ 
         setSelectedDemandas(prev =>
            prev.length === demandasFiltradas.length ? [] : demandasFiltradas.map(d => d.id!)
         );
    };
    const demandasParaRota = useMemo(() => /* ... (código existente) ... */ 
        demandas.filter(d => d.id !== undefined && selectedDemandas.includes(d.id)),
        [demandas, selectedDemandas]
    );
    const handleRotaCriada = (nomeRota: string, responsavel: string) => { /* ... (código existente) ... */ 
        console.log(`[PAGE] Rota "${nomeRota}" criada com responsável ${responsavel}`);
        setNomeNovaRota(nomeRota);
        setConfirmacaoRotaOpen(true);
        setSelectedDemandas([]); 
        setOptimizedRouteData(null); 
    };
    const iniciarEdicao = (demanda: DemandaComIdStatus) => { /* ... (código existente) ... */ 
        setDemandaParaEditar(demanda);
        setEditModalOpen(true);
    };
    const handleCloseEditModal = () => { /* ... (código existente) ... */ 
        setEditModalOpen(false);
        setTimeout(() => setDemandaParaEditar(null), 300);
    };
    const handleDemandaEditada = () => { /* ... (código existente) ... */ 
        handleCloseEditModal();
        fetchDemandas(); 
    };
    const handleStatusChange = async (demandaId: number, newStatusId: number): Promise<void> => { /* ... (código existente) ... */ 
        setStatusUpdateError(null);
        const originalDemandas = [...demandas]; 
        setDemandas(prevDemandas =>
            prevDemandas.map(d =>
                d.id === demandaId ? { ...d, id_status: newStatusId } : d
            )
        );
        try {
            const response = await fetch(`/api/demandas/${demandaId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_status: newStatusId }), 
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) { throw new Error(result.message || result.error || `Erro ${response.status} ao atualizar status.`); }
        } catch (err) {
            console.error("[PAGE] Falha ao atualizar status:", err);
            setStatusUpdateError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
            setDemandas(originalDemandas);
            throw err;
        }
    };
    const handleFiltroStatusChange = (event: SelectChangeEvent<number[]>) => { /* ... (código existente) ... */ 
        const { target: { value } } = event;
        const newSelectedIds = typeof value === 'string' ? value.split(',').map(Number) : value;
        setFiltroStatusIds(newSelectedIds);
    };
    const handleFiltroTipoChange = (event: SelectChangeEvent<string[]>) => { /* ... (código existente) ... */ 
        const { target: { value } } = event;
        const newSelectedNames = typeof value === 'string' ? value.split(',') : value;
        setFiltroTipoNomes(newSelectedNames);
    };
    const handlePrepareRota = async () => { /* ... (código existente) ... */ 
        if (selectedDemandas.length === 0) return;
        setIsOptimizing(true);
        setOptimizationError(null);
        setOptimizedRouteData(null); 
        const demandasParaOtimizar = demandas
            .filter(d => selectedDemandas.includes(d.id!) && d.geom?.coordinates)
            .map(d => d.id!); 
        if (demandasParaOtimizar.length === 0) {
            setOptimizationError("Nenhuma das demandas selecionadas possui coordenadas válidas para roteirização.");
            setIsOptimizing(false);
            return;
        }
        try {
            const response = await fetch('/api/rotas/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demandaIds: demandasParaOtimizar }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Erro ${response.status} ao otimizar rota.`);
            }
            setOptimizedRouteData(data);
            setCriarRotaModalOpen(true);
        } catch (err) {
            console.error("[PAGE] Falha ao otimizar rota:", err);
            setOptimizationError(err instanceof Error ? err.message : 'Erro desconhecido ao otimizar rota.');
        } finally {
            setIsOptimizing(false);
        }
    };

    // --- (Handlers de Deleção Única permanecem) ---
    const iniciarDelecao = (id: number) => {
        setDeleteError(null);
        setDemandaParaDeletar(id);
        setOpenDeleteConfirm(true); 
    };
    const confirmarDelecao = async () => {
         if (demandaParaDeletar === null) return;
        setIsDeleting(true); setDeleteError(null);
        const idToDelete = demandaParaDeletar;
        try {
            // Reutiliza a API de deleção em massa, mas com um ID
            const response = await fetch(`/api/demandas`, { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [idToDelete] }) 
            });
            const result = await response.json().catch(() => ({})); 
            if (!response.ok) { throw new Error(result.message || `Erro ${response.status} ao deletar.`); }
            console.log(`[PAGE] Demanda ${idToDelete} deletada.`);
            setDemandas(prevDemandas => prevDemandas.filter(d => d.id !== idToDelete));
            setSelectedDemandas(prev => prev.filter(selId => selId !== idToDelete));
            handleCloseDeleteConfirm(); 
        } catch (err) {
            console.error("[PAGE] Falha ao deletar demanda:", err);
            setDeleteError(err instanceof Error ? err.message : 'Erro desconhecido ao deletar.');
        } finally {
            setIsDeleting(false);
        }
    };
    const cancelarDelecao = () => { handleCloseDeleteConfirm(); };
    const handleCloseDeleteConfirm = () => {
         setOpenDeleteConfirm(false);
         setTimeout(() => {
             setDemandaParaDeletar(null);
             setDeleteError(null); 
             setIsDeleting(false); 
         }, 300);
    };


    // *** INÍCIO DA MODIFICAÇÃO 2: Novas funções para deleção em massa ***
    const iniciarDelecaoMassa = () => {
        setDeleteError(null);
        setOpenBulkDeleteConfirm(true); // Abre o novo modal
    };

    const confirmarDelecaoMassa = async () => {
        if (selectedDemandas.length === 0) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch('/api/demandas', { // Chama o novo endpoint DELETE
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedDemandas }) // Envia o array de IDs
            });

            const result = await response.json().catch(() => ({})); 

            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status} ao deletar demandas.`);
            }

            console.log(`[PAGE] ${result.deletedIds?.length || 0} demandas deletadas em massa.`);
            
            // Atualiza o estado local removendo as demandas deletadas
            setDemandas(prevDemandas => 
                prevDemandas.filter(d => !selectedDemandas.includes(d.id!))
            );
            // Limpa a seleção
            setSelectedDemandas([]);
            handleCloseBulkDeleteConfirm(); // Fecha o modal

        } catch (err) {
            console.error("[PAGE] Falha ao deletar demandas em massa:", err);
            setDeleteError(err instanceof Error ? err.message : 'Erro desconhecido ao deletar.');
            // Mantém o modal aberto para mostrar o erro
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCloseBulkDeleteConfirm = () => {
         setOpenBulkDeleteConfirm(false);
         setTimeout(() => {
             setDeleteError(null); 
             setIsDeleting(false); 
         }, 300);
    };
    // *** FIM DA MODIFICAÇÃO 2 ***


    // --- Renderização ---
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas</h1>

            {/* --- Barra de Ações ATUALIZADA --- */}
            <DemandasToolbar
                filtro={filtro}
                onFiltroChange={setFiltro}
                filtroStatusIds={filtroStatusIds}
                onFiltroStatusChange={handleFiltroStatusChange}
                availableStatus={availableStatus}
                statusError={statusError}
                filtroTipoNomes={filtroTipoNomes}
                onFiltroTipoChange={handleFiltroTipoChange}
                availableTipos={availableTipos}
                tiposError={tiposError}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onAddDemandaClick={() => setAddModalOpen(true)}
                onCreateRotaClick={handlePrepareRota} 
                onDeleteSelectedClick={iniciarDelecaoMassa} // <-- Passa a nova função
                selectedDemandasCount={selectedDemandas.length}
                onClearStatusFilter={() => setFiltroStatusIds([])}
                onClearTipoFilter={() => setFiltroTipoNomes([])}
                isOptimizing={isOptimizing} 
            />

            {/* Mensagens de Erro Globais (sem alteração) */}
             {statusError && <Box sx={{ p: 2 }}><Alert severity="warning">Erro ao carregar opções de status: {statusError}</Alert></Box>}
             {tiposError && <Box sx={{ p: 2 }}><Alert severity="warning">Erro ao carregar opções de tipo: {tiposError}</Alert></Box>}
             {statusUpdateError && <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setStatusUpdateError(null)}>Erro ao atualizar status: {statusUpdateError}</Alert></Box>}
             {optimizationError && <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setOptimizationError(null)}>Erro ao otimizar rota: {optimizationError}</Alert></Box>}
             {error && <Box sx={{ p: 2 }}><Alert severity="error">Erro ao carregar demandas: {error} <Button color="inherit" size="small" onClick={fetchDemandas}>Tentar Novamente</Button></Alert></Box>}


           {/* Renderização Condicional da Lista/Cards (sem alteração) */}
           {isLoading ? (
                 <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                     <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando demandas...</Typography>
                 </Box>
           ) : !error && demandasFiltradas.length > 0 ? ( 
                viewMode === 'card' ? (
                    <ListaCardDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} onDelete={iniciarDelecao} onEdit={iniciarEdicao} onStatusChange={handleStatusChange} availableStatus={availableStatus} />
                ) : (
                    <ListaListDemanda demandas={demandasFiltradas} selectedDemandas={selectedDemandas} onSelectDemanda={handleSelectDemanda} onSelectAll={handleSelectAll} numSelected={selectedDemandas.length} rowCount={demandasFiltradas.length} onDelete={iniciarDelecao} onEdit={iniciarEdicao} onStatusChange={handleStatusChange} availableStatus={availableStatus} />
                )
            ) : !error ? ( 
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">
                        {(filtro || filtroStatusIds.length > 0 || filtroTipoNomes.length > 0)
                            ? 'Nenhuma demanda encontrada para os filtros atuais.'
                            : 'Nenhuma demanda cadastrada.'}
                    </Typography>
                    {!(filtro || filtroStatusIds.length > 0 || filtroTipoNomes.length > 0) &&
                        <Button variant="contained" onClick={() => setAddModalOpen(true)} sx={{ mt: 2, backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>
                            Adicionar Primeira Demanda
                        </Button>
                    }
                </Box>
            ) : null }

            {/* Modais (Adicionar, Editar, Criar Rota, Confirmação Rota, Deleção Única) */}
            <AddDemandaModal open={addModalOpen} onClose={() => { setAddModalOpen(false); fetchDemandas(); }} availableTipos={availableTipos} />
            {demandaParaEditar && ( <AddDemandaModal key={demandaParaEditar.id} open={editModalOpen} onClose={handleCloseEditModal} demandaInicial={demandaParaEditar} onSuccess={handleDemandaEditada} availableTipos={availableTipos} /> )}
            <CriarRotaModal 
                open={criarRotaModalOpen} 
                onClose={() => setCriarRotaModalOpen(false)} 
                routeData={optimizedRouteData} 
                onRotaCriada={handleRotaCriada} 
            />
            <Dialog open={confirmacaoRotaOpen} onClose={() => setConfirmacaoRotaOpen(false)}><DialogTitle>Sucesso!</DialogTitle><DialogContent><DialogContentText>A rota &quot;{nomeNovaRota}&quot; foi criada!</DialogContentText></DialogContent><DialogActions><Button onClick={() => setConfirmacaoRotaOpen(false)} autoFocus>Fechar</Button></DialogActions></Dialog>
            <Dialog open={openDeleteConfirm} onClose={cancelarDelecao}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText> Excluir demanda ID {demandaParaDeletar}? Esta ação não pode ser desfeita. </DialogContentText>
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelarDelecao} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" disabled={isDeleting}>{isDeleting ? <CircularProgress size={24}/> : 'Excluir'}</Button>
                </DialogActions>
            </Dialog>

            {/* *** INÍCIO DA MODIFICAÇÃO 3: Novo Modal para Deleção em Massa *** */}
            <Dialog open={openBulkDeleteConfirm} onClose={handleCloseBulkDeleteConfirm}>
                <DialogTitle>Confirmar Exclusão em Massa</DialogTitle>
                <DialogContent>
                    <DialogContentText> 
                        Você tem certeza que deseja excluir as **{selectedDemandas.length}** demandas selecionadas?
                    </DialogContentText>
                    <DialogContentText sx={{mt: 1, fontSize: '0.9rem'}}>
                        Esta ação não pode ser desfeita.
                    </DialogContentText>
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseBulkDeleteConfirm} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecaoMassa} color="error" variant="contained" disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24}/> : `Excluir ${selectedDemandas.length} Itens`}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* *** FIM DA MODIFICAÇÃO 3 *** */}
        </div>
    );
}