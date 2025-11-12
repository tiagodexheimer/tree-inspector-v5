// src/app/demandas/page.tsx
'use client';
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, Typography, CircularProgress, Alert,
    SelectChangeEvent, Pagination // [NOVO] Importar Pagination
} from "@mui/material";
import { useMemo, useState, useEffect, useCallback } from "react"; // [MODIFICADO] Adicionado useCallback
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DemandaType, DemandaComIdStatus, OptimizedRouteData } from "@/types/demanda"; // <-- IMPORTS CORRIGIDOS
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal";
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal";
import DemandasToolbar from "@/components/ui/demandas/DemandasToolbar"; 

// ... (Interfaces StatusOption, TipoDemandaOption... permanecem iguais) ...
interface StatusOption { id: number; nome: string; cor: string; }
interface TipoDemandaOption { id: number; nome: string; }

// REMOVIDO: DemandaComIdStatus e OptimizedRouteData foram movidos para src/types/demanda.ts

interface DemandasResponse {
    demandas: DemandaComIdStatus[];
    totalCount: number;
    limit: number;
    page: number;
}


export default function DemandasPage() {
    // --- (Estados de Paginação e Filtros) ---
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    
    // [MODIFICADO] Filtros e Debounce
    const [filtro, setFiltro] = useState(''); 
    const [debouncedFiltro, setDebouncedFiltro] = useState(''); // [NOVO] Estado para o filtro com debounce
    const [filtroStatusIds, setFiltroStatusIds] = useState<number[]>([]); 
    const [filtroTipoNomes, setFiltroTipoNomes] = useState<string[]>([]); 
    
    // [NOVO] Estados de Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(20); // Usado para a URL, mas mantido em 20 para esta página
    const [totalCount, setTotalCount] = useState(0); 

    // --- (Estados de Dados e Loading) ---
    const [demandas, setDemandas] = useState<DemandaComIdStatus[]>([]); 
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); 
    const [availableStatus, setAvailableStatus] = useState<StatusOption[]>([]); 
    const [statusError, setStatusError] = useState<string | null>(null); 
    const [availableTipos, setAvailableTipos] = useState<TipoDemandaOption[]>([]); 
    const [tiposError, setTiposError] = useState<string | null>(null); 
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null); 
    
    // --- (Estados de Modal/Ação) ---
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<DemandaComIdStatus | null>(null);
    const [demandaParaDeletar, setDemandaParaDeletar] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false); 
    const [openBulkDeleteConfirm, setOpenBulkDeleteConfirm] = useState<boolean>(false);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);
    const [confirmacaoRotaOpen, setConfirmacaoRotaOpen] = useState(false);
    const [nomeNovaRota, setNomeNovaRota] = useState('');
    const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
    const [optimizationError, setOptimizationError] = useState<string | null>(null);
    const [optimizedRouteData, setOptimizedRouteData] = useState<OptimizedRouteData | null>(null);

    // [NOVO] Estado para controlar se os dados iniciais (status/tipos) foram carregados
    const [isInitialDataReady, setIsInitialDataReady] = useState(false);


    // [NOVO] Efeito para o Debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            // Atualiza o filtro de busca real (debounced)
            setDebouncedFiltro(filtro); 
            setCurrentPage(1); // Volta para a primeira página ao filtrar
        }, 300); // 300ms de atraso
        return () => { clearTimeout(handler); };
    }, [filtro]);


    // --- (Funções de busca de dados) ---
    
    // [MODIFICADO] Função para buscar demandas com paginação e filtros
    const fetchDemandas = useCallback(async () => { 
        // Não reseta o error status/tipos aqui, apenas o error geral de demanda
        setError(null); setDeleteError(null); setStatusUpdateError(null);
        setIsLoading(true);
        console.log("[PAGE] Recarregando demandas...");

        // 1. Constrói a URL com paginação e filtros
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', limit.toString());
        
        // Aplica o filtro de texto debounced (Ação 2.2)
        if (debouncedFiltro) params.append('filtro', debouncedFiltro); 
        
        // Filtros de Status (enviando IDs)
        if (filtroStatusIds.length > 0) params.append('statusIds', filtroStatusIds.join(','));
        
        // Filtros de Tipo (enviando Nomes)
        if (filtroTipoNomes.length > 0) params.append('tipoNomes', filtroTipoNomes.join(','));
        
        try {
            const response = await fetch(`/api/demandas?${params.toString()}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            
            const data: DemandasResponse = await response.json();
            
            const demandasComDatas = data.demandas.map(d => ({ 
                ...d, 
                prazo: d.prazo ? new Date(d.prazo) : null 
            }));
            
            setDemandas(demandasComDatas);
            setTotalCount(data.totalCount); 
            // Limpa a seleção se a página mudar
            setSelectedDemandas([]);

        } catch (err) {
            console.error("[PAGE] Falha ao recarregar demandas:", err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido ao recarregar demandas.');
        } finally {
             setIsLoading(false);
             console.log("[PAGE] Recarga de demandas finalizada.");
        }
    }, [currentPage, limit, debouncedFiltro, filtroStatusIds, filtroTipoNomes]); // Dependências do useCallback

    const fetchInitialData = async () => { 
        setIsLoading(true);
        setError(null); setStatusError(null); setTiposError(null);
        try {
            // Busca apenas status e tipos em paralelo
            const [statusRes, tiposRes] = await Promise.all([
                fetch('/api/demandas-status'),
                fetch('/api/demandas-tipos')
            ]);
            
            if (!statusRes.ok) throw new Error('Falha ao buscar status.');
            if (!tiposRes.ok) throw new Error('Falha ao buscar tipos.');

            const statusData = await statusRes.json();
            const tiposData = await tiposRes.json();

            setAvailableStatus(statusData);
            setAvailableTipos(tiposData);
            
        } catch (err) {
            console.error("[PAGE] Falha ao buscar dados iniciais:", err);
            if (err instanceof Error) {
                if (err.message.includes('status')) setStatusError(err.message);
                else if (err.message.includes('tipos')) setTiposError(err.message);
                else setError(err.message);
            } else { setError('Erro desconhecido ao carregar dados.'); }
        } finally {
             // [CORREÇÃO] Garante que a flag de "pronto" seja setada
            setIsInitialDataReady(true); 
        }
    };
    
    // [MODIFICADO] Chamadas de dados no useEffect (1/2)
    useEffect(() => { 
        fetchInitialData(); 
    }, []);
    
    // [MODIFICADO] Chama fetchDemandas apenas quando o isInitialDataReady for true
    useEffect(() => {
        // Apenas se os dados iniciais estiverem carregados, chame o fetch de demandas.
        // E ele será re-executado se 'fetchDemandas' mudar (ou seja, se os filtros mudarem).
        if (isInitialDataReady) {
             fetchDemandas();
        }
    }, [fetchDemandas, isInitialDataReady]); // Depende do callback e da flag de pronto


    // --- (Lógica de Paginação e Filtros) ---

    // [MODIFICADO]: Filtra APENAS no cliente, usando o array JÁ PAGINADO
    const demandasFiltradas = useMemo(() => {
        // Com a paginação e filtros no servidor, esta função retorna apenas o array já carregado
        return demandas;
    }, [demandas]); 

    // [NOVO] Cálculo do número total de páginas
    const totalPages = Math.ceil(totalCount / limit);
    
    // [NOVO] Handler de mudança de página
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
         if (value !== currentPage) {
             setCurrentPage(value);
         }
    };

    // --- (Handlers de Ações - Lógica permanece a mesma) ---
    const handleSelectDemanda = (id: number) => { 
         setSelectedDemandas(prev =>
            prev.includes(id) ? prev.filter(demId => demId !== id) : [...prev, id]
        );
    };
    const handleSelectAll = () => { 
         setSelectedDemandas(prev =>
            prev.length === demandasFiltradas.length ? [] : demandasFiltradas.map(d => d.id!)
         );
    };
    const handleRotaCriada = (nomeRota: string, responsavel: string) => { 
        console.log(`[PAGE] Rota "${nomeNovaRota}" criada com responsável ${responsavel}`);
        setNomeNovaRota(nomeRota);
        setConfirmacaoRotaOpen(true);
        setSelectedDemandas([]); 
        setOptimizedRouteData(null); 
    };
    const iniciarEdicao = (demanda: DemandaComIdStatus) => { 
        setDemandaParaEditar(demanda);
        setEditModalOpen(true);
    };
    const handleCloseEditModal = () => { 
        setEditModalOpen(false);
        setTimeout(() => setDemandaParaEditar(null), 300);
    };
    const handleDemandaEditada = () => { 
        handleCloseEditModal();
        fetchDemandas(); // Recarrega a página atual para mostrar a alteração
    };
    const handleStatusChange = async (demandaId: number, newStatusId: number): Promise<void> => { 
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
    const handleFiltroStatusChange = (event: SelectChangeEvent<number[]>) => { 
        const { target: { value } } = event;
        const newSelectedIds = typeof value === 'string' ? value.split(',').map(Number) : value;
        setFiltroStatusIds(newSelectedIds);
        setCurrentPage(1); // Reseta página
    };
    const handleFiltroTipoChange = (event: SelectChangeEvent<string[]>) => { 
        const { target: { value } } = event;
        const newSelectedNames = typeof value === 'string' ? value.split(',') : value;
        setFiltroTipoNomes(newSelectedNames);
        setCurrentPage(1); // Reseta página
    };
    const handlePrepareRota = async () => { 
        if (selectedDemandas.length === 0) return;
        setIsOptimizing(true);
        setOptimizationError(null);
        setOptimizedRouteData(null); 
        const demandasParaOtimizar = demandas
            .filter(d => selectedDemandas.includes(d.id!) && d.lat !== null && d.lng !== null) // Filtra se lat/lng não é null
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
            // Chama a função de recarregar para atualizar a lista com o novo offset/limite
            fetchDemandas(); 
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
            
            // Limpa a seleção
            setSelectedDemandas([]);
            fetchDemandas(); // Recarrega a lista para buscar a nova página
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


    // --- Renderização ---
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas ({totalCount} no total)</h1>
            
            {/* --- Barra de Ações --- */}
            <DemandasToolbar
                filtro={filtro}
                onFiltroChange={setFiltro} // [MODIFICADO] Agora atualiza o filtro de texto em tempo real
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
                onDeleteSelectedClick={iniciarDelecaoMassa}
                selectedDemandasCount={selectedDemandas.length}
                onClearStatusFilter={() => { setFiltroStatusIds([]); setCurrentPage(1); }}
                onClearTipoFilter={() => { setFiltroTipoNomes([]); setCurrentPage(1); }}
                isOptimizing={isOptimizing} 
            />

            {/* Mensagens de Erro Globais (sem alteração) */}
             {statusError && <Box sx={{ p: 2 }}><Alert severity="warning">Erro ao carregar opções de status: {statusError}</Alert></Box>}
             {tiposError && <Box sx={{ p: 2 }}><Alert severity="warning">Erro ao carregar opções de tipo: {tiposError}</Alert></Box>}
             {statusUpdateError && <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setStatusUpdateError(null)}>Erro ao atualizar status: {statusUpdateError}</Alert></Box>}
             {optimizationError && <Box sx={{ p: 2 }}><Alert severity="error" onClose={() => setOptimizationError(null)}>Erro ao otimizar rota: {optimizationError}</Alert></Box>}
             {error && <Box sx={{ p: 2 }}><Alert severity="error">Erro ao carregar demandas: {error} <Button color="inherit" size="small" onClick={fetchDemandas}>Tentar Novamente</Button></Alert></Box>}


           {/* Renderização Condicional da Lista/Cards */}
           {isLoading ? (
                 <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                     <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando demandas...</Typography>
                 </Box>
           ) : !error && demandasFiltradas.length > 0 ? ( 
               <>
                {viewMode === 'card' ? (
                    <ListaCardDemanda 
                        demandas={demandasFiltradas} 
                        selectedDemandas={selectedDemandas} 
                        onSelectDemanda={handleSelectDemanda} 
                        onDelete={iniciarDelecao} 
                        onEdit={iniciarEdicao} 
                        onStatusChange={handleStatusChange} 
                        availableStatus={availableStatus} 
                    />
                ) : (
                    <ListaListDemanda 
                        demandas={demandasFiltradas} 
                        selectedDemandas={selectedDemandas} 
                        onSelectDemanda={handleSelectDemanda} 
                        onSelectAll={handleSelectAll} 
                        numSelected={selectedDemandas.length} 
                        rowCount={demandasFiltradas.length} 
                        onDelete={iniciarDelecao} 
                        onEdit={iniciarEdicao} 
                        onStatusChange={handleStatusChange} 
                        availableStatus={availableStatus} 
                    />
                )}
                
                {/* [NOVO] Componente de Paginação */}
                {totalPages > 1 && (
                     <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, mt: 2 }}>
                        <Pagination 
                            count={totalPages} 
                            page={currentPage} 
                            onChange={handlePageChange} 
                            color="primary"
                            disabled={isLoading}
                        />
                     </Box>
                )}
               </>
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

            {/* Novo Modal para Deleção em Massa */}
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
        </div>
    );
}