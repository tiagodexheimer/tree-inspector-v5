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
import { DemandaType } from "@/types/demanda"; // Importar GeoJsonPoint
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal";
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal";
import DemandasToolbar from "@/components/ui/demandas/DemandasToolbar"; 


// ... (Interfaces StatusOption, TipoDemandaOption, DemandaComIdStatus permanecem iguais) ...
interface StatusOption { id: number; nome: string; cor: string; }
interface TipoDemandaOption { id: number; nome: string; }
interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    status_nome?: string;
    status_cor?: string;
}

// *** NOVA INTERFACE para os dados da rota otimizada ***
interface OptimizedRouteData {
    optimizedDemands: DemandaComIdStatus[];
    routePath: [number, number][]; // Array de [lat, lng]
    startPoint: { lat: number, lng: number };
}


export default function DemandasPage() {
    // --- Estados ---
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [filtro, setFiltro] = useState(''); 
    const [filtroStatusIds, setFiltroStatusIds] = useState<number[]>([]); 
    const [filtroTipoNomes, setFiltroTipoNomes] = useState<string[]>([]); 

    const [demandas, setDemandas] = useState<DemandaComIdStatus[]>([]); 
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]); 

    // Estados de Carregamento e Erro
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); 
    const [availableStatus, setAvailableStatus] = useState<StatusOption[]>([]); 
    const [statusError, setStatusError] = useState<string | null>(null); 
    const [availableTipos, setAvailableTipos] = useState<TipoDemandaOption[]>([]); 
    const [tiposError, setTiposError] = useState<string | null>(null); 
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null); 

    // Estados dos Modais e Ações
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

    // *** NOVOS ESTADOS para Otimização de Rota ***
    const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
    const [optimizationError, setOptimizationError] = useState<string | null>(null);
    const [optimizedRouteData, setOptimizedRouteData] = useState<OptimizedRouteData | null>(null);

    
    // --- Busca Inicial de Dados (sem alteração) ---
    useEffect(() => { fetchInitialData(); }, []);
    const fetchInitialData = async () => {
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

     // --- Função para Recarregar Demandas (sem alteração) ---
     const fetchDemandas = async () => {
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

    // --- Lógica de Filtragem (sem alteração) ---
    const demandasFiltradas = useMemo(() => {
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


    // --- Handlers (Seleção, Deleção, Edição, Status - sem alteração) ---
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
            const response = await fetch(`/api/demandas/${idToDelete}`, { method: 'DELETE' });
            const result = await response.json().catch(() => ({})); 
            if (!response.ok) { throw new Error(result.message || `Erro ${response.status} ao deletar.`); }
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
        fetchDemandas(); 
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
    // --- Handlers de Filtro (sem alteração) ---
    const handleFiltroStatusChange = (event: SelectChangeEvent<number[]>) => {
        const { target: { value } } = event;
        const newSelectedIds = typeof value === 'string' ? value.split(',').map(Number) : value;
        setFiltroStatusIds(newSelectedIds);
    };
    const handleFiltroTipoChange = (event: SelectChangeEvent<string[]>) => {
        const { target: { value } } = event;
        const newSelectedNames = typeof value === 'string' ? value.split(',') : value;
        setFiltroTipoNomes(newSelectedNames);
    };


    // *** NOVO HANDLER: Preparar Rota (Otimizar e Abrir Modal) ***
    const handlePrepareRota = async () => {
        if (selectedDemandas.length === 0) return;

        setIsOptimizing(true);
        setOptimizationError(null);
        setOptimizedRouteData(null); // Limpa dados antigos

        // Filtra apenas as demandas que realmente têm geometria
        const demandasParaOtimizar = demandas
            .filter(d => selectedDemandas.includes(d.id!) && d.geom?.coordinates)
            .map(d => d.id!); // Envia apenas os IDs

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
            
            // Sucesso: Armazena os dados otimizados e abre o modal
            setOptimizedRouteData(data);
            setCriarRotaModalOpen(true);

        } catch (err) {
            console.error("[PAGE] Falha ao otimizar rota:", err);
            setOptimizationError(err instanceof Error ? err.message : 'Erro desconhecido ao otimizar rota.');
        } finally {
            setIsOptimizing(false);
        }
    };

    // Handler para quando a rota é salva no modal (sem alteração)
    const handleRotaCriada = (nomeRota: string, responsavel: string) => {
        console.log(`[PAGE] Rota "${nomeRota}" criada com responsável ${responsavel}`);
        setNomeNovaRota(nomeRota);
        setConfirmacaoRotaOpen(true);
        setSelectedDemandas([]); // Limpa seleção
        setOptimizedRouteData(null); // Limpa dados da rota
    };

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
                onCreateRotaClick={handlePrepareRota} // <-- Chama o novo handler
                selectedDemandasCount={selectedDemandas.length}
                onClearStatusFilter={() => setFiltroStatusIds([])}
                onClearTipoFilter={() => setFiltroTipoNomes([])}
                isOptimizing={isOptimizing} // <-- Passa o estado de loading
            />

            {/* Mensagens de Erro Globais (Adicionado erro de otimização) */}
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

            {/* Modais */}
            <AddDemandaModal open={addModalOpen} onClose={() => { setAddModalOpen(false); fetchDemandas(); }} availableTipos={availableTipos} />
            {demandaParaEditar && ( <AddDemandaModal key={demandaParaEditar.id} open={editModalOpen} onClose={handleCloseEditModal} demandaInicial={demandaParaEditar} onSuccess={handleDemandaEditada} availableTipos={availableTipos} /> )}
            
            {/* Modal Criar Rota ATUALIZADO */}
            <CriarRotaModal 
                open={criarRotaModalOpen} 
                onClose={() => setCriarRotaModalOpen(false)} 
                routeData={optimizedRouteData} // <-- Passa os dados otimizados
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
        </div>
    );
}