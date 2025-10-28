// src/app/demandas/page.tsx
'use client';
import ListaCardDemanda from "@/components/ui/demandas/ListaCardDemanda";
import ListaListDemanda from "@/components/ui/demandas/ListaListDemanda";
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, IconButton, TextField, Typography, CircularProgress, Alert
} from "@mui/material";
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useMemo, useState, useEffect } from "react";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DemandaType, Status } from "@/types/demanda"; // Importa Status
import AddDemandaModal from "@/components/ui/demandas/AddDemandaModal";
import CriarRotaModal from "@/components/ui/demandas/CriarRotaModal";

export default function DemandasPage() {
    // Estados de UI e Modais
    const [viewMode, setViewMode] = useState('card');
    const [filtro, setFiltro] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [criarRotaModalOpen, setCriarRotaModalOpen] = useState(false);
    const [confirmacaoRotaOpen, setConfirmacaoRotaOpen] = useState(false);
    const [nomeNovaRota, setNomeNovaRota] = useState('');

    // Estados de Dados e Seleção
    const [demandas, setDemandas] = useState<DemandaType[]>([]);
    const [selectedDemandas, setSelectedDemandas] = useState<number[]>([]);

    // Estados de Carregamento e Erro
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para Deleção
    const [demandaParaDeletar, setDemandaParaDeletar] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Estados para Edição
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [demandaParaEditar, setDemandaParaEditar] = useState<DemandaType | null>(null);

    // Estado para erro de atualização de status
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

    // --- Busca Inicial de Dados ---
    useEffect(() => {
        fetchDemandas();
    }, []);

    // --- Função para Buscar/Recarregar Demandas ---
    const fetchDemandas = async () => {
        console.log("[PAGE] Iniciando busca de demandas...");
        setIsLoading(true);
        setError(null);
        setDeleteError(null);
        setStatusUpdateError(null); // Limpa erro de status também
        try {
            const response = await fetch('/api/demandas'); //
            console.log("[PAGE] Resposta fetch GET:", response.status);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erro ${response.status} ao buscar demandas.` }));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: DemandaType[] = await response.json();
            console.log("[PAGE] Dados recebidos:", data);

            const demandasComDatas = data.map(d => ({
                ...d,
                prazo: d.prazo ? new Date(d.prazo) : null,
            }));

            console.log("[PAGE] Demandas após conversão de data:", demandasComDatas);
            setDemandas(demandasComDatas);

        } catch (err) {
            console.error("[PAGE] Falha ao buscar demandas:", err);
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao carregar as demandas.');
        } finally {
            setIsLoading(false);
            console.log("[PAGE] Busca de demandas finalizada.");
        }
    };


    // --- Filtragem ---
    const demandasFiltradas = useMemo(() => {
        const filtroLowerCase = filtro.toLowerCase();
        if (!filtroLowerCase) {
            return demandas;
        }
        return demandas.filter(demanda =>
            (demanda.logradouro && demanda.logradouro.toLowerCase().includes(filtroLowerCase)) ||
            (demanda.bairro && demanda.bairro.toLowerCase().includes(filtroLowerCase)) ||
            (demanda.cidade && demanda.cidade.toLowerCase().includes(filtroLowerCase)) ||
            (demanda.cep && demanda.cep.includes(filtroLowerCase)) ||
            (demanda.nome_solicitante && demanda.nome_solicitante.toLowerCase().includes(filtroLowerCase)) ||
            demanda.descricao.toLowerCase().includes(filtroLowerCase) ||
            (demanda.protocolo && demanda.protocolo.toLowerCase().includes(filtroLowerCase))
        );
    }, [filtro, demandas]);

    // --- Handlers de Seleção ---
    const handleSelectDemanda = (id: number) => {
        setSelectedDemandas(prev =>
            prev.includes(id) ? prev.filter(demId => demId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedDemandas.length === demandasFiltradas.length) {
            setSelectedDemandas([]);
        } else {
            setSelectedDemandas(demandasFiltradas.map(d => d.id!));
        }
    };

    // --- Handlers de Rota ---
    const demandasParaRota = demandas.filter(d => d.id !== undefined && selectedDemandas.includes(d.id));

    const handleRotaCriada = (nomeRota: string, responsavel: string) => {
        console.log(`[PAGE] Rota "${nomeRota}" criada com responsável ${responsavel}`);
        setNomeNovaRota(nomeRota);
        setConfirmacaoRotaOpen(true);
        setSelectedDemandas([]);
    };

    // --- Handlers de Deleção ---
    const iniciarDelecao = (id: number) => {
        console.log(`[PAGE] Iniciando deleção para ID: ${id}`);
        setDeleteError(null);
        setDemandaParaDeletar(id);
    };

    const confirmarDelecao = async () => {
        if (demandaParaDeletar === null) return;
        setIsDeleting(true);
        setDeleteError(null);
        const idToDelete = demandaParaDeletar;
        try {
            console.log(`[PAGE] Enviando DELETE para /api/demandas/${idToDelete}`);
            const response = await fetch(`/api/demandas/${idToDelete}`, { method: 'DELETE' }); ///route.ts]
            console.log(`[PAGE] Resposta DELETE recebida. Status: ${response.status}`);
            const result = await response.json().catch(() => ({}));
            if (!response.ok) { throw new Error(result.message || `Erro ${response.status} ao deletar demanda.`); }
            console.log(`[PAGE] Demanda ${idToDelete} deletada com sucesso.`);
            setDemandas(prevDemandas => prevDemandas.filter(d => d.id !== idToDelete));
            setSelectedDemandas(prev => prev.filter(selId => selId !== idToDelete));
            setDemandaParaDeletar(null);
        } catch (err) {
            console.error("[PAGE] Falha ao deletar demanda:", err);
            setDeleteError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao deletar.');
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelarDelecao = () => {
        setDemandaParaDeletar(null);
        setDeleteError(null);
    };

    // --- Handlers de Edição ---
    const iniciarEdicao = (demanda: DemandaType) => {
        console.log("[PAGE] Iniciando edição para:", demanda);
        setDemandaParaEditar(demanda);
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setTimeout(() => setDemandaParaEditar(null), 300); // Atraso para limpeza
    };

    const handleDemandaEditada = () => {
        console.log("[PAGE] Edição concluída com sucesso. Recarregando lista.");
        handleCloseEditModal();
        fetchDemandas();
    };

    // --- Handler para Mudança de Status ---
    const handleStatusChange = async (demandaId: number, newStatus: Status): Promise<void> => {
        console.log(`[PAGE] Tentando atualizar status da demanda ${demandaId} para ${newStatus}`);
        setStatusUpdateError(null);

        const originalDemandas = [...demandas];
        // Atualização Otimista
        setDemandas(prevDemandas =>
            prevDemandas.map(d =>
                d.id === demandaId ? { ...d, status: newStatus } : d
            )
        );

        try {
            // Chama a nova API específica para status
            const response = await fetch(`/api/demandas/${demandaId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status} ao atualizar status.`);
            }

            console.log(`[PAGE] Status da demanda ${demandaId} atualizado com sucesso no backend.`);
            // Se a API retornar dados, pode usá-los para refinar o estado local, mas a atualização otimista já foi feita.
            // Ex: const updatedDemandaData = result.demanda; ... (lógica para atualizar com dados da API)

        } catch (err) {
            console.error("[PAGE] Falha ao atualizar status:", err);
            setStatusUpdateError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
            // Reverte a mudança otimista
            setDemandas(originalDemandas);
            // Re-lança o erro para o componente StatusDemanda lidar
            throw err;
        }
    };
    // ------------------------------------

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4" style={{ margin: "16px" }}>Demandas</h1>

            {/* Barra de Ações */}
            <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', borderBottom: '1px solid #ddd' }}>
                 <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }} onClick={() => setAddModalOpen(true)}> Adicionar Demanda </Button>
                 {/* ... outros botões ... */}
                 <TextField label="Filtrar..." variant="outlined" size="small" value={filtro} onChange={(e) => setFiltro(e.target.value)} sx={{ marginLeft: 'auto', minWidth: 300, /* ... estilos ... */ }} />
                 <IconButton onClick={() => setViewMode('card')} sx={{ color: viewMode === 'card' ? '#257e1a' : 'default' }}> <ViewModuleIcon /> </IconButton>
                 <IconButton onClick={() => setViewMode('list')} sx={{ color: viewMode === 'list' ? '#257e1a' : 'default' }}> <ViewListIcon /> </IconButton>
                 <Button variant="contained" disabled={selectedDemandas.length === 0} onClick={() => setCriarRotaModalOpen(true)} sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#115293' } }}> Criar Rota ({selectedDemandas.length}) </Button>
            </Box>

            {/* Mostra erro de atualização de status */}
            {statusUpdateError && (
                 <Box sx={{ p: 2 }}>
                    <Alert severity="error" onClose={() => setStatusUpdateError(null)}>
                        Erro ao atualizar status: {statusUpdateError}
                    </Alert>
                 </Box>
             )}

           {/* Renderização Condicional */}
           {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress /> <Typography sx={{ ml: 2 }}>Carregando demandas...</Typography>
                </Box>
           ) : error ? ( // Erro geral de carregamento
                <Box sx={{ p: 2 }}>
                    <Alert severity="error"> Erro ao carregar demandas: {error} <Button color="inherit" size="small" onClick={fetchDemandas} sx={{ ml: 2}}> Tentar Novamente </Button> </Alert>
                 </Box>
           ) : demandasFiltradas.length > 0 ? ( // Listas
                viewMode === 'card' ? (
                    <ListaCardDemanda
                        demandas={demandasFiltradas}
                        selectedDemandas={selectedDemandas}
                        onSelectDemanda={handleSelectDemanda}
                        onDelete={iniciarDelecao}
                        onEdit={iniciarEdicao}
                        onStatusChange={handleStatusChange} // <-- Passa handler
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
                        onStatusChange={handleStatusChange} // <-- Passa handler
                    />
                )
            ) : ( // Nenhuma demanda encontrada
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'grey.600', mt: 4 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6"> {filtro ? 'Nenhuma demanda encontrada para o filtro atual.' : 'Nenhuma demanda cadastrada.'} </Typography>
                    {!filtro && <Button variant="contained" onClick={() => setAddModalOpen(true)} sx={{ mt: 2, backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>Adicionar Primeira Demanda</Button>}
                </Box>
            )}

            {/* Modais */}
            {/* Modal Adicionar */}
            <AddDemandaModal
                open={addModalOpen}
                onClose={() => { setAddModalOpen(false); fetchDemandas(); }} // Recarrega ao fechar após criar
            />

            {/* Modal Editar */}
            {demandaParaEditar && (
                <AddDemandaModal
                    key={demandaParaEditar.id} // Chave importante!
                    open={editModalOpen}
                    onClose={handleCloseEditModal}
                    demandaInicial={demandaParaEditar}
                    onSuccess={handleDemandaEditada}  // Callback para recarregar
                />
            )}

            {/* Modal Criar Rota */}
            <CriarRotaModal
                open={criarRotaModalOpen}
                onClose={() => setCriarRotaModalOpen(false)}
                demandasSelecionadas={demandasParaRota}
                onRotaCriada={handleRotaCriada}
            />

            {/* Modal Confirmação Rota */}
            <Dialog open={confirmacaoRotaOpen} onClose={() => setConfirmacaoRotaOpen(false)}>
                 <DialogTitle>Sucesso!</DialogTitle>
                 <DialogContent><DialogContentText>A rota &quot;{nomeNovaRota}&quot; foi criada com sucesso!</DialogContentText></DialogContent>
                 <DialogActions><Button onClick={() => setConfirmacaoRotaOpen(false)} autoFocus>Fechar</Button></DialogActions>
            </Dialog>

            {/* Modal Confirmação Deleção */}
            <Dialog open={demandaParaDeletar !== null} onClose={cancelarDelecao}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText> Tem certeza que deseja excluir a demanda ID {demandaParaDeletar}? Esta ação não pode ser desfeita. </DialogContentText>
                     {deleteError && <Alert severity="error" sx={{ mt: 2 }}>Erro ao excluir: {deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelarDelecao} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={confirmarDelecao} color="error" variant="contained" autoFocus disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}